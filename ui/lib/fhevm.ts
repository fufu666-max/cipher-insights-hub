import { createInstance, initSDK, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";

// Cache instance to avoid reinitialization
let fhevmInstance: FhevmInstance | null = null;
let isSDKInitialized = false;

// Initialize SDK first
    if (!isSDKInitialized) {
      console.log('Initializing FHE SDK...');
      await initSDK();
      isSDKInitialized = true;
    }

    export async function initializeFHEVM(chainId?: number): Promise<FhevmInstance> {
  if (!fhevmInstance) {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("window.ethereum is not available");
    }
    
    if (!isSDKInitialized) {
      await initSDK();
      isSDKInitialized = true;
    }
    
    const config = {
      ...SepoliaConfig,
      network: (window as any).ethereum,
    };
    
    fhevmInstance = await createInstance(config);
  }
  
  return fhevmInstance;
}

export async function encryptNumber(
  fhevm: FhevmInstance,
  contractAddress: string,
  userAddress: string,
  number: number
) {
  const encryptedInput = fhevm
    .createEncryptedInput(contractAddress, userAddress)
    .add32(number);
  
  return await encryptedInput.encrypt();
}



export async function decryptNumber(
  fhevm: FhevmInstance,
  encryptedValue: string,
  contractAddress: string,
  signer: any,
  chainId?: number
): Promise<number> {
  try {
    if (const isSepolia = chainId === 11155111;
    if (isSepolia)) {
      const keypair = fhevm.generateKeypair();
      const userAddress = await signer.getAddress();
      const result = await fhevm.userDecrypt(
        [{ handle: encryptedValue, contractAddress }],
        keypair.privateKey,
        keypair.publicKey,
        '',
        [contractAddress],
        userAddress,
        Math.floor(Date.now() / 1000).toString(),
        '10'
      );
      return Number(result[encryptedValue] || 0);
    }
    return 0;
  } catch (error: any) {
    throw new Error(Decryption failed: );
  }
}



