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

## Getting Started

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
