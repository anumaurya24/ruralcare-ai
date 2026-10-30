-- Same table that backend/db/models.py creates on startup (SQLite / PostgreSQL compatible).
CREATE TABLE IF NOT EXISTS encounters (
    id             INTEGER PRIMARY KEY,
    channel        VARCHAR(16) NOT NULL,      -- 'json' or 'sms'
    text           TEXT        NOT NULL,      -- this message only
    locale         VARCHAR(8)  NOT NULL DEFAULT 'en',
    rule           VARCHAR(16) NOT NULL,      -- EMERGENCY / URGENT / ROUTINE from rules.yaml
    risk_score     REAL,                      -- NULL when a rule already decided
    triage         VARCHAR(16) NOT NULL,      -- final decision
    guidance       TEXT        NOT NULL,
    reason         TEXT        NOT NULL,      -- e.g. 'Red flag: chest pain + shortness of breath'
    signals        TEXT        NOT NULL,      -- comma-separated symptom signals
    duration_days  INTEGER,
    sender         VARCHAR(32),               -- SMS 'From' number
    thread_id      INTEGER,                   -- id of the first encounter in the conversation
    status         VARCHAR(16) NOT NULL DEFAULT 'open',  -- open / acknowledged / resolved
    created_at     TIMESTAMP   NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_encounters_sender ON encounters (sender);
