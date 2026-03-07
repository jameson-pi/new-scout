-- HowdyScout 2026 — REBUILT™ Edition
-- Azure SQL Schema for howdyscout2026
-- Server: sbrondel.database.windows.net

-- =============================================
-- Events lookup table
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events' AND xtype='U')
CREATE TABLE Events (
    event_key       NVARCHAR(20)  NOT NULL PRIMARY KEY,
    name            NVARCHAR(100) NOT NULL,
    location        NVARCHAR(100) NOT NULL,
    year            INT           NOT NULL DEFAULT 2026
);

-- Seed known 2026 events
MERGE Events AS target
USING (VALUES
    ('2026howdy',  'HowdyScout Practice',  'Houston, TX',  2026),
    ('2026txcle', 'Space City #1',   'Houston, TX',  2026),
    ('2026txman', 'Manor District',  'Manor, TX',    2026)
) AS source (event_key, name, location, year)
ON target.event_key = source.event_key
WHEN NOT MATCHED THEN
    INSERT (event_key, name, location, year)
    VALUES (source.event_key, source.name, source.location, source.year);

-- =============================================
-- Scout Reports table — REBUILT 2026
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ScoutReports' AND xtype='U')
CREATE TABLE ScoutReports (
    primary_key         NVARCHAR(100) NOT NULL PRIMARY KEY,
    frc_team            INT           NOT NULL,
    event_key           NVARCHAR(20)  NOT NULL,
    match_key           NVARCHAR(50)  NOT NULL,
    driver_station      NVARCHAR(10)  NULL,
    comp_level          NVARCHAR(5)   NOT NULL DEFAULT 'qm',
    match_number        INT           NOT NULL,

    -- Autonomous
    auto_moved          BIT           NOT NULL DEFAULT 0,
    auto_fuel_scored    INT           NOT NULL DEFAULT 0,
    auto_tower_level    NVARCHAR(10)  NOT NULL DEFAULT 'None',

    -- Teleop
    tele_fuel_scored    INT           NOT NULL DEFAULT 0,
    tele_tower_level    NVARCHAR(10)  NOT NULL DEFAULT 'None',

    -- Derived / calculated
    auto_total          INT           NOT NULL DEFAULT 0,
    tele_total          INT           NOT NULL DEFAULT 0,
    tele_better         BIT           NOT NULL DEFAULT 0,

    -- Qualitative
    hub_control         NVARCHAR(15)  NULL,       -- Dominant | Average | Weak
    trench_capable      BIT           NOT NULL DEFAULT 0,
    defender_rating     INT           NOT NULL DEFAULT 3,
    mech_failure        BIT           NOT NULL DEFAULT 0,
    other_notes         NVARCHAR(MAX) NULL,
    scouted_by          NVARCHAR(100) NOT NULL,

    submitted_at        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_ScoutReports_Events FOREIGN KEY (event_key) REFERENCES Events(event_key)
);

-- Indexes for common queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_ScoutReports_EventKey')
    CREATE INDEX IX_ScoutReports_EventKey   ON ScoutReports (event_key);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_ScoutReports_TeamKey')
    CREATE INDEX IX_ScoutReports_TeamKey    ON ScoutReports (frc_team, event_key);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_ScoutReports_MatchKey')
    CREATE INDEX IX_ScoutReports_MatchKey   ON ScoutReports (match_key);

