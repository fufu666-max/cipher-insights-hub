import { useAccount, usePublicClient, useWalletClient, useChainId } from "wagmi";
import { getContractAddress, isContractDeployed, CONTRACT_ABI } from "../config/contracts";
import { useZamaInstance } from "./useZamaInstance";
import { useState, useCallback } from "react";
import { toast } from "sonner";

// Note: ABI is now synchronized with the contract (no time fields)

export interface Survey {
  title: string;
  description: string;
  productCount: bigint;
  productNames: string[];
  createdTime: bigint;
  endTime: bigint;
  isActive: boolean;
  isFinalized: boolean;
  admin: string;
  totalResponses: bigint;
}

export function useSurveyContract() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { zamaInstance, encrypt, decrypt, isLoading: zamaLoading } = useZamaInstance();
  const [isLoading, setIsLoading] = useState(false);

  // Get contract info for current network
  const contractAddress = getContractAddress(chainId);
  const contractDeployed = isContractDeployed(chainId);

  // Get survey count
  const getSurveyCount = useCallback(async (): Promise<number> => {
    if (!publicClient || !contractDeployed) return 0;
    try {
      // Verify contract exists at address
      const code = await publicClient.getBytecode({ address: contractAddress });
      if (!code || code === "0x") {
        console.error(
          `[getSurveyCount] No contract code found at address ${contractAddress}. Contract may not be deployed.`,
        );
        console.error(
          `[getSurveyCount] Please ensure the contract is deployed and the address in contracts.ts matches the deployment.`,
        );
        return 0;
      }

      const count = (await publicClient.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getSurveyCount",
      })) as bigint;
      return Number(count);
    } catch (error: any) {
      console.error("Error getting survey count:", error);

      // Provide more helpful error messages
      if (error?.message?.includes("returned no data") || error?.message?.includes("0x")) {
        console.error(`[getSurveyCount] Contract at ${contractAddress} may not have the getSurveyCount function.`);
        console.error(`[getSurveyCount] Possible causes:`);
        console.error(`  - Contract address is incorrect`);
        console.error(`  - Contract is an old version without this function`);
        console.error(`  - Contract is not deployed at this address`);
        console.error(
          `[getSurveyCount] Please check deployments/localhost/ProductSatisfactionSurvey.json for the correct address.`,
        );
      }

      return 0;
    }
  }, [publicClient, contractDeployed, contractAddress]);

  // Get survey details
  const getSurvey = useCallback(
    async (surveyId: number): Promise<Survey | null> => {
      if (!publicClient || !contractDeployed) return null;

      try {
        const result = (await publicClient.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "getSurvey",
          args: [BigInt(surveyId)],
        })) as any[];

        // Current version (no time fields): title, description, productCount, productNames, isActive, isFinalized, admin, totalResponses
        // Returns 8 values
        if (result.length === 8) {
          return {
            title: result[0],
            description: result[1],
            productCount: result[2],
            productNames: result[3],
            createdTime: BigInt(0), // No time field, use 0 as placeholder
            endTime: BigInt(0), // No time field, use 0 as placeholder
            isActive: result[4],
            isFinalized: result[5],
            admin: result[6],
            totalResponses: result[7],
          };
        }

        console.warn("[getSurvey] Unexpected result length:", result.length);
        return null;
      } catch (error: any) {
        console.error("Error getting survey:", error);
        return null;
      }
    },
    [publicClient, contractDeployed, contractAddress],
  );

  // Check if user has submitted
  const hasUserSubmitted = useCallback(
    async (surveyId: number): Promise<boolean> => {
      if (!publicClient || !address || !contractDeployed) return false;
      try {
        const submitted = (await publicClient.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "hasUserSubmitted",
          args: [BigInt(surveyId), address],
        })) as boolean;
        return submitted;
      } catch (error) {
        console.error("Error checking submission status:", error);
        return false;
      }
    },
    [publicClient, address, contractDeployed, contractAddress],
  );

  // Create survey
  const createSurvey = async (title: string, description: string, productNames: string[]) => {
    if (!walletClient || !address || !contractDeployed) {
      toast.error("Please connect your wallet or contract not deployed");
      return false;
    }

    setIsLoading(true);
    try {
      const isLocalhost = chainId === 31337;

      if (isLocalhost) {
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "createSurvey",
          args: [title, description, productNames],
          gas: 2000000n,
        });
        await publicClient!.waitForTransactionReceipt({ hash });
      } else {
        const { request } = await publicClient!.simulateContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "createSurvey",
          args: [title, description, productNames],
          account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient!.waitForTransactionReceipt({ hash });
      }

      toast.success("Survey created successfully!");
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Error creating survey:", error);

      // Check if error is due to contract version mismatch
      let errorMessage = error?.message || error?.reason || "Failed to create survey";

      if (
        errorMessage.includes("Internal JSON-RPC error") ||
        errorMessage.includes("revert") ||
        errorMessage.includes("execution reverted")
      ) {
        errorMessage =
          "Contract execution failed. The deployed contract may be an old version that needs to be redeployed.\n\n" +
          "Please recompile and redeploy the contract:\n" +
          "1. npx hardhat compile\n" +
          "2. npx hardhat deploy --network localhost";
      }

      toast.error(errorMessage, {
        duration: 8000,
      });
      setIsLoading(false);
      return false;
    }
  };

  // Submit ratings
  const submitRatings = async (surveyId: number, ratings: number[]) => {
    if (!walletClient || !address || !zamaInstance || !contractDeployed) {
      toast.error("Please connect your wallet and wait for encryption to initialize");
      return false;
    }

    setIsLoading(true);
    try {
      if (!encrypt) {
        throw new Error("Encryption not ready");
      }

      for (const rating of ratings) {
        if (rating < 1 || rating > 5) {
          throw new Error("Rating must be between 1 and 5");
        }
      }

      if (ratings.length === 0) {
        throw new Error("At least one rating is required");
      }

      // Encrypt all ratings
      console.log("[submitRatings] Encrypting ratings...", { surveyId, ratings, contractAddress });
      const encryptedInputs = await Promise.all(ratings.map((rating) => encrypt(contractAddress, address, rating)));
      console.log("[submitRatings] Encryption complete", {
        handlesCount: encryptedInputs.length,
        proofLengths: encryptedInputs.map((e) => e.inputProof.length),
      });

      // Verify survey exists and is active before submitting
      const survey = await getSurvey(surveyId);
      if (!survey) {
        throw new Error("Survey not found");
      }
      if (!survey.isActive) {
        throw new Error("Survey is not active");
      }

      if (survey.productCount !== BigInt(ratings.length)) {
        throw new Error(`Expected ${survey.productCount} ratings, got ${ratings.length}`);
      }

      // Check if user has already submitted
      const alreadySubmitted = await hasUserSubmitted(surveyId);
      if (alreadySubmitted) {
        throw new Error("You have already submitted ratings for this survey.");
      }

      const isLocalhost = chainId === 31337;

      if (isLocalhost) {
        console.log("[submitRatings] Calling submitRatings on localhost network");
        console.log("[submitRatings] Survey status:", {
          surveyId,
          isActive: survey.isActive,
          isFinalized: survey.isFinalized,
          endTime: new Date(Number(survey.endTime) * 1000).toISOString(),
          now: new Date().toISOString(),
          alreadySubmitted,
        });
        console.log("[submitRatings] Args:", {
          surveyId,
          handles: encryptedInputs.map((e) => e.handles[0]),
          proofs: encryptedInputs.map((e) => e.inputProof.substring(0, 20) + "..."),
        });

        // Try to simulate first to catch errors early
        try {
          await publicClient!.simulateContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: "submitRatings",
            args: [
              BigInt(surveyId),
              encryptedInputs.map((e) => e.handles[0]),
              encryptedInputs.map((e) => e.inputProof),
            ],
            account: address,
          });
          console.log("[submitRatings] Simulation successful");
        } catch (simError: any) {
          console.error("[submitRatings] Simulation failed:", simError);
          // Provide better error messages based on simulation error
          if (simError.message?.includes("Survey has ended") || simError.message?.includes("has ended")) {
            throw new Error("Survey is not active. Please check the survey status.");
          }
          if (simError.message?.includes("Already submitted") || simError.message?.includes("already submitted")) {
            throw new Error("You have already submitted ratings for this survey.");
          }
          if (simError.message?.includes("still active") && !survey.isActive) {
            throw new Error("Survey is not active. Please check the survey status.");
          }
          if (simError.message?.includes("Number of ratings must match")) {
            throw new Error(`Expected ${survey.productCount} ratings, got ${ratings.length}`);
          }
          // Re-throw with original error for other cases
          throw simError;
        }

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "submitRatings",
          args: [BigInt(surveyId), encryptedInputs.map((e) => e.handles[0]), encryptedInputs.map((e) => e.inputProof)],
          gas: 5000000n,
        });
        console.log("[submitRatings] Transaction hash:", hash);
        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        console.log("[submitRatings] Transaction confirmed:", receipt.status);

        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted. Please check the survey status.");
        }
      } else {
        const { request } = await publicClient!.simulateContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "submitRatings",
          args: [BigInt(surveyId), encryptedInputs.map((e) => e.handles[0]), encryptedInputs.map((e) => e.inputProof)],
          account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient!.waitForTransactionReceipt({ hash });
      }

      toast.success("Ratings submitted successfully!");
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Error submitting ratings:", error);

      let errorMessage = error?.message || error?.reason || "Failed to submit ratings";

      // Provide more helpful error messages
      if (errorMessage.includes("Internal JSON-RPC error") || errorMessage.includes("execution reverted")) {
        errorMessage =
          "Failed to submit ratings. Possible reasons:\n" +
          "• Survey may have ended\n" +
          "• You may have already submitted\n" +
          "• FHEVM encryption error\n" +
          "• Contract execution failed\n\n" +
          "Please check the survey status and try again.";
      } else if (errorMessage.includes("Survey not found")) {
        errorMessage = "Survey not found. Please refresh and try again.";
      } else if (errorMessage.includes("not active") || errorMessage.includes("ended")) {
        errorMessage = "This survey is no longer active.";
      } else if (errorMessage.includes("Expected") && errorMessage.includes("ratings")) {
        errorMessage = errorMessage; // Keep the specific error
      } else if (errorMessage.includes("Encryption not ready") || errorMessage.includes("FHEVM")) {
        errorMessage = "Encryption system not ready. Please wait a moment and try again.";
      }

      toast.error(errorMessage, {
        duration: 6000,
      });
      setIsLoading(false);
      return false;
    }
  };

  // End survey
  const endSurvey = async (surveyId: number) => {
    if (!walletClient || !address || !contractDeployed) {
      toast.error("Please connect your wallet or contract not deployed");
      return false;
    }

    setIsLoading(true);
    try {
      // Pre-check: Verify survey exists and user is admin
      const survey = await getSurvey(surveyId);
      if (!survey) {
        throw new Error("Survey not found");
      }

      console.log("[endSurvey] Survey status:", {
        surveyId,
        isActive: survey.isActive,
        admin: survey.admin,
        currentUser: address,
        isAdmin: address.toLowerCase() === survey.admin.toLowerCase(),
      });

      if (!survey.isActive) {
        throw new Error("Survey is already ended");
      }

      if (address.toLowerCase() !== survey.admin.toLowerCase()) {
        throw new Error("Only the survey admin can end the survey");
      }

      const isLocalhost = chainId === 31337;

      if (isLocalhost) {
        // Try simulation first to catch errors early
        try {
          await publicClient!.simulateContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: "endSurvey",
            args: [BigInt(surveyId)],
            account: address,
          });
          console.log("[endSurvey] Simulation successful");
        } catch (simError: any) {
          console.error("[endSurvey] Simulation failed:", simError);
          if (simError.message?.includes("Only admin")) {
            throw new Error("Only the survey admin can end the survey");
          }
          if (simError.message?.includes("not active")) {
            throw new Error("Survey is already ended");
          }
          throw simError;
        }

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "endSurvey",
          args: [BigInt(surveyId)],
          gas: 1000000n,
        });
        console.log("[endSurvey] Transaction hash:", hash);
        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        console.log("[endSurvey] Transaction confirmed:", receipt.status);

        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted. Please check if you are the survey admin and the survey is active.");
        }
      } else {
        const { request } = await publicClient!.simulateContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "endSurvey",
          args: [BigInt(surveyId)],
          account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient!.waitForTransactionReceipt({ hash });
      }

      toast.success("Survey ended successfully!");
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Error ending survey:", error);

      let errorMessage = error?.message || error?.reason || "Failed to end survey";

      // Provide more helpful error messages
      if (errorMessage.includes("Internal JSON-RPC error") || errorMessage.includes("execution reverted")) {
        errorMessage =
          "Failed to end survey. Possible reasons:\n" +
          "• You may not be the survey admin\n" +
          "• Survey may already be ended\n" +
          "• Contract execution failed\n\n" +
          "Please check the survey status and try again.";
      } else if (errorMessage.includes("Only admin") || errorMessage.includes("admin")) {
        errorMessage = "Only the survey admin can end the survey.";
      } else if (errorMessage.includes("not active") || errorMessage.includes("already ended")) {
        errorMessage = "Survey is already ended.";
      }

      toast.error(errorMessage, {
        duration: 6000,
      });
      setIsLoading(false);
      return false;
    }
  };

  // Finalize product (request decryption)
  const finalizeProduct = async (surveyId: number, productIndex: number) => {
    if (!walletClient || !address || !contractDeployed) {
      toast.error("Please connect your wallet or contract not deployed");
      return false;
    }

    setIsLoading(true);
    try {
      // Pre-check: Verify survey exists and is ended
      const survey = await getSurvey(surveyId);
      if (!survey) {
        throw new Error("Survey not found");
      }

      console.log("[finalizeProduct] Survey status:", {
        surveyId,
        isActive: survey.isActive,
        isFinalized: survey.isFinalized,
        totalResponses: Number(survey.totalResponses),
        productCount: Number(survey.productCount),
      });

      if (survey.isActive) {
        throw new Error("Survey is still active. Please end the survey first.");
      }
      if (productIndex >= Number(survey.productCount)) {
        throw new Error(`Invalid product index. Survey has ${survey.productCount} products.`);
      }
      if (Number(survey.totalResponses) === 0) {
        throw new Error("Cannot finalize: No ratings have been submitted yet.");
      }

      console.log("[finalizeProduct] Requesting finalization", { surveyId, productIndex, isActive: survey.isActive });

      const isLocalhost = chainId === 31337;

      if (isLocalhost) {
        console.log("[finalizeProduct] Calling on localhost network");

        // Try to simulate first to catch errors early
        try {
          await publicClient!.simulateContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: "finalizeProduct",
            args: [BigInt(surveyId), BigInt(productIndex)],
            account: address,
          });
          console.log("[finalizeProduct] Simulation successful");
        } catch (simError: any) {
          console.error("[finalizeProduct] Simulation failed:", simError);
          // If simulation fails, the actual call will also fail
          // But we can provide a better error message
          if (simError.message?.includes("Survey still active")) {
            throw new Error("Survey is still active. Please end the survey first.");
          }
          if (simError.message?.includes("already finalized")) {
            throw new Error("This product has already been finalized.");
          }
          throw simError;
        }

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "finalizeProduct",
          args: [BigInt(surveyId), BigInt(productIndex)],
          gas: 2000000n,
        });
        console.log("[finalizeProduct] Transaction hash:", hash);
        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        console.log("[finalizeProduct] Transaction confirmed:", receipt.status);

        // Check if transaction failed
        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted. Please check the survey status and ensure it is ended.");
        }

        // Check for FinalizeRequested event
        const finalizeRequestedEvent = receipt.logs.find((log: any) => {
          try {
            // Try to decode as FinalizeRequested event
            // Event signature: FinalizeRequested(uint256 indexed surveyId, uint256 indexed requestId)
            return log.topics && log.topics.length >= 3;
          } catch {
            return false;
          }
        });

        if (finalizeRequestedEvent) {
          console.log("[finalizeProduct] FinalizeRequested event found:", finalizeRequestedEvent);
          // Extract requestId from event (it's in topics[2])
          const requestId = finalizeRequestedEvent.topics[2];
          console.log("[finalizeProduct] Decryption requestId:", requestId);
        } else {
          console.warn("[finalizeProduct] No FinalizeRequested event found in transaction receipt");
        }

        // On localhost, the decryption callback should happen automatically via Hardhat's FHEVM plugin
        // However, the plugin may need more time or may not be working correctly
        console.log("[finalizeProduct] Waiting for decryption callback...");
        console.log(
          "[finalizeProduct] Note: If decryption times out, the Hardhat FHEVM plugin may not be processing the callback.",
        );
        console.log("[finalizeProduct] Please ensure:");
        console.log("[finalizeProduct] 1. Hardhat node is running: npx hardhat node");
        console.log("[finalizeProduct] 2. @fhevm/hardhat-plugin is installed and configured");
        console.log("[finalizeProduct] 3. Node is running on http://localhost:8545");

        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log("[finalizeProduct] Initial wait complete, decryption callback should be processing...");
      } else {
        const { request } = await publicClient!.simulateContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "finalizeProduct",
          args: [BigInt(surveyId), BigInt(productIndex)],
          account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient!.waitForTransactionReceipt({ hash });
      }

      toast.success("Finalization requested! Results will be available after decryption.");
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Error requesting finalization:", error);

      let errorMessage = error?.message || error?.reason || "Failed to request finalization";

      // Provide more helpful error messages
      if (errorMessage.includes("Internal JSON-RPC error") || errorMessage.includes("execution reverted")) {
        errorMessage =
          "Failed to finalize product. Possible reasons:\n" +
          "• Survey may still be active (must end survey first)\n" +
          "• Product may already be finalized\n" +
          "• FHEVM decryption service error\n" +
          "• Contract execution failed\n\n" +
          "Please check the survey status and try again.";
      } else if (errorMessage.includes("still active")) {
        errorMessage = "Survey is still active. Please end the survey first before finalizing products.";
      } else if (errorMessage.includes("already finalized")) {
        errorMessage = "This product has already been finalized.";
      } else if (errorMessage.includes("Invalid product index")) {
        errorMessage = errorMessage; // Keep the specific error
      }

      toast.error(errorMessage, {
        duration: 6000,
      });
      setIsLoading(false);
      return false;
    }
  };

  // Get encrypted sum for a product
  const getEncryptedSum = async (surveyId: number, productIndex: number): Promise<string | null> => {
    if (!publicClient || !contractDeployed) {
      return null;
    }
    try {
      const encryptedSum = (await publicClient.readContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getEncryptedSum",
        args: [BigInt(surveyId), BigInt(productIndex)],
      })) as any;

      // Convert to hex string if needed
      if (typeof encryptedSum === "string") {
        return encryptedSum.toLowerCase();
      }
      return encryptedSum;
    } catch (error: any) {
      console.error("Error getting encrypted sum:", error);
      return null;
    }
  };

  // Decrypt and finalize product directly in frontend (for localhost)
  const decryptAndFinalizeProduct = async (surveyId: number, productIndex: number): Promise<boolean> => {
    if (!walletClient || !address || !contractDeployed || !zamaInstance) {
      toast.error("Missing requirements for decryption");
      return false;
    }

    const isLocalhost = chainId === 31337;
    if (!isLocalhost) {
      // On Sepolia, use the normal flow (gateway handles it)
      return await finalizeProduct(surveyId, productIndex);
    }

    setIsLoading(true);
    try {
      // Step 1: Call finalizeProduct to get requestId
      console.log("[decryptAndFinalizeProduct] Step 1: Calling finalizeProduct...");
      const finalizeHash = await walletClient.writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "finalizeProduct",
        args: [BigInt(surveyId), BigInt(productIndex)],
        gas: 2000000n,
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: finalizeHash });
      console.log("[decryptAndFinalizeProduct] Transaction receipt:", receipt);
      console.log("[decryptAndFinalizeProduct] Receipt logs count:", receipt.logs.length);

      // Extract requestId from FinalizeRequested event
      // Event: FinalizeRequested(uint256 indexed surveyId, uint256 requestId)
      // Note: surveyId is indexed (in topics[1]), requestId is NOT indexed (in data field)
      let requestId: bigint | null = null;

      try {
        const { decodeEventLog, decodeAbiParameters } = await import("viem");

        // Find the FinalizeRequested event in the logs
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i];
          console.log(`[decryptAndFinalizeProduct] Processing log ${i}:`, {
            address: log.address,
            contractAddress,
            addressMatch: log.address.toLowerCase() === contractAddress.toLowerCase(),
            topicsCount: log.topics?.length || 0,
            hasData: !!log.data && log.data !== "0x",
            dataLength: log.data?.length || 0,
          });

          if (log.address.toLowerCase() !== contractAddress.toLowerCase()) {
            continue;
          }

          try {
            const decoded = decodeEventLog({
              abi: CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            });

            console.log(`[decryptAndFinalizeProduct] Decoded event ${i}:`, {
              eventName: decoded.eventName,
              args: decoded.args,
              argsType: Array.isArray(decoded.args) ? "array" : typeof decoded.args,
            });

            if (decoded.eventName === "FinalizeRequested") {
              console.log("[decryptAndFinalizeProduct] ✅ Found FinalizeRequested event!", decoded);

              // Extract requestId from args
              if (decoded.args) {
                if (typeof decoded.args === "object" && !Array.isArray(decoded.args)) {
                  // Object form: { surveyId, requestId }
                  console.log("[decryptAndFinalizeProduct] Args as object:", decoded.args);
                  if ("requestId" in decoded.args) {
                    requestId = BigInt(decoded.args.requestId as any);
                    console.log("[decryptAndFinalizeProduct] ✅ Extracted requestId from object:", requestId);
                  } else {
                    console.warn("[decryptAndFinalizeProduct] requestId not found in object args");
                  }
                } else if (Array.isArray(decoded.args)) {
                  // Array form: [surveyId, requestId]
                  console.log("[decryptAndFinalizeProduct] Args as array:", decoded.args);
                  if (decoded.args.length >= 2) {
                    requestId = BigInt(decoded.args[1] as any);
                    console.log("[decryptAndFinalizeProduct] ✅ Extracted requestId from array:", requestId);
                  } else {
                    console.warn("[decryptAndFinalizeProduct] Array args length < 2:", decoded.args.length);
                  }
                }
              }

              if (requestId) {
                break;
              } else {
                console.warn(
                  "[decryptAndFinalizeProduct] Event found but requestId not extracted. Args:",
                  decoded.args,
                );
              }
            }
          } catch (decodeErr: any) {
            // Not the event we're looking for or decode failed
            console.log(`[decryptAndFinalizeProduct] Event ${i} decode failed:`, decodeErr.message);
            // Try to manually decode data as uint256 if it looks like our event
            if (log.data && log.data !== "0x" && log.data.length >= 66) {
              try {
                const manualDecoded = decodeAbiParameters([{ type: "uint256" }], log.data);
                console.log(`[decryptAndFinalizeProduct] Manual decode of log ${i} data:`, manualDecoded);
                // This might be the requestId, but we need to verify it's from FinalizeRequested
                // For now, we'll use it as a fallback
                if (!requestId && manualDecoded && manualDecoded.length > 0) {
                  requestId = BigInt(manualDecoded[0] as any);
                  console.log(
                    "[decryptAndFinalizeProduct] ⚠️ Using manually decoded requestId (may be incorrect):",
                    requestId,
                  );
                }
              } catch (manualErr) {
                // Ignore manual decode errors
              }
            }
            continue;
          }
        }
      } catch (err: any) {
        console.error("[decryptAndFinalizeProduct] Error extracting requestId:", err);
      }

      if (!requestId) {
        console.error("[decryptAndFinalizeProduct] ❌ Failed to extract requestId.");
        console.error(
          "[decryptAndFinalizeProduct] Receipt:",
          JSON.stringify(receipt, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2),
        );
        console.error(
          "[decryptAndFinalizeProduct] All logs details:",
          receipt.logs.map((log, i) => ({
            index: i,
            address: log.address,
            topics: log.topics,
            data: log.data,
            dataLength: log.data?.length || 0,
          })),
        );
        throw new Error("Failed to get requestId from FinalizeRequested event. Check console for detailed logs.");
      }

      console.log("[decryptAndFinalizeProduct] ✅ Successfully extracted requestId:", requestId);

      // Step 2: Get encrypted sum
      console.log("[decryptAndFinalizeProduct] Step 2: Getting encrypted sum...");
      const encryptedSumHandle = await getEncryptedSum(surveyId, productIndex);
      if (!encryptedSumHandle || encryptedSumHandle === "0x" || encryptedSumHandle.length !== 66) {
        throw new Error("Invalid encrypted sum handle");
      }
      console.log("[decryptAndFinalizeProduct] Encrypted sum handle:", encryptedSumHandle);

      // Step 3: Decrypt in frontend
      console.log("[decryptAndFinalizeProduct] Step 3: Decrypting in frontend...");
      console.log("[decryptAndFinalizeProduct] Decrypt params:", {
        handle: encryptedSumHandle,
        contractAddress,
        userAddress: address,
        chainId,
        hasZamaInstance: !!zamaInstance,
      });

      let decryptedValue: number;
      try {
        decryptedValue = await decrypt(encryptedSumHandle, contractAddress, address);
        console.log("[decryptAndFinalizeProduct] Decrypted value:", decryptedValue);

        if (typeof decryptedValue !== "number" || isNaN(decryptedValue)) {
          throw new Error(`Invalid decrypted value: ${decryptedValue}`);
        }
      } catch (decryptError: any) {
        console.error("[decryptAndFinalizeProduct] Decryption error:", decryptError);
        throw new Error(`Decryption failed: ${decryptError?.message || decryptError}`);
      }

      // Step 4: Call decryptionCallback
      console.log("[decryptAndFinalizeProduct] Step 4: Calling decryptionCallback...");
      const { encodePacked } = await import("viem");
      const sumBytes = encodePacked(["uint32"], [BigInt(decryptedValue)]);

      const callbackHash = await walletClient.writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "decryptionCallback",
        args: [requestId, sumBytes, []], // Empty signatures array for localhost
        gas: 500000n,
      });

      await publicClient!.waitForTransactionReceipt({ hash: callbackHash });
      console.log("[decryptAndFinalizeProduct] Decryption callback completed!");

      toast.success(
        `Product "${(await getSurvey(surveyId))?.productNames[productIndex]}" decrypted successfully! Sum: ${decryptedValue}`,
      );
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("[decryptAndFinalizeProduct] Error:", error);
      toast.error(error?.message || "Failed to decrypt and finalize product");
      setIsLoading(false);
      return false;
    }
  };

  // Get decrypted sum for a product
  const getDecryptedSum = useCallback(
    async (surveyId: number, productIndex: number): Promise<number | null> => {
      if (!publicClient || !contractDeployed) {
        return null;
      }

      try {
        const decryptedSum = (await publicClient.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "getDecryptedSum",
          args: [BigInt(surveyId), BigInt(productIndex)],
        })) as bigint;

        return Number(decryptedSum);
      } catch (error: any) {
        // Silently handle "Product not finalized yet" errors - this is expected
        if (error?.message?.includes("Product not finalized yet") || error?.message?.includes("not finalized")) {
          return null;
        }
        console.error("Error getting decrypted sum:", error);
        return null;
      }
    },
    [publicClient, contractDeployed, contractAddress],
  );

  // Check if survey is fully finalized
  const isSurveyFullyFinalized = useCallback(
    async (surveyId: number): Promise<boolean> => {
      if (!publicClient || !contractDeployed) {
        return false;
      }

      try {
        const finalized = (await publicClient.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "isSurveyFullyFinalized",
          args: [BigInt(surveyId)],
        })) as boolean;

        return finalized;
      } catch (error) {
        console.error("Error checking finalization status:", error);
        return false;
      }
    },
    [publicClient, contractDeployed, contractAddress],
  );

  // Mark survey as fully finalized
  const markSurveyFullyFinalized = async (surveyId: number) => {
    if (!walletClient || !address || !contractDeployed) {
      toast.error("Please connect your wallet or contract not deployed");
      return false;
    }

    setIsLoading(true);
    try {
      const isLocalhost = chainId === 31337;

      if (isLocalhost) {
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "markSurveyFullyFinalized",
          args: [BigInt(surveyId)],
          gas: 1000000n,
        });
        await publicClient!.waitForTransactionReceipt({ hash });
      } else {
        const { request } = await publicClient!.simulateContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "markSurveyFullyFinalized",
          args: [BigInt(surveyId)],
          account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient!.waitForTransactionReceipt({ hash });
      }

      toast.success("Survey marked as fully finalized!");
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Error marking survey as finalized:", error);
      toast.error(error.message || "Failed to mark survey as finalized");
      setIsLoading(false);
      return false;
    }
  };

  return {
    getSurveyCount,
    getSurvey,
    hasUserSubmitted,
    createSurvey,
    submitRatings,
    endSurvey,
    finalizeProduct,
    getEncryptedSum,
    decryptAndFinalizeProduct,
    getDecryptedSum,
    isSurveyFullyFinalized,
    markSurveyFullyFinalized,
    contractDeployed,
    isLoading: isLoading || zamaLoading,
    error: zamaLoading ? null : undefined,
  };
}
