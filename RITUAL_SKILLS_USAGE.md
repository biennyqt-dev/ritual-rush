# Ritual Skills Usage

Ritual Rush follows the vendored official Ritual dApp skills repository:

`.codex/skills/ritual-dapp-skills`

The vendored directory is committed in full so the project has a reviewable,
versioned reference for the Ritual-specific workflow. The entrypoint used for
the project is:

`.codex/skills/ritual-dapp-skills/skills/ritual/SKILL.md`

## Skills applied

- `ritual-meta-projection` — mapped the game and score-recording requirements
  to a Ritual-compatible project plan.
- `ritual-dapp-overview` and `ritual-dapp-precompiles` — checked Ritual chain
  behavior and confirmed that this version does not require a precompile.
- `ritual-dapp-contracts` — designed the permissionless `RitualRush` score
  registry, run ID rules, score validation, and `ScoreRecorded` event.
- `ritual-dapp-wallet` — kept wallet connection optional and limited recording
  to a normal user-paid Ritual Testnet transaction.
- `ritual-dapp-frontend` and `ritual-dapp-design` — integrated the wallet,
  simulation, transaction state, explorer links, and onchain leaderboard into
  the Next.js UI.
- `ritual-dapp-deploy` — centralized Ritual Testnet configuration on Chain ID
  `1979` and documented the deployment/verification path.
- `ritual-dapp-testing` and `ritual-meta-verification` — guided contract,
  frontend, simulation, explorer, and end-to-end checks.
- `ritual-dapp-debugger` — used for diagnosing the original score-record
  revert and checking the deployed address, ABI, arguments, and limits.

## Official contract workflow

Contract compilation, ABI generation, deployment, and verification use the
official Foundry workflow required by the Ritual skills. The project does not
use a generic `solc-js` deployment path.

```text
contracts/scripts/deploy-ritual.ps1
contracts/scripts/export-frontend-abi.ps1
contracts/verification/ritual-rush-standard-input.json
```

The workflow is:

1. `forge build` compiles `contracts/src/RitualRush.sol` with Solidity
   `0.8.24`.
2. `forge test -vvv` runs the contract regression suite.
3. `forge inspect RitualRush abi --json` generates the checked-in frontend ABI
   at `src/lib/generated/ritualRushAbi.ts`.
4. `forge create` deploys with EIP-1559 to Ritual Testnet (`1979`) using
   `https://rpc.ritualfoundation.org`.
5. `forge verify-contract --show-standard-json-input` produces the source
   input used by Ritual Explorer **Verify & Publish**.
6. The frontend simulates `recordScore` before requesting the wallet
   transaction and links confirmed transactions to Ritual Explorer.

The current registry is:

`0xeA43d7fcDb8ECCDc0C1F5A763b7F21c2EF4dCaEE`

All score reads and writes stay on Ritual Testnet. No Ethereum Sepolia
configuration is used, and private keys are never committed.

## Checkpoint and verification

The Ritual checkpoint is tracked in `.ritual-build/progress.json`. The normal
verification commands are:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build

cd contracts
forge build
forge test -vvv
```

This document records how the skills are used; the vendored skill files remain
the authoritative Ritual guidance.
