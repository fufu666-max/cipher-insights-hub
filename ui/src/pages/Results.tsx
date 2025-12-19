import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Loader2, AlertCircle, Star, Award, Sparkles, Lock, BarChart3, RefreshCw } from "lucide-react";
import { useAccount } from "wagmi";
import { useSurveyContract, Survey } from "@/hooks/useSurveyContract";
import confetti from "canvas-confetti";

interface ProductResult {
  surveyId: number;
  surveyTitle: string;
  productName: string;
  productIndex: number;
  decryptedSum: number;
  totalResponses: number;
  average: number;
  isWinner: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Results = () => {
  const { isConnected, address } = useAccount();
  const { getSurveyCount, getSurvey, getDecryptedSum, contractDeployed } = useSurveyContract();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Map<number, ProductResult[]>>(new Map());
  const [surveys, setSurveys] = useState<{ id: number; data: Survey }[]>([]);
  const [revealedSurveys, setRevealedSurveys] = useState<Set<number>>(new Set());

  const loadResults = useCallback(async () => {
    if (!contractDeployed || !isConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const count = await getSurveyCount();
      const loadedSurveys: { id: number; data: Survey }[] = [];
      const resultsMap = new Map<number, ProductResult[]>();

      for (let i = 0; i < count; i++) {
        const survey = await getSurvey(i);
        if (survey && (!survey.isActive || survey.isFinalized)) {
          loadedSurveys.push({ id: i, data: survey });

          const productResults: ProductResult[] = [];
          let maxAverage = 0;

          // First pass: get all results and find max
          for (let j = 0; j < Number(survey.productCount); j++) {
            try {
              const decryptedSum = await getDecryptedSum(i, j);
              if (decryptedSum !== null && decryptedSum > 0) {
                const totalResponses = Number(survey.totalResponses);
                const average = totalResponses > 0 ? decryptedSum / totalResponses : 0;

                if (average > maxAverage) {
                  maxAverage = average;
                }

                productResults.push({
                  surveyId: i,
                  surveyTitle: survey.title,
                  productName: survey.productNames[j],
                  productIndex: j,
                  decryptedSum,
                  totalResponses,
                  average,
                  isWinner: false,
                });
              }
            } catch (e) {
              // Product not finalized yet
            }
          }

          // Second pass: mark winners
          productResults.forEach((result) => {
            if (result.average === maxAverage && maxAverage > 0) {
              result.isWinner = true;
            }
          });

          if (productResults.length > 0) {
            resultsMap.set(i, productResults);
          }
        }
      }

      setSurveys(loadedSurveys);
      setResults(resultsMap);
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  }, [contractDeployed, isConnected, getSurveyCount, getSurvey, getDecryptedSum]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleReveal = (surveyId: number) => {
    setRevealedSurveys((prev) => new Set([...prev, surveyId]));

    // Trigger confetti for winner reveal
    const surveyResults = results.get(surveyId);
    if (surveyResults?.some((r) => r.isWinner)) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef"],
      });
    }
  };

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground">Please connect your wallet to view results</p>
      </motion.div>
    );
  }

  if (!contractDeployed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Contract Not Deployed</h2>
        <p className="text-muted-foreground">The survey contract is not deployed on this network</p>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Survey Results</h1>
          <p className="text-muted-foreground">Decrypted results from finalized surveys</p>
        </div>
        <Button variant="outline" onClick={loadResults} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {surveys.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Results Available</h3>
          <p className="text-muted-foreground">Results will appear here once surveys are ended and decrypted</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {surveys.map((survey) => {
            const surveyResults = results.get(survey.id) || [];
            const isRevealed = revealedSurveys.has(survey.id);
            const hasResults = surveyResults.length > 0;
            const isAdmin = address?.toLowerCase() === survey.data.admin.toLowerCase();

            return (
              <motion.div key={survey.id} variants={itemVariants} layout>
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {survey.data.title}
                          {survey.data.isFinalized && (
                            <Badge variant="secondary" className="ml-2">
                              Finalized
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {survey.data.totalResponses.toString()} responses
                        </CardDescription>
                      </div>
                      {!hasResults && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Awaiting Decryption
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {!hasResults ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Results are still encrypted</p>
                        {isAdmin && <p className="text-sm mt-2">Go to Surveys page to decrypt the results</p>}
                      </div>
                    ) : !isRevealed ? (
                      <motion.div className="text-center py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: "easeInOut",
                          }}
                          className="inline-block mb-4"
                        >
                          <Trophy className="h-16 w-16 text-yellow-500" />
                        </motion.div>
                        <h3 className="text-xl font-bold mb-4">Results Ready!</h3>
                        <Button onClick={() => handleReveal(survey.id)} className="gap-2 group" size="lg">
                          <Sparkles className="h-4 w-4 group-hover:animate-spin" />
                          Reveal Winner
                        </Button>
                      </motion.div>
                    ) : (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-4"
                        >
                          {surveyResults
                            .sort((a, b) => b.average - a.average)
                            .map((result, index) => (
                              <motion.div
                                key={result.productIndex}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.2 }}
                              >
                                <ResultCard result={result} rank={index + 1} />
                              </motion.div>
                            ))}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

interface ResultCardProps {
  result: ProductResult;
  rank: number;
}

const ResultCard = ({ result, rank }: ResultCardProps) => {
  const percentage = (result.average / 5) * 100;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-lg border ${
        result.isWinner
          ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
            rank === 1
              ? "bg-yellow-500 text-white"
              : rank === 2
                ? "bg-gray-400 text-white"
                : rank === 3
                  ? "bg-amber-700 text-white"
                  : "bg-muted text-muted-foreground"
          }`}
        >
          {result.isWinner ? (
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
              <Trophy className="h-6 w-6" />
            </motion.div>
          ) : (
            <span className="font-bold">#{rank}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{result.productName}</h4>
            {result.isWinner && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                <Badge className="bg-yellow-500 text-white gap-1">
                  <Award className="h-3 w-3" />
                  Winner
                </Badge>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Sum: {result.decryptedSum}</span>
            <span>Responses: {result.totalResponses}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(result.average) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold">
            {result.average.toFixed(2)}
          </motion.p>
        </div>
      </div>

      <div className="mt-3">
        <Progress value={percentage} className={`h-2 ${result.isWinner ? "[&>div]:bg-yellow-500" : ""}`} />
      </div>
    </motion.div>
  );
};

export default Results;
