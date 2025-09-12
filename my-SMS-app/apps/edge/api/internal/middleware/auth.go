package middleware

import (
    "context"
    "net/http"
    "strings"

    "example.com/edge-api/internal/db"
)

const userKey ctxKey = "authUser"

func WithAuth(store *db.Store, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        auth := r.Header.Get("Authorization")
        if auth == "" || !strings.HasPrefix(strings.ToLower(auth), "bearer ") {
            http.Error(w, "missing bearer token", http.StatusUnauthorized)
            return
        }
        token := strings.TrimSpace(auth[len("Bearer "):])
        u, err := store.GetSessionUser(r.Context(), token)
        if err != nil {
            http.Error(w, "invalid or expired session", http.StatusUnauthorized)
            return
        }
        ctx := context.WithValue(r.Context(), userKey, u)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func UserFromContext(r *http.Request) *db.User {
    if v := r.Context().Value(userKey); v != nil {
        if u, ok := v.(*db.User); ok { return u }
    }
    return nil
}
