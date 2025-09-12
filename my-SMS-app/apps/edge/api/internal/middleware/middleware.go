package middleware

import (
    "context"
    "log"
    "math/rand"
    "net/http"
    "time"
)

type ctxKey string

const requestIDKey ctxKey = "reqid"

func RequestID(next http.Handler) http.Handler {
    src := rand.NewSource(time.Now().UnixNano())
    r := rand.New(src)
    return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
        id := time.Now().UTC().Format("20060102T150405Z") + 
            "-" + randomString(r, 6)
        ctx := context.WithValue(req.Context(), requestIDKey, id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, req.WithContext(ctx))
    })
}

func randomString(r *rand.Rand, n int) string {
    const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
    b := make([]byte, n)
    for i := range b { b[i] = letters[r.Intn(len(letters))] }
    return string(b)
}

func Logging(l *log.Logger, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        rid, _ := r.Context().Value(requestIDKey).(string)
        l.Printf("%s %s %s rid=%s ua=%q", r.Method, r.URL.Path, time.Since(start), rid, r.UserAgent())
    })
}

