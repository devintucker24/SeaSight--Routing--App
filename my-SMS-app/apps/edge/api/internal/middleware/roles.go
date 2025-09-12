package middleware

import (
    "net/http"
    "strings"

    "example.com/edge-api/internal/db"
)

// RequireRoles ensures the authenticated user has at least one of the required roles.
func RequireRoles(store *db.Store, roles []string, next http.Handler) http.Handler {
    // Make a quick lookup map (lowercased)
    want := map[string]struct{}{}
    for _, r := range roles { want[strings.ToLower(r)] = struct{}{} }

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        u := UserFromContext(r)
        if u == nil {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        have, err := store.GetRolesForUser(r.Context(), u.ID)
        if err != nil {
            http.Error(w, "forbidden", http.StatusForbidden)
            return
        }
        ok := false
        for _, hr := range have {
            if _, exists := want[strings.ToLower(hr)]; exists { ok = true; break }
        }
        if !ok {
            // audit denied access
            _ = store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "access.denied", "Route", r.URL.Path, nil, map[string]any{"need": roles}, r.RemoteAddr, r.UserAgent())
            http.Error(w, "forbidden", http.StatusForbidden)
            return
        }
        // audit allowed access (best-effort)
        _ = store.InsertAuditEvent(r.Context(), u.TenantID, "", u.ID, "access.allowed", "Route", r.URL.Path, nil, map[string]any{"have": have}, r.RemoteAddr, r.UserAgent())
        next.ServeHTTP(w, r)
    })
}
