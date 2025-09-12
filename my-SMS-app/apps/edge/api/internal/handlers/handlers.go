package handlers

import (
    "encoding/json"
    "log"
    "net/http"
    "strings"
    "time"

    "example.com/edge-api/internal/db"
    "golang.org/x/crypto/bcrypt"
)

type Handler struct {
    logger *log.Logger
    store  *db.Store
}

func New(l *log.Logger, s *db.Store) *Handler { return &Handler{logger: l, store: s} }

func writeJSON(w http.ResponseWriter, status int, v any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(map[string]any{
        "error": map[string]any{
            "code": code,
            "message": message,
        },
    })
}

func (h *Handler) Healthz(w http.ResponseWriter, r *http.Request) {
    if err := h.store.Ping(r.Context()); err != nil {
        writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": err.Error()})
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"ok": true, "time": time.Now().UTC()})
}

// GET /
func (h *Handler) Root(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write([]byte(""+
        "<!doctype html>\n"+
        "<html lang=\"en\">\n"+
        "<head>\n"+
        "  <meta charset=\"utf-8\">\n"+
        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"+
        "  <title>Edge API</title>\n"+
        "  <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,\n"+
        "  Helvetica,Arial,sans-serif;line-height:1.4;margin:2rem;color:#222}a{color:#0a58ca}\n"+
        "  code{background:#f5f5f7;padding:.1rem .3rem;border-radius:4px}</style>\n"+
        "</head>\n"+
        "<body>\n"+
        "  <h1>Edge API</h1>\n"+
        "  <p>Status: <strong>OK</strong> — " + time.Now().UTC().Format(time.RFC3339) + "</p>\n"+
        "  <h2>Routes</h2>\n"+
        "  <ul>\n"+
        "    <li><a href=\"/healthz\">GET /healthz</a></li>\n"+
        "    <li><a href=\"/tenants\">GET /tenants</a></li>\n"+
        "    <li><code>GET /tenants/{id}</code></li>\n"+
        "    <li><code>GET /vessels?tenantId={uuid}</code></li>\n"+
        "  </ul>\n"+
        "</body>\n"+
        "</html>\n"))
}

// GET /tenants
func (h *Handler) ListTenants(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet { w.WriteHeader(http.StatusMethodNotAllowed); return }
    ts, err := h.store.ListTenants(r.Context())
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
        return
    }
    writeJSON(w, http.StatusOK, ts)
}

// GET /tenants/{id}
func (h *Handler) GetTenant(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet { w.WriteHeader(http.StatusMethodNotAllowed); return }
    parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/tenants/"), "/")
    if len(parts) < 1 || parts[0] == "" { w.WriteHeader(http.StatusBadRequest); return }
    id := parts[0]
    t, err := h.store.GetTenant(r.Context(), id)
    if err != nil {
        writeJSON(w, http.StatusNotFound, map[string]string{"error": "tenant not found"})
        return
    }
    writeJSON(w, http.StatusOK, t)
}

// GET /vessels?tenantId=...
func (h *Handler) ListVesselsByTenant(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet { w.WriteHeader(http.StatusMethodNotAllowed); return }
    tenantID := r.URL.Query().Get("tenantId")
    if tenantID == "" { w.WriteHeader(http.StatusBadRequest); return }
    vs, err := h.store.ListVesselsByTenant(r.Context(), tenantID)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
        return
    }
    writeJSON(w, http.StatusOK, vs)
}

