package config

import (
    "fmt"
    "os"
)

type Config struct {
    Port string
    DBURL string
    DevMode bool
    CorsOrigin string // comma-separated allowlist or "*"
}

func Load() Config {
    port := getenv("API_PORT", "8081")
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        // Build from POSTGRES_* envs (docker-compose provides these)
        user := getenv("POSTGRES_USER", "sms")
        pass := getenv("POSTGRES_PASSWORD", "changeme")
        host := getenv("POSTGRES_HOST", "db")
        p := getenv("POSTGRES_PORT", "5432")
        db := getenv("POSTGRES_DB", "sms_edge")
        dbURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, p, db)
    }
    dev := getenv("DEV_MODE", "false") == "true"
    // Default to localhost web dev origin; can be set to '*' in local dev
    cors := getenv("CORS_ALLOW_ORIGIN", "http://localhost:5173")
    return Config{Port: port, DBURL: dbURL, DevMode: dev, CorsOrigin: cors}
}

func (c Config) DatabaseURL() string { return c.DBURL }

func getenv(key, def string) string {
    if v := os.Getenv(key); v != "" { return v }
    return def
}
