# HowdyScout 🤠

**HowdyScout** is a comprehensive FRC (FIRST Robotics Competition) scouting application built with Next.js for the 2026 REBUILT™ season.

## Features

- **Scout Precision Ranking (SPR)** - Evaluate scout accuracy using Bayesian methods
- **Monte Carlo Simulation** - Predict rankings with 10,000+ iterations
- **Match Predictions** - Predict match outcomes with confidence intervals
- **What-If Scenarios** - Simulate hypothetical outcomes
- **Pick List Generator** - Generate alliance selection rankings
- **Defense Analysis** - Track defensive capabilities and matchups
- **AI Strategy** - AI-powered match strategy generation
- **Real-time Data** - Live integration with The Blue Alliance API
- **EPA Metrics** - Integration with Statbotics EPA data

## Auton Importance CLI 🤖

Analyzes FRC 2026 REBUILT match data to quantify how often winning autonomous (auto) by exactly **1 point** correlates with winning the full match.

**2026 REBUILT scoring:** fuel × 1 pt, Tower Level 1 auto = 15 pts (via `autoPoints` field in TBA score_breakdown).

### Setup

Add your API key to `.env.local`:

```
TBA_AUTH_KEY=your_tba_api_key
# Optional — override Statbotics base URL
# STATBOTICS_API_BASE=https://api.statbotics.io/v3
```

### Usage

```bash
npm run auton-importance -- [options]
```

| Option | Description |
|---|---|
| `--year <year>` | Season year (default: `2026`) |
| `--event <eventKey>` | Limit to a single event, e.g. `2026txcle` |
| `--level <level>` | Filter by comp level: `qm`, `ef`, `qf`, `sf`, `f` |
| `--limit <n>` | Stop after analysing *n* qualifying matches |
| `--json-out <file>` | Write full JSON results to a file |
| `--use-statbotics` | Enrich matches with Statbotics EPA (sums per-team EPA per alliance) |
| `--help` | Show help |

### Examples

```bash
# Analyse all 2026 qualification matches (default year)
npm run auton-importance -- --level qm

# Analyse a single 2026 event with Statbotics EPA enrichment
npm run auton-importance -- --event 2026txcle --use-statbotics

# Export results to JSON
npm run auton-importance -- --json-out ./out/2026-auton.json

# Analyse a specific year
npm run auton-importance -- --year 2025 --level qm

# Show help
npm run auton-importance -- --help
```

### Output

The tool prints a human-readable summary table plus a sample match listing to stdout.

When `--json-out` is specified the full result object (records + summaries by event) is written as pretty-printed JSON:

```jsonc
{
  "year": 2026,
  "filters": { "event": "2026txcle", "level": "qm" },
  "records": [ /* one entry per qualifying match */ ],
  "summary": {
    "totalMatches": 12,
    "wins": 7, "losses": 4, "ties": 1,
    "winPct": 58.3, "lossPct": 33.3, "tiePct": 8.3,
    "finalMarginDistribution": { "-15": 1, "3": 2, ... }
  },
  "bySeason": { "2026": { ... } },
  "byEvent": { "2026txcle": { ... } }
}
```

---



### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_TBA_API_KEY=your_tba_api_key
TBA_AUTH_KEY=your_tba_api_key
HACK_CLUB_AI_KEY=your_ai_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/          # Next.js App Router pages
├── components/   # React components
├── hooks/        # Custom React hooks
└── lib/          # Core logic & utilities
    ├── spr.ts         # Scout Precision Ranking
    ├── simulation.ts  # Monte Carlo simulator
    ├── predictions.ts # Match predictions
    ├── scenarios.ts   # What-if analysis
    ├── pickList.ts    # Alliance selection
    ├── defense.ts     # Defense analysis
    ├── ai.ts          # AI strategy generation
    └── ...
```

## Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Data Fetching**: SWR
- **Charts**: Recharts
- **Testing**: Jest + React Testing Library
- **APIs**: The Blue Alliance, Statbotics, OpenRouter AI

## License

MIT
