package middleware

import (
    "net/http"
    "strings"
)

// CORS sets CORS headers using an allowlist. If allowedOrigins contains "*", any origin is allowed.
func CORS(allowedOrigins string, next http.Handler) http.Handler {
    var allowAll bool
    var list []string
    for _, item := range strings.Split(allowedOrigins, ",") {
        s := strings.TrimSpace(item)
        if s == "" { continue }
        if s == "*" { allowAll = true }
        list = append(list, s)
    }

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        if origin != "" {
            if allowAll {
                w.Header().Set("Access-Control-Allow-Origin", "*")
            } else {
                for _, o := range list {
                    if strings.EqualFold(o, origin) {
                        w.Header().Set("Access-Control-Allow-Origin", origin)
                        break
                    }
                }
            }
            w.Header().Set("Vary", "Origin")
            w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
        }
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}
