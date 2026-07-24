# Ritual Rush contracts

`RitualRush.sol` is the public testnet registry for player-submitted score
claims. It is intentionally permissionless and has no owner, upgrade path, token,
custodied funds, or privileged withdrawal mechanism.

The browser game remains playable without a wallet. On-chain scores are public
claims from connected wallets, not proof that a score was earned fairly.

## Ritual skill trace

The contract and deployment workflow follow the official
[`ritual-foundation/ritual-dapp-skills`](https://github.com/ritual-foundation/ritual-dapp-skills)
repository pinned in this project at `.codex/skills/ritual-dapp-skills`.

Applied requirements:

- Ritual Chain ID `1979`
- EIP-1559 deployment transaction
- `https://rpc.ritualfoundation.org`
- Custom verifier at `https://rpc.ritualfoundation.org/api/verify`
- Compile, unit-test, deploy, verify, bytecode-check, and read-call checkpoints

## Local verification

```bash
cd contracts
forge build
forge test -vvv
```
