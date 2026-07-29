# Ritual Rush

**Rush through the network. Survive the chaos.**

Ritual Rush is a three-lane endless runner for the browser. Guide the supplied
Ritual logo through deep space, dodge incoming copies, collect temporary energy
shields, and optionally publish a completed run to Ritual Testnet.

Gameplay is wallet-optional. A wallet is required only when a player chooses
**Record your score** after Game Over. The dApp never requests a signature or
transaction automatically.

> Ritual Rush is an independent community project and is not an official Ritual Foundation product.

## Gameplay

- Avoid incoming Ritual-logo obstacles across three lanes.
- Levels 1–100 accelerate trap movement with fair, readable patterns.
- Collect distinct energy shields for temporary collision protection.
- Personal best, runner identity, settings, achievements, and lifetime stats persist locally.
- Music starts after the first interaction and remembers the player’s preference.

## Ritual Testnet score recording

After a run, a connected wallet can simulate and then submit one normal
Ritual Testnet transaction. The score registry is permissionless: any connected
wallet can record a valid run and pays only normal testnet RITUAL network gas.
The frontend checks the chain, contract version, arguments, and revert reason
before asking the wallet to send the transaction.

Only confirmed `ScoreRecorded` events from the configured Ritual contract are
shown in **YOUR RECORD SCORE IN RITUAL RUSH**. The board keeps the highest
confirmed score for each wallet, displays the recorded nickname with the
shortened wallet as its secondary identity, and links every row to the Ritual
Explorer transaction.

## Ritual Testnet configuration

| Property | Value |
| --- | --- |
| Chain ID | `1979` |
| RPC | `https://rpc.ritualfoundation.org` |
| Explorer | `https://explorer.ritualfoundation.org` |
| Contract | Set by `NEXT_PUBLIC_RITUAL_RUSH_CONTRACT` |

Copy `.env.example` to `.env.local` when overriding the public endpoint:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_RITUAL_RPC_URL` | Ritual Testnet HTTP RPC |
| `NEXT_PUBLIC_RITUAL_RUSH_CONTRACT` | Score registry address on Chain 1979 |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical production origin |

Never commit a private key or secret. No Ethereum Sepolia configuration is used.

## Ritual skills used

The complete official [`ritual-foundation/ritual-dapp-skills`](https://github.com/ritual-foundation/ritual-dapp-skills)
directory is kept at `.codex/skills/ritual-dapp-skills` and committed with this
repository. The implementation follows its `ritual` entrypoint, debugger,
contracts, wallet, frontend, deploy, testing, and verification guidance. The
checkpoint state is tracked in `.ritual-build/progress.json`.

## Local setup

Requirements: a current Node.js release compatible with Next.js 16 and `pnpm`.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Next.js, normally `http://localhost:3000`.

## Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Contract checks (in a Foundry-enabled environment):

```bash
cd contracts
forge build
forge test -vvv
```

The deployment helper compiles the current Solidity source with Solidity
`0.8.24`, verifies Chain ID `1979`, deploys with EIP-1559 fees, checks runtime
bytecode, and reads the deployed version and Level-100 speed ceiling.

## Production

- Live game: [ritual-rush-eight.vercel.app](https://ritual-rush-eight.vercel.app)
- Source: [github.com/biennyqt-dev/ritual-rush](https://github.com/biennyqt-dev/ritual-rush)
- Network: Ritual Testnet, Chain ID `1979`
- Score registry: [`0xa4eca5499d798c01dd2f8710d2520220b6177020`](https://explorer.ritualfoundation.org/address/0xa4eca5499d798c01dd2f8710d2520220b6177020)
- Registry deployment: [`0xa8260b3c559c1f2dc401975846d59a2bc900887af878842e2d30c5e8917fd7c4`](https://explorer.ritualfoundation.org/tx/0xa8260b3c559c1f2dc401975846d59a2bc900887af878842e2d30c5e8917fd7c4)
