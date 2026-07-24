# Ritual Rush

**Rush through the network. Survive the chaos.**

Ritual Rush is an original, community-built, three-lane endless runner for the browser. You guide the supplied official Ritual logo through deep space, dodge incoming copies of that logo, collect temporary energy shields, and push a local daily score.

This preview is intentionally offchain-first. Gameplay never requires a wallet, signature, transaction, token approval, or smart contract. Optional wallet connection provides a stable display identity and a clear path toward future verified features.

> Ritual Rush is an independent community project and is not an official Ritual Foundation product.

## Gameplay

- Avoid incoming Ritual-logo obstacles across three lanes.
- Every 15 seconds, a new acceleration level smoothly increases travel speed and spawn rate.
- A pulled-back camera, wider distant lanes, and longer spawn spacing make hazards readable several moves ahead.
- Collect distinct energy-shield power-ups for temporary protection.
- A protected collision breaks the shield; an unprotected collision ends the run.
- Personal best, guest identity, settings, achievements, and daily score persist locally.

### Controls

| Platform | Controls |
| --- | --- |
| Desktop | `←` / `A` move left, `→` / `D` move right |
| Pause | `P` or `Escape` |
| Start / restart | `Enter` or `Space` |
| Mobile | Large left/right controls, pause button, or horizontal swipe |

The game automatically pauses when the tab is hidden or the window loses focus.

## Features

- Delta-time-based HTML Canvas game loop
- Responsive desktop, tablet, portrait, and landscape layouts
- Official Ritual-logo player and obstacles with fair generated patterns
- User-supplied galaxy background with speed-linked parallax and particles
- Distinct energy-shield pickup, active aura, and break feedback
- Compact top HUD with score, shield state, and best score
- Local/demo daily leaderboard with UTC reset and top-25 display
- Highest-score-only submission per local identity and UTC day
- Thirty-five locally persisted achievements across eight categories, including five hidden challenges
- Overall achievement completion, animated unlock toasts, and seven lifetime-stat readouts
- Guest nickname validation and optional injected-browser-wallet connection
- Centralized Ritual Testnet chain configuration
- Share-on-X intent from the game-over screen
- User-supplied looping music with interaction-gated playback and a persistent Music ON/OFF preference
- Keyboard navigation, visible focus states, reduced-motion support, modal focus trapping, and accessible Canvas fallback
- Strict TypeScript, ESLint, Vitest, and production-build verification

The player and every obstacle use the user-supplied official logo at `public/ritual-logo.jpg`, rendered proportionally without redesigning, stretching, or recoloring it. The shield remains a separate original energy-orb design. The animated scene uses only `public/galaxy-background.jpg`, and music uses only `public/ritual-rush-music.mp3`.

## Technology

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS plus product-specific CSS
- HTML Canvas
- Wagmi and Viem
- TanStack Query
- Vitest
- ESLint

## Local setup

Requirements: a current Node.js release compatible with Next.js 16 and `pnpm`.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`.

### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Environment variables

Copy `.env.example` to `.env.local` only when you need to override the public Ritual endpoint or prepare a hosted leaderboard:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_RITUAL_RPC_URL` | Ritual Testnet RPC used by the optional wallet configuration |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical production origin; Vercel supplies its production URL automatically |
| `NEXT_PUBLIC_LEADERBOARD_API_URL` | Reserved for a future hosted adapter; unused by the local preview |

No private key, secret, API token, or contract address is required.

## Ritual Testnet configuration

The network configuration is centralized in `src/lib/ritual.ts` and uses values from the installed official Ritual dApp skills:

| Property | Value |
| --- | --- |
| Chain ID | `1979` |
| Network name | Ritual Testnet |
| Currency | RITUAL, 18 decimals |
| HTTP RPC | `https://rpc.ritualfoundation.org` |
| WebSocket RPC | `wss://rpc.ritualfoundation.org/ws` |
| Explorer | `https://explorer.ritualfoundation.org` |

The wallet button is optional. Guest play remains fully available when no provider is installed, when a connection is rejected, or when the connected wallet uses another network. The app can request a switch/add operation for Ritual Testnet but never requests a signature or transaction.

## Leaderboard architecture

`LeaderboardService` defines:

- `getDailyLeaderboard()`
- `submitScore()`
- `getPlayerDailyBest()`
- `getDailyRank()`

The preview uses `LocalLeaderboardService`, backed by browser storage and clearly labeled demo rows. `HostedLeaderboardService` is a non-active adapter boundary for a later database implementation. The preview leaderboard is not cheat-resistant and makes no claim that offchain scores are verified.

Daily cycles use UTC. Only the highest score for each identity is retained within a UTC day.

## Achievement system

The achievement engine is separate from React presentation and evaluates 35 challenges across Getting Started, Score Milestones, Shield Mastery, Speed Challenges, Daily Challenges, Leaderboard, Skill Challenges, and Hidden Achievements.

Progress, unlock dates, played UTC days, and lifetime statistics are stored locally for guest play. Hidden achievement names and objectives remain concealed until unlocked. Lifetime stats track games, high score, shields, distance, best speed level, completed achievements, and the current daily best.

## Ritual skills used

The official `ritual-foundation/ritual-dapp-skills` repository is installed at `.codex/skills/ritual-dapp-skills`. The build follows its mandatory checkpoint file at `.ritual-build/progress.json`.

Guidance loaded and applied:

- `ritual` entrypoint and build execution trace
- `ritual-meta-projection`
- `ritual-dapp-overview`
- `ritual-dapp-precompiles`
- `ritual-dapp-contracts`
- `ritual-dapp-wallet`
- `ritual-dapp-frontend`
- `ritual-dapp-design`
- `ritual-dapp-deploy`
- `ritual-dapp-testing`
- `ritual-dapp-debugger`
- `ritual-meta-verification`

The projection phase determined that no precompile or consumer contract is essential for this first version: Canvas rendering, arcade logic, local persistence, score display, and guest identity are browser concerns. The official chain and wallet guidance still shapes the optional connection flow and centralized network configuration.

## Production deployment

- Live game: [ritual-rush-eight.vercel.app](https://ritual-rush-eight.vercel.app)
- Source: [github.com/biennyqt-dev/ritual-rush](https://github.com/biennyqt-dev/ritual-rush)
- Host: Vercel, connected to the GitHub `main` branch
- Network: Ritual Testnet, Chain ID `1979`

Create and run an optimized build locally with:

```bash
pnpm build
pnpm start
```

This version deploys the browser application to Vercel and configures its optional
wallet layer for Ritual Testnet. It does not deploy a smart contract because the
gameplay loop, achievements, settings, and local leaderboard are intentionally
offchain and require no transaction.

## Known limitations

- Leaderboard rows and achievements are device-local.
- Demo leaderboard names are preview data, not real community members.
- Offchain scores are not cheat-resistant.
- Wallet connection is identity-only in this version.
- Music begins only after the player starts a run, in line with browser autoplay requirements.
- Image export for the in-app score card is not included.
- No smart contract or hosted database is deployed.

## License

MIT
