package middleware

import (
    "net"
    "net/http"
    "sync"
    "time"
)

// Simple IP-based rate limiter (fixed window)
func RateLimitIP(limit int, window time.Duration, next http.Handler) http.Handler {
    type bucket struct{ count int; reset time.Time }
    var (
        mu sync.Mutex
        buckets = map[string]*bucket{}
    )

    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        host, _, _ := net.SplitHostPort(r.RemoteAddr)
        if host == "" { host = r.RemoteAddr }

        mu.Lock()
        b, ok := buckets[host]
        if !ok || time.Now().After(b.reset) {
            b = &bucket{count: 0, reset: time.Now().Add(window)}
            buckets[host] = b
        }
        b.count++
        remaining := limit - b.count
        resetSec := int(time.Until(b.reset).Seconds())
        mu.Unlock()

        w.Header().Set("X-RateLimit-Limit", itoa(limit))
        w.Header().Set("X-RateLimit-Remaining", itoa(max(0, remaining)))
        w.Header().Set("X-RateLimit-Reset", itoa(max(0, resetSec)))

        if b.count > limit {
            http.Error(w, "too many requests", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func itoa(i int) string { return fmtInt(int64(i)) }

func max(a, b int) int { if a > b { return a }; return b }

// tiny int to string (no fmt import)
func fmtInt(i int64) string {
    if i == 0 { return "0" }
    neg := false
    if i < 0 { neg = true; i = -i }
    var buf [20]byte
    pos := len(buf)
    for i > 0 {
        pos--
        buf[pos] = byte('0' + i%10)
        i /= 10
    }
    if neg {
        pos--
        buf[pos] = '-'
    }
    return string(buf[pos:])
}

