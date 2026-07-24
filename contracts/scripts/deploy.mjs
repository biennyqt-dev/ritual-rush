import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const CONTRACTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const EXPECTED_DEPLOYER = "0x6cdD0392DDEA911470471F2eD4Df3318E8E2889a";
const RPC_URL = "https://rpc.ritualfoundation.org";

const environment = await readFile(path.join(CONTRACTS_DIR, ".env"), "utf8");
const privateKey = environment.match(
  /^PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m,
)?.[1];

if (!privateKey) {
  throw new Error("contracts/.env must contain a normalized PRIVATE_KEY.");
}

const account = privateKeyToAccount(privateKey);
if (account.address.toLowerCase() !== EXPECTED_DEPLOYER.toLowerCase()) {
  throw new Error(
    `Private key derives ${account.address}, expected ${EXPECTED_DEPLOYER}.`,
  );
}

const artifact = JSON.parse(
  await readFile(
    path.join(CONTRACTS_DIR, "out", "RitualRush.sol", "RitualRush.json"),
    "utf8",
  ),
);

const ritual = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: {
    name: "RITUAL",
    symbol: "RITUAL",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
});

const publicClient = createPublicClient({
  chain: ritual,
  transport: http(RPC_URL),
});
const walletClient = createWalletClient({
  account,
  chain: ritual,
  transport: http(RPC_URL),
});

const chainId = await publicClient.getChainId();
if (chainId !== ritual.id) {
  throw new Error(`RPC returned Chain ID ${chainId}; expected ${ritual.id}.`);
}

const balanceBefore = await publicClient.getBalance({
  address: account.address,
});
const fees = await publicClient.estimateFeesPerGas({ type: "eip1559" });

const transactionHash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.object,
  account,
  gas: 400_000n,
  maxFeePerGas: fees.maxFeePerGas,
  maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
});

const receipt = await publicClient.waitForTransactionReceipt({
  hash: transactionHash,
  confirmations: 2,
  timeout: 120_000,
});

if (receipt.status !== "success" || !receipt.contractAddress) {
  throw new Error(`Deployment transaction ${transactionHash} failed.`);
}

const [code, transaction, balanceAfter] = await Promise.all([
  publicClient.getCode({ address: receipt.contractAddress }),
  publicClient.getTransaction({ hash: transactionHash }),
  publicClient.getBalance({ address: account.address }),
]);

if (!code || code === "0x") {
  throw new Error(`No runtime bytecode found at ${receipt.contractAddress}.`);
}
if (transaction.type !== "eip1559") {
  throw new Error(`Expected EIP-1559 transaction, received ${transaction.type}.`);
}

process.stdout.write(
  JSON.stringify({
    chainId,
    deployer: account.address,
    contractAddress: receipt.contractAddress,
    transactionHash,
    transactionType: transaction.type,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    balanceBefore: formatEther(balanceBefore),
    balanceAfter: formatEther(balanceAfter),
    runtimeBytecodeBytes: (code.length - 2) / 2,
  }),
);
