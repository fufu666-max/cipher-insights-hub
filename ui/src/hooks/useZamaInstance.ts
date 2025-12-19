import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { initializeFHEVM, encryptInput, resetFHEVMInstance, decryptEuint32, type FhevmInstance } from "../lib/fhevm";
import { BrowserProvider } from "ethers";

export function useZamaInstance() {
  const { chainId } = useAccount();
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize FHEVM
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      console.log("[useZamaInstance] Init called, chainId:", chainId);
      setIsLoading(true);

      if (!chainId) {
        console.log("[useZamaInstance] No chainId, skipping initialization");
        setIsLoading(false);
        return;
      }

      if (chainId !== 31337 && chainId !== 11155111) {
        console.error("[useZamaInstance] Unsupported network:", chainId);
        const errorMsg = `Unsupported network (${chainId}). Please switch to local network (31337) or Sepolia (11155111).`;
        setError(new Error(errorMsg));
        setIsLoading(false);
        return;
      }

      if (typeof window === "undefined" || !(window as any).ethereum) {
        setError(new Error("Web3 wallet not detected. Please install MetaMask or another Web3 wallet."));
        setIsLoading(false);
        return;
      }

      try {
        setError(null);

        console.log("[useZamaInstance] Starting FHEVM initialization, chainId:", chainId);

        const fhevmInstance = await initializeFHEVM(chainId);

        if (mounted) {
          setInstance(fhevmInstance);
          setIsLoading(false);
          console.log("[useZamaInstance] ✅ FHEVM initialized successfully");
        }
      } catch (err: any) {
        console.error("[useZamaInstance] ❌ FHEVM initialization failed:", err);
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      console.log("[useZamaInstance] Cleanup, chainId:", chainId);
      mounted = false;
      if (instance) {
        resetFHEVMInstance();
      }
    };
  }, [chainId, instance]);

  // Reset instance on network change
  useEffect(() => {
    return () => {
      resetFHEVMInstance();
    };
  }, [chainId]);

  // Encryption function
  const encrypt = useCallback(
    async (contractAddress: string, userAddress: string, ratingValue: number) => {
      if (!instance) {
        throw new Error("FHEVM instance not initialized");
      }
      return encryptInput(instance, contractAddress, userAddress, ratingValue);
    },
    [instance],
  );

  // Decryption function
  const decrypt = useCallback(
    async (handle: string, contractAddress: string, userAddress: string) => {
      if (!instance) {
        throw new Error("FHEVM instance not initialized");
      }

      // Get signer from window.ethereum
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      return decryptEuint32(instance, handle, contractAddress, userAddress, signer, chainId);
    },
    [instance, chainId],
  );

  return {
    zamaInstance: instance,
    error,
    isLoading,
    isReady: !!instance && !isLoading,
    encrypt,
    decrypt,
  };
}
