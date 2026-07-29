# Ritual Rush contracts

`RitualRush.sol` is the permissionless score registry for Ritual Testnet. It
accepts valid score claims from any connected wallet and has no owner, fees,
custodied funds, privileged withdrawal path, or token logic.

Each run is recorded once per wallet by a unique `bytes32 runId`. The
`ScoreRecorded` event includes the wallet, score, level, duration, nickname,
metadata reference, and block timestamp. The contract accepts Levels 1–100,
matching the game’s trap-speed progression.

## Official Ritual toolchain

The contract and deployment workflow follow the official
[`ritual-foundation/ritual-dapp-skills`](https://github.com/ritual-foundation/ritual-dapp-skills)
repository kept at `.codex/skills/ritual-dapp-skills`.

Applied requirements:

- Ritual Chain ID `1979`
- EIP-1559 deployment transaction
- `https://rpc.ritualfoundation.org`
- Official Foundry compiler and artifacts (`forge build`)
- ABI generation from Foundry (`forge inspect RitualRush abi --json`)
- EIP-1559 deployment with the official `forge create` workflow
- Ritual custom verification workflow and standard-json input
- Frontend simulation before score transactions

The repository does not use a generic `solc-js` compilation or deployment path.
`contracts/scripts/deploy-ritual.ps1` calls the official Foundry commands, and
`contracts/scripts/export-frontend-abi.ps1` generates the checked-in frontend
ABI from Foundry's artifact. The generated ABI must be refreshed after every
Solidity change.

## Official local workflow

```bash
cd contracts
forge build
forge test -vvv
forge inspect RitualRush abi --json
```

Deploy to Ritual Testnet (Chain ID `1979`) using EIP-1559:

```bash
source .env
forge create src/RitualRush.sol:RitualRush \
  --rpc-url "$RITUAL_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --json
```

On Windows, use `scripts/deploy-ritual.ps1` instead of manually passing the
key. Never commit `contracts/.env`.

Generate the official source-verification input for Ritual Explorer:

```bash
source .env
forge verify-contract \
  --chain 1979 \
  --verifier custom \
  --verifier-url "$RITUAL_VERIFIER_URL" \
  --verifier-api-key unused \
  <CONTRACT_ADDRESS> \
  src/RitualRush.sol:RitualRush \
  --show-standard-json-input > verification/ritual-rush-standard-input.json
```

Ritual's custom endpoint returned an unavailable-path response in this
environment, so the generated standard-json input was submitted through the
official Ritual Explorer **Verify & Publish** page. The contract is now shown
as verified with `solc v0.8.24+commit.e11b9ed9`; do not switch to Sourcify or
another chain.

Current public deployment: [`0xeA43d7fcDb8ECCDc0C1F5A763b7F21c2EF4dCaEE`](https://explorer.ritualfoundation.org/address/0xeA43d7fcDb8ECCDc0C1F5A763b7F21c2EF4dCaEE),
deployed with official Foundry by [`0x777149801c648a68ae656e7f686e1335964d7aa1fdec082aec2d96b2a3f06dee`](https://explorer.ritualfoundation.org/tx/0x777149801c648a68ae656e7f686e1335964d7aa1fdec082aec2d96b2a3f06dee).
