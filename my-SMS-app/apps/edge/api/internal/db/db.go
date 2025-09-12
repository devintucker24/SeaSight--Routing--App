package db

import (
    "context"
    "database/sql"
    "time"
)

type Store struct{ sql *sql.DB }

func New(sqlDB *sql.DB) *Store { return &Store{sql: sqlDB} }

func (s *Store) Ping(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    return s.sql.PingContext(ctx)
}

type Tenant struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Region    string    `json:"region"`
    CreatedAt time.Time `json:"createdAt"`
}

func (s *Store) ListTenants(ctx context.Context) ([]Tenant, error) {
    const q = `select id, name, region, created_at from tenants order by name`
    rows, err := s.sql.QueryContext(ctx, q)
    if err != nil { return nil, err }
    defer rows.Close()
    var ts []Tenant
    for rows.Next() {
        var t Tenant
        if err := rows.Scan(&t.ID, &t.Name, &t.Region, &t.CreatedAt); err != nil {
            return nil, err
        }
        ts = append(ts, t)
    }
    return ts, rows.Err()
}

func (s *Store) GetTenantByName(ctx context.Context, name string) (*Tenant, error) {
    const q = `select id, name, region, created_at from tenants where name = $1`
    var t Tenant
    err := s.sql.QueryRowContext(ctx, q, name).Scan(&t.ID, &t.Name, &t.Region, &t.CreatedAt)
    if err != nil { return nil, err }
    return &t, nil
}

type User struct {
    ID          string         `json:"id"`
    TenantID    string         `json:"tenantId"`
    Email       sql.NullString `json:"email"`
    Username    sql.NullString `json:"username"`
    DisplayName sql.NullString `json:"displayName"`
    PinHash     sql.NullString `json:"-"`
    IsActive    bool           `json:"isActive"`
    CreatedAt   time.Time      `json:"createdAt"`
}

func (s *Store) GetUserByTenantAndUsername(ctx context.Context, tenantID, username string) (*User, error) {
    const q = `select id, tenant_id, email, username, display_name, pin_hash, is_active, created_at
               from users where tenant_id = $1 and username = $2`
    var u User
    err := s.sql.QueryRowContext(ctx, q, tenantID, username).Scan(&u.ID, &u.TenantID, &u.Email, &u.Username, &u.DisplayName, &u.PinHash, &u.IsActive, &u.CreatedAt)
    if err != nil { return nil, err }
    return &u, nil
}

func (s *Store) GetUserByTenantAndEmail(ctx context.Context, tenantID, email string) (*User, error) {
    const q = `select id, tenant_id, email, username, display_name, pin_hash, is_active, created_at
               from users where tenant_id = $1 and email = $2`
    var u User
    err := s.sql.QueryRowContext(ctx, q, tenantID, email).Scan(&u.ID, &u.TenantID, &u.Email, &u.Username, &u.DisplayName, &u.PinHash, &u.IsActive, &u.CreatedAt)
    if err != nil { return nil, err }
    return &u, nil
}

func (s *Store) UpdateUserPinHash(ctx context.Context, userID, pinHash string) error {
    const q = `update users set pin_hash = $2 where id = $1`
    _, err := s.sql.ExecContext(ctx, q, userID, pinHash)
    return err
}

func (s *Store) GetRolesForUser(ctx context.Context, userID string) ([]string, error) {
    const q = `select r.slug from roles r join user_roles ur on ur.role_id = r.id where ur.user_id = $1 order by r.slug`
    rows, err := s.sql.QueryContext(ctx, q, userID)
    if err != nil { return nil, err }
    defer rows.Close()
    var roles []string
    for rows.Next() {
        var slug string
        if err := rows.Scan(&slug); err != nil { return nil, err }
        roles = append(roles, slug)
    }
    return roles, rows.Err()
}

type Session struct {
    ID        string
    UserID    string
    CreatedAt time.Time
    ExpiresAt sql.NullTime
    RevokedAt sql.NullTime
}

func (s *Store) CreateSession(ctx context.Context, userID, deviceID string, ttlHours int) (string, error) {
    const q = `insert into sessions (id, user_id, device_id, created_at, expires_at)
               values (gen_random_uuid(), $1, nullif($2,''), now(), now() + ($3 || ' hours')::interval)
               returning id`
    var id string
    err := s.sql.QueryRowContext(ctx, q, userID, deviceID, ttlHours).Scan(&id)
    return id, err
}

func (s *Store) GetSessionUser(ctx context.Context, sessionID string) (*User, error) {
    const q = `select u.id, u.tenant_id, u.email, u.username, u.display_name, u.pin_hash, u.is_active, u.created_at
               from sessions s join users u on u.id = s.user_id
               where s.id = $1 and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())`
    var u User
    err := s.sql.QueryRowContext(ctx, q, sessionID).Scan(&u.ID, &u.TenantID, &u.Email, &u.Username, &u.DisplayName, &u.PinHash, &u.IsActive, &u.CreatedAt)
    if err != nil { return nil, err }
    return &u, nil
}

func (s *Store) RevokeSession(ctx context.Context, sessionID string) error {
    const q = `update sessions set revoked_at = now() where id = $1`
    _, err := s.sql.ExecContext(ctx, q, sessionID)
    return err
}

func (s *Store) GetTenant(ctx context.Context, id string) (*Tenant, error) {
    const q = `select id, name, region, created_at from tenants where id = $1`
    var t Tenant
    err := s.sql.QueryRowContext(ctx, q, id).Scan(&t.ID, &t.Name, &t.Region, &t.CreatedAt)
    if err != nil { return nil, err }
    return &t, nil
}

type Vessel struct {
    ID           string         `json:"id"`
    TenantID     string         `json:"tenantId"`
    IMONumber    sql.NullString `json:"imoNumber"`
    Name         string         `json:"name"`
    FlagState    sql.NullString `json:"flagState"`
    ClassSociety sql.NullString `json:"classSociety"`
    CreatedAt    time.Time      `json:"createdAt"`
}

func (s *Store) ListVesselsByTenant(ctx context.Context, tenantID string) ([]Vessel, error) {
    const q = `select id, tenant_id, imo_number, name, flag_state, class_society, created_at 
               from vessels where tenant_id = $1 order by name`
    rows, err := s.sql.QueryContext(ctx, q, tenantID)
    if err != nil { return nil, err }
    defer rows.Close()
    var vs []Vessel
    for rows.Next() {
        var v Vesselcd apps
        if err := rows.Scan(&v.ID, &v.TenantID, &v.IMONumber, &v.Name, &v.FlagState, &v.ClassSociety, &v.CreatedAt); err != nil {
            return nil, err
        }
        vs = append(vs, v)
    }
    return vs, rows.Err()
}
