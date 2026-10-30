-- Same table that backend/db/models.py creates on startup (SQLite / PostgreSQL compatible).
CREATE TABLE IF NOT EXISTS encounters (
    id          INTEGER PRIMARY KEY,
    channel     VARCHAR(16) NOT NULL,      -- 'json' or 'sms'
    text        TEXT        NOT NULL,
    locale      VARCHAR(8)  NOT NULL DEFAULT 'en',
    rule        VARCHAR(16) NOT NULL,      -- EMERGENCY / URGENT / ROUTINE from rules.yaml
    risk_score  REAL,                      -- NULL when a rule already decided
    triage      VARCHAR(16) NOT NULL,      -- final decision
    guidance    TEXT        NOT NULL,
    created_at  TIMESTAMP   NOT NULL
);
