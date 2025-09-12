package handlers

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "time"

    mw "example.com/edge-api/internal/middleware"
)

type createLogRequest struct {
    TenantID string          `json:"tenantId"`
    VesselID string          `json:"vesselId"`
    Data     json.RawMessage `json:"data"`
}

// Logbooks handles GET list and POST create for /logbooks/{type}
func (h *Handler) Logbooks(w http.ResponseWriter, r *http.Request) {
    // path: /logbooks/{type}[/{id}/...] – we only handle base here
    rest := strings.TrimPrefix(r.URL.Path, "/logbooks/")
    parts := strings.Split(rest, "/")
    if len(parts) < 1 || parts[0] == "" { http.NotFound(w, r); return }
    typ := strings.ToLower(parts[0])
    if typ != "bridge" && typ != "engine" { http.NotFound(w, r); return }

    // Action subroute: /{type}/{id}/{action}
    if r.Method == http.MethodPost && len(parts) >= 3 {
        id := parts[1]
        action := parts[2]
        u := mw.UserFromContext(r)
        if u == nil { w.WriteHeader(http.StatusUnauthorized); return }
        switch action {
        case "correction":
            var body struct{ Reason string `json:"reason"` }
            _ = json.NewDecoder(r.Body).Decode(&body)
            if err := h.store.RequestCorrection(r.Context(), id, u.ID, body.Reason); err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
            _ = h.store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "logbook.correction", "Logbook", id, nil, map[string]any{"reason": body.Reason}, r.RemoteAddr, r.UserAgent())
            writeJSON(w, http.StatusOK, map[string]any{"ok": true})
            return
        case "countersign":
            if err := h.store.Countersign(r.Context(), id, u.ID); err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
            _ = h.store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "logbook.countersign", "Logbook", id, nil, map[string]any{"at": time.Now().UTC()}, r.RemoteAddr, r.UserAgent())
            writeJSON(w, http.StatusOK, map[string]any{"ok": true})
            return
        default:
            http.NotFound(w, r); return
        }
    }

    switch r.Method {
    case http.MethodGet:
        tenantID := r.URL.Query().Get("tenantId")
        vesselID := r.URL.Query().Get("vesselId")
        if tenantID == "" || vesselID == "" { w.WriteHeader(http.StatusBadRequest); return }
        entries, err := h.store.ListLogbookEntries(r.Context(), tenantID, vesselID, typ)
        if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
        writeJSON(w, http.StatusOK, entries)
    case http.MethodPost:
        u := mw.UserFromContext(r)
        if u == nil { writeError(w, http.StatusUnauthorized, "unauthorized", "missing or invalid token"); return }
        var req createLogRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil { writeError(w, http.StatusBadRequest, "bad_request", "invalid JSON body"); return }
        if req.TenantID == "" || req.VesselID == "" { writeError(w, http.StatusBadRequest, "bad_request", "tenantId and vesselId are required"); return }
        if err := validateLogbookData(typ, req.Data); err != nil { writeError(w, http.StatusBadRequest, "validation_error", err.Error()); return }
        entry, err := h.store.CreateLogbookEntry(r.Context(), req.TenantID, req.VesselID, u.ID, typ, req.Data)
        if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
        _ = h.store.InsertAuditEvent(r.Context(), req.TenantID, req.VesselID, u.ID, "logbook.create", "Logbook", typ, nil, entry, r.RemoteAddr, r.UserAgent())
        writeJSON(w, http.StatusCreated, entry)
    default:
        w.WriteHeader(http.StatusMethodNotAllowed)
    }
}

// LogbookAction handles POST /logbooks/{type}/{id}/(correction|countersign)
func (h *Handler) LogbookAction(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost { w.WriteHeader(http.StatusMethodNotAllowed); return }
    u := mw.UserFromContext(r)
    if u == nil { w.WriteHeader(http.StatusUnauthorized); return }
    rest := strings.TrimPrefix(r.URL.Path, "/logbooks/")
    parts := strings.Split(rest, "/")
    if len(parts) < 3 { http.NotFound(w, r); return }
    typ := strings.ToLower(parts[0])
    id := parts[1]
    action := parts[2]
    if typ != "bridge" && typ != "engine" { http.NotFound(w, r); return }

    switch action {
    case "correction":
        var body struct{ Reason string `json:"reason"` }
        _ = json.NewDecoder(r.Body).Decode(&body)
        if err := h.store.RequestCorrection(r.Context(), id, u.ID, body.Reason); err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
        _ = h.store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "logbook.correction", "Logbook", id, nil, map[string]any{"reason": body.Reason}, r.RemoteAddr, r.UserAgent())
        writeJSON(w, http.StatusOK, map[string]any{"ok": true})
    case "countersign":
        // enforce reviewer/admin role for countersign
        roles, _ := h.store.GetRolesForUser(r.Context(), u.ID)
        allowed := false
        for _, rname := range roles { if rname == "reviewer" || rname == "admin" { allowed = true; break } }
        if !allowed { writeError(w, http.StatusForbidden, "forbidden", "countersign requires reviewer or admin role"); return }
        if err := h.store.Countersign(r.Context(), id, u.ID); err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
        _ = h.store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "logbook.countersign", "Logbook", id, nil, map[string]any{"at": time.Now().UTC()}, r.RemoteAddr, r.UserAgent())
        writeJSON(w, http.StatusOK, map[string]any{"ok": true})
    default:
        http.NotFound(w, r)
    }
}

// user helper not needed; use middleware.UserFromContext

// validateLogbookData performs basic validation for Bridge/Engine entries.
// For now, we require a non-empty remarks field and optional structured fields.
func validateLogbookData(typ string, raw json.RawMessage) error {
    if len(raw) == 0 { return fmt.Errorf("data is required") }
    var m map[string]any
    if err := json.Unmarshal(raw, &m); err != nil { return fmt.Errorf("invalid JSON data: %v", err) }
    // remarks required
    if rv, ok := m["remarks"]; !ok || rv == nil || (fmt.Sprintf("%T", rv) == "string" && strings.TrimSpace(rv.(string)) == "") {
        return fmt.Errorf("remarks is required")
    }
    // optional position {lat, lon} must be numbers when present
    if p, ok := m["position"].(map[string]any); ok {
        if _, ok := p["lat"].(float64); !ok { return fmt.Errorf("position.lat must be a number") }
        if _, ok := p["lon"].(float64); !ok { return fmt.Errorf("position.lon must be a number") }
    }
    // optional course (number)
    if cv, ok := m["course"]; ok {
        if _, ok := cv.(float64); !ok { return fmt.Errorf("course must be a number") }
    }
    // engine-specific minimal checks
    if typ == "engine" {
        // optional watchStart/watchEnd as strings
        if ws, ok := m["watchStart"]; ok {
            if _, ok := ws.(string); !ok { return fmt.Errorf("watchStart must be a string time") }
        }
        if we, ok := m["watchEnd"]; ok {
            if _, ok := we.(string); !ok { return fmt.Errorf("watchEnd must be a string time") }
        }
    }
    return nil
}
