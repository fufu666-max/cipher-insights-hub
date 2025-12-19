import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Survey, useSurveyContract } from "@/hooks/useSurveyContract";
import { useState, useEffect } from "react";
import { Loader2, Lock, BarChart3, RefreshCw, Copy, Check, Sparkles, Trophy, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface ViewResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: number;
  survey: Survey;
  isAdmin: boolean;
  onSuccess: () => void;
}

export const ViewResultsDialog = ({
  open,
  onOpenChange,
  surveyId,
  survey,
  isAdmin,
  onSuccess,
}: ViewResultsDialogProps) => {
  const {
    getDecryptedSum,
    finalizeProduct,
    decryptAndFinalizeProduct,
    isSurveyFullyFinalized,
    markSurveyFullyFinalized,
    isLoading,
  } = useSurveyContract();
  const [decryptedSums, setDecryptedSums] = useState<(number | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [finalizingIndex, setFinalizingIndex] = useState<number | null>(null);
  const [isMarkingFinalized, setIsMarkingFinalized] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [revealedProducts, setRevealedProducts] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open && isAdmin) {
      loadDecryptedSums();
    }
  }, [open, isAdmin, surveyId]);

  // Auto-refresh when dialog is open to catch manual decryptions
  useEffect(() => {
    if (!open || !isAdmin) return;

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocalhost) {
      const refreshInterval = setInterval(async () => {
        const sums: (number | null)[] = [];
        for (let i = 0; i < Number(survey.productCount); i++) {
          try {
            const sum = await getDecryptedSum(surveyId, i);
            sums.push(sum);
            if (sum !== null && sum > 0) {
              if (finalizingIndex === i) {
                setFinalizingIndex(null);
                triggerDecryptionCelebration(survey.productNames[i]);
              }
            }
          } catch (error) {
            sums.push(null);
          }
        }
        setDecryptedSums(sums);
      }, 3000);

      return () => clearInterval(refreshInterval);
    }
  }, [open, isAdmin, surveyId, survey.productCount, survey.productNames]);

  const triggerDecryptionCelebration = (productName: string) => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#6366f1", "#8b5cf6", "#a855f7"],
    });
    toast.success(`${productName} decrypted successfully!`);
  };

  const loadDecryptedSums = async () => {
    setLoading(true);
    const sums: (number | null)[] = [];
    for (let i = 0; i < Number(survey.productCount); i++) {
      try {
        const sum = await getDecryptedSum(surveyId, i);
        sums.push(sum);
        if (sum !== null && sum > 0 && finalizingIndex === i) {
          setFinalizingIndex(null);
        }
      } catch (error) {
        sums.push(null);
      }
    }
    setDecryptedSums(sums);
    setLoading(false);
  };

  const handleFinalizeProduct = async (productIndex: number) => {
    if (finalizingIndex === productIndex || isLoading) {
      return;
    }

    setFinalizingIndex(productIndex);

    try {
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (isLocalhost) {
        const success = await decryptAndFinalizeProduct(surveyId, productIndex);

        if (success) {
          await loadDecryptedSums();
          setFinalizingIndex(null);
          triggerDecryptionCelebration(survey.productNames[productIndex]);
        } else {
          setFinalizingIndex(null);
        }
      } else {
        const success = await finalizeProduct(surveyId, productIndex);

        if (success) {
          toast.success("Decryption requested. Waiting for results...");

          let attempts = 0;
          const maxAttempts = 20;
          const pollInterval = 2000;

          const pollForResults = async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            while (attempts < maxAttempts) {
              attempts++;

              try {
                const sum = await getDecryptedSum(surveyId, productIndex);
                if (sum !== null && sum > 0) {
                  triggerDecryptionCelebration(survey.productNames[productIndex]);
                  await loadDecryptedSums();
                  setFinalizingIndex(null);
                  return;
                }
              } catch (error: any) {
                // Continue polling
              }

              if (attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, pollInterval));
              }
            }

            toast.warning("Decryption is taking longer than expected. Please check again in a moment.");
            await loadDecryptedSums();
            setFinalizingIndex(null);
          };

          pollForResults();
        } else {
          setFinalizingIndex(null);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to decrypt product results");
      setFinalizingIndex(null);
    }
  };

  const handleMarkFullyFinalized = async () => {
    setLoading(true);
    setIsMarkingFinalized(true);
    const success = await markSurveyFullyFinalized(surveyId);
    setIsMarkingFinalized(false);
    if (success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const calculateAverage = (sum: number | null, totalResponses: number): number | null => {
    if (sum === null || totalResponses === 0) return null;
    return sum / totalResponses;
  };

  const copyDecryptCommand = async (productIndex: number) => {
    const command = `npx hardhat --network localhost task:decrypt-product --surveyId ${surveyId} --productIndex ${productIndex}`;
    try {
      await navigator.clipboard.writeText(command);
      setCopiedIndex(productIndex);
      toast.success("Command copied to clipboard!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error("Failed to copy command");
    }
  };

  const allFinalized = decryptedSums.every((sum) => sum !== null && sum > 0);
  const totalResponses = Number(survey.totalResponses);

  // Find winner
  const getWinnerIndex = () => {
    let maxAvg = 0;
    let winnerIdx = -1;
    decryptedSums.forEach((sum, idx) => {
      if (sum !== null && sum > 0) {
        const avg = sum / totalResponses;
        if (avg > maxAvg) {
          maxAvg = avg;
          winnerIdx = idx;
        }
      }
    });
    return winnerIdx;
  };

  const winnerIndex = getWinnerIndex();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Survey Results
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Decrypt and view the aggregated results. Each product's sum is decrypted separately."
              : "Results are only available to the survey admin."}
          </DialogDescription>
        </DialogHeader>

        {!isAdmin ? (
          <div className="text-center py-8">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Only the survey admin can view results.</p>
          </div>
        ) : loading && decryptedSums.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground mt-4">Loading results...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <AnimatePresence>
              {survey.productNames.map((productName, index) => {
                const sum = decryptedSums[index];
                const average = calculateAverage(sum, totalResponses);
                const isFinalized = sum !== null && sum > 0;
                const isCurrentlyFinalizing = finalizingIndex === index;
                const isWinner = isFinalized && index === winnerIndex && allFinalized;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className={`overflow-hidden transition-all duration-300 ${
                        isWinner ? "ring-2 ring-yellow-500 bg-gradient-to-r from-yellow-500/10 to-amber-500/10" : ""
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {productName}
                            {isWinner && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 500 }}
                              >
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              </motion.div>
                            )}
                          </CardTitle>
                          {isFinalized ? (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-sm text-green-600 font-medium flex items-center gap-1"
                            >
                              <Sparkles className="h-4 w-4" />
                              Decrypted
                            </motion.span>
                          ) : (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Encrypted
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {isFinalized ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Total Sum</p>
                                <p className="text-xl font-bold text-primary">{sum}</p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Responses</p>
                                <p className="text-xl font-bold">{totalResponses}</p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Average</p>
                                <div className="flex items-center justify-center gap-1">
                                  <p className="text-xl font-bold text-accent">
                                    {average !== null ? average.toFixed(2) : "N/A"}
                                  </p>
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Rating Scale</span>
                                <span>{average !== null ? `${average.toFixed(2)}/5.00` : ""}</span>
                              </div>
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                style={{ originX: 0 }}
                              >
                                <Progress
                                  value={average !== null ? (average / 5) * 100 : 0}
                                  className={`h-3 ${isWinner ? "[&>div]:bg-yellow-500" : ""}`}
                                />
                              </motion.div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              This product's ratings are still encrypted. Click below to decrypt.
                            </p>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleFinalizeProduct(index);
                                }}
                                disabled={isLoading || finalizingIndex === index || loading}
                                variant="outline"
                                className="w-full group"
                              >
                                {finalizingIndex === index ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Decrypting...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-4 w-4 group-hover:hidden" />
                                    <Sparkles className="mr-2 h-4 w-4 hidden group-hover:block text-primary" />
                                    Decrypt Product Results
                                  </>
                                )}
                              </Button>
                            </motion.div>
                            {isCurrentlyFinalizing && !isFinalized && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="space-y-2 p-3 bg-muted rounded-lg border"
                              >
                                {window.location.hostname === "localhost" ||
                                window.location.hostname === "127.0.0.1" ? (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                                    <p className="font-semibold mb-2">Localhost Decryption Required</p>
                                    <p className="mb-2 text-[11px]">
                                      On localhost, decryption requires a manual command:
                                    </p>
                                    <div className="bg-background p-2 rounded border mb-2 relative">
                                      <code className="text-[10px] break-all font-mono block pr-8">
                                        npx hardhat --network localhost task:decrypt-product --surveyId {surveyId}{" "}
                                        --productIndex {index}
                                      </code>
                                      <Button
                                        onClick={() => copyDecryptCommand(index)}
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6"
                                        title="Copy command to clipboard"
                                      >
                                        {copiedIndex === index ? (
                                          <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                    <Button
                                      onClick={async () => {
                                        await loadDecryptedSums();
                                        toast.info("Results refreshed");
                                      }}
                                      variant="secondary"
                                      size="sm"
                                      className="w-full mt-2"
                                      disabled={loading}
                                    >
                                      <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                                      Refresh Results Now
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs text-muted-foreground text-center">
                                      Processing decryption request... This may take 10-30 seconds.
                                    </p>
                                    <Button
                                      onClick={async () => {
                                        await loadDecryptedSums();
                                        toast.info("Results refreshed");
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="w-full"
                                      disabled={loading}
                                    >
                                      <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                                      Refresh Results
                                    </Button>
                                  </>
                                )}
                              </motion.div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {allFinalized && !survey.isFinalized && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t">
                <Button
                  onClick={handleMarkFullyFinalized}
                  disabled={isLoading || isMarkingFinalized}
                  className="w-full"
                  size="lg"
                >
                  {isLoading || isMarkingFinalized ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Mark Survey as Fully Finalized
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