// POST /auth/set-pin { tenantId, username, pin }
func (h *Handler) SetPIN(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost { w.WriteHeader(http.StatusMethodNotAllowed); return }
    var req struct{
        TenantID string `json:"tenantId"`
        Username string `json:"username"`
        PIN      string `json:"pin"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { w.WriteHeader(http.StatusBadRequest); return }
    if req.TenantID == "" || req.Username == "" || req.PIN == "" { w.WriteHeader(http.StatusBadRequest); return }
    u, err := h.store.GetUserByTenantAndUsername(r.Context(), req.TenantID, req.Username)
    if err != nil { writeJSON(w, http.StatusNotFound, map[string]string{"error":"user not found"}); return }
    hash, err := bcrypt.GenerateFromPassword([]byte(req.PIN), bcrypt.DefaultCost)
    if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
    if err := h.store.UpdateUserPinHash(r.Context(), u.ID, string(hash)); err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
    // Audit (best-effort)
    _ = h.store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "auth.set_pin", "User", u.ID, nil, map[string]any{"username": u.Username.String}, r.RemoteAddr, r.UserAgent())
    writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /auth/login { tenantId, username|email, pin }
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost { w.WriteHeader(http.StatusMethodNotAllowed); return }
    var req struct{
        TenantID string `json:"tenantId"`
        Username string `json:"username"`
        Email    string `json:"email"`
        PIN      string `json:"pin"`
        DeviceID string `json:"deviceId"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { w.WriteHeader(http.StatusBadRequest); return }
    if req.TenantID == "" || (req.Username == "" && req.Email == "") || req.PIN == "" { w.WriteHeader(http.StatusBadRequest); return }
    var u *db.User
    var err error
    if req.Username != "" {
        u, err = h.store.GetUserByTenantAndUsername(r.Context(), req.TenantID, req.Username)
    } else {
        u, err = h.store.GetUserByTenantAndEmail(r.Context(), req.TenantID, req.Email)
    }
    if err != nil || u == nil || !u.IsActive { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"invalid credentials"}); return }
    if !u.PinHash.Valid { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"no PIN set"}); return }
    if err := bcrypt.CompareHashAndPassword([]byte(u.PinHash.String), []byte(req.PIN)); err != nil {
        writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"invalid credentials"}); return
    }
    sid, err := h.store.CreateSession(r.Context(), u.ID, req.DeviceID, 24*7)
    if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
    roles, _ := h.store.GetRolesForUser(r.Context(), u.ID)
    // Audit (best-effort)
    _ = h.store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "auth.login", "User", u.ID, nil, map[string]any{"roles": roles}, r.RemoteAddr, r.UserAgent())
    writeJSON(w, http.StatusOK, map[string]any{
        "token": sid,
        "user": map[string]any{
            "id": u.ID,
            "tenantId": u.TenantID,
            "username": u.Username.String,
            "email": u.Email.String,
            "displayName": u.DisplayName.String,
            "roles": roles,
        },
    })
}

// POST /auth/logout (Authorization: Bearer <token>)
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost { w.WriteHeader(http.StatusMethodNotAllowed); return }
    auth := r.Header.Get("Authorization")
    if !strings.HasPrefix(strings.ToLower(auth), "bearer ") { w.WriteHeader(http.StatusUnauthorized); return }
    token := strings.TrimSpace(auth[len("Bearer "):])
    if token == "" { w.WriteHeader(http.StatusUnauthorized); return }
    // Try to resolve user before revocation for audit
    var u *db.User
    if usr, err := h.store.GetSessionUser(r.Context(), token); err == nil { u = usr }
    if err := h.store.RevokeSession(r.Context(), token); err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
    if u != nil {
        _ = h.store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "auth.logout", "User", u.ID, nil, nil, r.RemoteAddr, r.UserAgent())
    }
    writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// AdminPing – protected resource requiring admin role
func (h *Handler) AdminPing(w http.ResponseWriter, r *http.Request) {
    writeJSON(w, http.StatusOK, map[string]any{"ok": true, "route": "/admin/ping", "time": time.Now().UTC()})
}

// GET /me (Authorization: Bearer <token>)
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet { w.WriteHeader(http.StatusMethodNotAllowed); return }
    // A simple inline check (middleware variant exists too)
    auth := r.Header.Get("Authorization")
    if !strings.HasPrefix(strings.ToLower(auth), "bearer ") { w.WriteHeader(http.StatusUnauthorized); return }
    token := strings.TrimSpace(auth[len("Bearer "):])
    if token == "" { w.WriteHeader(http.StatusUnauthorized); return }
    u, err := h.store.GetSessionUser(r.Context(), token)
    if err != nil { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"invalid or expired session"}); return }
    roles, _ := h.store.GetRolesForUser(r.Context(), u.ID)
    writeJSON(w, http.StatusOK, map[string]any{
        "id": u.ID,
        "tenantId": u.TenantID,
        "username": u.Username.String,
        "email": u.Email.String,
        "displayName": u.DisplayName.String,
        "roles": roles,
    })
}

// DEV ONLY: POST /demo/quickstart { username?: string, pin?: string }
// Creates/updates PIN for user (default admin/1234) under Demo Shipping and returns a session token.
func (h *Handler) Quickstart(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost { w.WriteHeader(http.StatusMethodNotAllowed); return }
    var req struct{
        Username string `json:"username"`
        PIN      string `json:"pin"`
    }
    _ = json.NewDecoder(r.Body).Decode(&req)
    if req.Username == "" { req.Username = "admin" }
    if req.PIN == "" { req.PIN = "1234" }

    t, err := h.store.GetTenantByName(r.Context(), "Demo Shipping")
    if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "demo tenant not found"}); return }
    u, err := h.store.GetUserByTenantAndUsername(r.Context(), t.ID, req.Username)
    if err != nil { writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"}); return }
    hash, err := bcrypt.GenerateFromPassword([]byte(req.PIN), bcrypt.DefaultCost)
    if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
    if err := h.store.UpdateUserPinHash(r.Context(), u.ID, string(hash)); err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
    sid, err := h.store.CreateSession(r.Context(), u.ID, "dev", 24)
    if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
    writeJSON(w, http.StatusOK, map[string]any{
        "tenantId": t.ID,
        "token": sid,
        "username": req.Username,
        "pin": req.PIN,
    })
}
