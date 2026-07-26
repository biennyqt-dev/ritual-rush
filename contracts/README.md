# Ritual Rush contracts

`RitualRush.sol` is the v2 public testnet registry for player-submitted score
records and optional score-card NFTs. It is intentionally permissionless and has
no owner, upgrade path, fees, custodied funds, or privileged withdrawal mechanism.

The contract exposes `recordScore(...)` for one immutable run ID per wallet and
`mintScoreCard(runId)` as an optional second transaction. Both actions are
explicitly initiated by the player; the game never sends a transaction by itself.

The browser game remains playable without a wallet. On-chain scores are public
claims from connected wallets, not proof that a score was earned fairly.

## Ritual skill trace

The contract and deployment workflow follow the official
[`ritual-foundation/ritual-dapp-skills`](https://github.com/ritual-foundation/ritual-dapp-skills)
repository pinned in this project at `.codex/skills/ritual-dapp-skills`.

Applied requirements:

- Ritual Chain ID `1979`
- EIP-1559 deployment transaction (v2 deployed to Ritual public testnet)
- `https://rpc.ritualfoundation.org`
- Custom verifier at `https://rpc.ritualfoundation.org/api/verify`
- Compile, unit-test, deploy, verify, bytecode-check, and read-call checkpoints

## Local verification

```bash
cd contracts
forge build
forge test -vvv
```

The v2 source compiles with Solidity 0.8.24 and is deployed at
`0xff63baef4911e909d1546f4ca24af2797c96279e` with transaction
`0xee718873372afcb4ca2c37179546eba44476f851c792198098c35fe1c0d7ca1a`.
Foundry is not installed in the current shell, so the Foundry suite must still
be run in a Foundry-enabled environment.
