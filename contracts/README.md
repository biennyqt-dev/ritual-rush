# Ritual Rush contracts

`RitualRush.sol` is the permissionless score registry for Ritual Testnet. It
accepts valid score claims from any connected wallet and has no owner, fees,
custodied funds, privileged withdrawal path, or token logic.

Each run is recorded once per wallet by a unique `bytes32 runId`. The
`ScoreRecorded` event includes the wallet, score, level, duration, nickname,
metadata reference, and block timestamp. The contract accepts Levels 1–100,
matching the game’s trap-speed progression.

## Ritual skill trace

The contract and deployment workflow follow the official
[`ritual-foundation/ritual-dapp-skills`](https://github.com/ritual-foundation/ritual-dapp-skills)
repository kept at `.codex/skills/ritual-dapp-skills`.

Applied requirements:

- Ritual Chain ID `1979`
- EIP-1559 deployment transaction
- `https://rpc.ritualfoundation.org`
- Runtime bytecode and read-call verification
- Frontend simulation before score transactions

## Local verification

```bash
cd contracts
forge build
forge test -vvv
```

The deployment helper reads the Solidity 0.8.24 compiler output from
`contracts/out-solc`, verifies the Ritual chain, deploys the current registry,
and checks `VERSION() == 3.0.0` plus `MAX_SPEED_LEVEL() == 100`.

Current public deployment: [`0xa4eca5499d798c01dd2f8710d2520220b6177020`](https://explorer.ritualfoundation.org/address/0xa4eca5499d798c01dd2f8710d2520220b6177020),
deployed by [`0xa8260b3c559c1f2dc401975846d59a2bc900887af878842e2d30c5e8917fd7c4`](https://explorer.ritualfoundation.org/tx/0xa8260b3c559c1f2dc401975846d59a2bc900887af878842e2d30c5e8917fd7c4).
