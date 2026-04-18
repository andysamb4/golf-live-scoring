# Golf Live Scoring App

## Stack
React 19 + TypeScript, Vite (port 3000), Firebase/Firestore, Tailwind CSS (via inline classes). No router — uses `View` type + hash-based spectator URLs. Deployed via Vercel (API routes in `api/`).

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build to `dist/`

## Architecture
Single-page app driven by `App.tsx` view state (`View` type in `types.ts`). No routing library.

- **Screens** (`components/`): FrontPage, Setup, Scoring, Leaderboard, Spectator, WatchLive, GroupManagement, TournamentHub, CreateTournament
- **Services** (`services/`): scoringService (calculation logic), firebaseService, liveGameService (Firestore real-time sync), groupService, tournamentService, speechService, shareService, claudeService
- **API** (`api/`): Vercel serverless functions (course-search uses Claude API)
- **Types** (`types.ts`): All shared interfaces/enums — Course, Player, GameState, Tournament, etc.
- **Constants** (`constants.ts`): Default course data (Brampton Heath)

## Key Domain Logic
- **Scoring formats**: Stableford (points, higher=better), Medal (gross strokes, lower=better), Skins, Match Play (2 players only)
- **WHS Handicap**: `playingHandicap = handicapIndex * (slope/113) + (courseRating - par)` — see `scoringService.ts`
- **Shots received**: Distributed by stroke index. `floor(playingHcp/18)` base + 1 extra on holes where `strokeIndex <= playingHcp % 18`
- **Per-player tees**: Each player can select a different tee set (`selectedTee` on Player), which overrides course-level slope/rating for handicap calc
- **Stableford points**: Net double bogey or worse = 0, bogey = 1, par = 2, birdie = 3, eagle = 4, albatross+ = 5

## State Management
localStorage persistence for active game, view, live code, tournaments. Firestore for real-time live game sync. No Redux/Zustand — all useState in App.tsx, props down.

## Styling
Dark theme: `bg-dark-slate`, `text-off-white`, `bg-dark-green` (header). Custom Tailwind colors defined somewhere in config. Green/slate palette throughout.
