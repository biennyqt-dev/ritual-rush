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

const abi = JSON.parse(
  await readFile(
    path.join(CONTRACTS_DIR, "out-solc", "src_RitualRush_sol_RitualRush.abi"),
    "utf8",
  ),
);
const bytecode = `0x${(
  await readFile(
    path.join(CONTRACTS_DIR, "out-solc", "src_RitualRush_sol_RitualRush.bin"),
    "utf8",
  )
).trim()}`;
const artifact = { abi, bytecode: { object: bytecode } };

const hasScoreRegistry = artifact.abi.some(
  (item) => item.type === "function" && item.name === "recordScore",
);
if (!hasScoreRegistry) {
  throw new Error(
    "Compile the current score-only registry before deploying.",
  );
}

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
const estimatedDeploymentGas = await publicClient.estimateGas({
  account: account.address,
  data: artifact.bytecode.object,
});
const deploymentGas = estimatedDeploymentGas + estimatedDeploymentGas / 5n;

const transactionHash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.object,
  account,
  gas: deploymentGas,
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

const version = await publicClient.readContract({
  address: receipt.contractAddress,
  abi: artifact.abi,
  functionName: "VERSION",
});
const maxSpeedLevel = await publicClient.readContract({
  address: receipt.contractAddress,
  abi: artifact.abi,
  functionName: "MAX_SPEED_LEVEL",
});

if (!code || code === "0x") {
  throw new Error(`No runtime bytecode found at ${receipt.contractAddress}.`);
}
if (transaction.type !== "eip1559") {
  throw new Error(`Expected EIP-1559 transaction, received ${transaction.type}.`);
}
if (version !== "3.0.0" || Number(maxSpeedLevel) !== 100) {
  throw new Error(
    `Unexpected registry version or speed ceiling: ${version} / ${maxSpeedLevel}.`,
  );
}

process.stdout.write(
  JSON.stringify({
    chainId,
    deployer: account.address,
    contractAddress: receipt.contractAddress,
    transactionHash,
    version,
    maxSpeedLevel: maxSpeedLevel.toString(),
    transactionType: transaction.type,
    estimatedDeploymentGas: estimatedDeploymentGas.toString(),
    deploymentGas: deploymentGas.toString(),
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    balanceBefore: formatEther(balanceBefore),
    balanceAfter: formatEther(balanceAfter),
    runtimeBytecodeBytes: (code.length - 2) / 2,
  }),
);
