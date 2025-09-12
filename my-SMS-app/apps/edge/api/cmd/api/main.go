package main

import (
    "database/sql"
    "log"
    "net/http"
    "os"
    "time"

    _ "github.com/lib/pq"

    "example.com/edge-api/internal/config"
    "example.com/edge-api/internal/db"
    "example.com/edge-api/internal/handlers"
    mw "example.com/edge-api/internal/middleware"
    "example.com/edge-api/internal/spec"
)

func main() {
    logger := log.New(os.Stdout, "api ", log.LstdFlags|log.LUTC|log.Lshortfile)

    cfg := config.Load()

    dsn := cfg.DatabaseURL()
    sqlDB, err := sql.Open("postgres", dsn)
    if err != nil {
        logger.Fatalf("open db: %v", err)
    }
    defer sqlDB.Close()
    sqlDB.SetMaxOpenConns(10)
    sqlDB.SetMaxIdleConns(5)
    sqlDB.SetConnMaxLifetime(30 * time.Minute)

    if err := sqlDB.Ping(); err != nil {
        logger.Fatalf("db ping: %v", err)
    }

    store := db.New(sqlDB)
    h := handlers.New(logger, store)

    mux := http.NewServeMux()
    mux.HandleFunc("/", h.Root)
    mux.HandleFunc("/healthz", h.Healthz)
    mux.HandleFunc("/openapi.yaml", spec.ServeYAML)
    mux.HandleFunc("/openapi.json", spec.ServeJSON)
    mux.HandleFunc("/docs", spec.ServeDocs)
    // Rate-limit auth endpoints (e.g., 10 req/min per IP)
    rl := mw.RateLimitIP(10, 1*time.Minute, http.HandlerFunc(h.Login))
    mux.Handle("/auth/login", rl)
    mux.Handle("/auth/set-pin", mw.RateLimitIP(10, 1*time.Minute, http.HandlerFunc(h.SetPIN)))
    mux.HandleFunc("/auth/logout", h.Logout)
    mux.HandleFunc("/me", h.Me)
    // Protected admin route
    mux.Handle("/admin/ping", mw.WithAuth(store, mw.RequireRoles(store, []string{"admin"}, http.HandlerFunc(h.AdminPing))))
    mux.HandleFunc("/tenants", h.ListTenants)
    mux.HandleFunc("/tenants/", h.GetTenant)          // /tenants/{id}
    mux.HandleFunc("/vessels", h.ListVesselsByTenant) // ?tenantId=...
    // Logbooks: auth required for list/create and actions (correction/countersign)
    mux.Handle("/logbooks/", mw.WithAuth(store, http.HandlerFunc(h.Logbooks)))

    wrapped := mw.CORS(cfg.CorsOrigin, mw.RequestID(mw.Logging(logger, mux)))

    srv := &http.Server{
        Addr:              ":" + cfg.Port,
        Handler:           wrapped,
        ReadTimeout:       15 * time.Second,
        ReadHeaderTimeout: 10 * time.Second,
        WriteTimeout:      30 * time.Second,
        IdleTimeout:       60 * time.Second,
    }

    // Register dev-only routes
    if cfg.DevMode {
        mux.HandleFunc("/demo/quickstart", h.Quickstart)
        logger.Printf("DEV_MODE enabled: /demo/quickstart available")
    }

    logger.Printf("listening on :%s", cfg.Port)
    if err := srv.ListenAndServe(); err != nil {
        logger.Fatalf("server: %v", err)
    }
}
