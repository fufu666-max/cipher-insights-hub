import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, BarChart3, Lock, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useSurveyContract, Survey } from "@/hooks/useSurveyContract";
import { useState, useEffect } from "react";
import { SubmitRatingDialog } from "./SubmitRatingDialog";
import { ViewResultsDialog } from "./ViewResultsDialog";
import { motion } from "framer-motion";

interface SurveyCardProps {
  surveyId: number;
  survey: Survey;
  onUpdate: () => void;
}

export const SurveyCard = ({ surveyId, survey, onUpdate }: SurveyCardProps) => {
  const { address, isConnected } = useAccount();
  const { hasUserSubmitted, endSurvey, isSurveyFullyFinalized } = useSurveyContract();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFullyFinalized, setIsFullyFinalized] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      const adminMatch = address.toLowerCase() === survey.admin.toLowerCase();
      setIsAdmin(adminMatch);
      if (adminMatch || !adminMatch) {
        checkSubmissionStatus();
        checkFinalizationStatus();
      }
    }
  }, [isConnected, address, survey.admin]);

  const checkSubmissionStatus = async () => {
    if (!isConnected || !address) return;
    try {
      const submitted = await hasUserSubmitted(surveyId);
      setHasSubmitted(submitted);
    } catch (error) {
      console.error("Error checking submission status:", error);
      setHasSubmitted(false);
    }
  };

  const checkFinalizationStatus = async () => {
    if (!isConnected) return;
    const finalized = await isSurveyFullyFinalized(surveyId);
    setIsFullyFinalized(finalized);
  };

  const handleEndSurvey = async () => {
    setLoading(true);
    const success = await endSurvey(surveyId);
    if (success) {
      onUpdate();
    }
    setLoading(false);
  };

  const isEnded = !survey.isActive;

  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card className="h-full flex flex-col overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
        <CardHeader className="relative">
          <div className="absolute top-4 right-4">
            {survey.isActive ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
                  Active
                </Badge>
              </motion.div>
            ) : survey.isFinalized ? (
              <Badge variant="secondary">Finalized</Badge>
            ) : (
              <Badge variant="outline">Ended</Badge>
            )}
          </div>
          <CardTitle className="pr-20 line-clamp-1">{survey.title}</CardTitle>
          <CardDescription className="line-clamp-2">{survey.description}</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{Number(survey.totalResponses)} responses</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {survey.productNames.map((name, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                >
                  {name}
                </motion.span>
              ))}
            </div>
          </div>

          {isConnected ? (
            <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
              {survey.isActive && !hasSubmitted && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => setShowSubmitDialog(true)} className="w-full">
                    Submit Ratings
                  </Button>
                </motion.div>
              )}
              {survey.isActive && hasSubmitted && (
                <Button variant="outline" disabled className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Already Submitted
                </Button>
              )}
              {isEnded && isAdmin && !survey.isFinalized && (
                <>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={() => setShowResultsDialog(true)} variant="outline" className="w-full">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View & Decrypt Results
                    </Button>
                  </motion.div>
                  {!isFullyFinalized && (
                    <p className="text-xs text-muted-foreground text-center">Finalize all products to view results</p>
                  )}
                </>
              )}
              {isEnded && isAdmin && survey.isFinalized && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => setShowResultsDialog(true)} variant="default" className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Final Results
                  </Button>
                </motion.div>
              )}
              {isEnded && !isAdmin && (
                <Button variant="outline" disabled className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Results (Admin Only)
                </Button>
              )}
              {survey.isActive && isAdmin && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleEndSurvey} disabled={loading} variant="destructive" className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      "End Survey"
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          ) : (
            <Button variant="outline" disabled className="w-full">
              Connect Wallet to Participate
            </Button>
          )}
        </CardContent>

        <SubmitRatingDialog
          open={showSubmitDialog}
          onOpenChange={setShowSubmitDialog}
          surveyId={surveyId}
          survey={survey}
          onSuccess={() => {
            setShowSubmitDialog(false);
            checkSubmissionStatus();
            onUpdate();
          }}
        />

        <ViewResultsDialog
          open={showResultsDialog}
          onOpenChange={setShowResultsDialog}
          surveyId={surveyId}
          survey={survey}
          isAdmin={isAdmin}
          onSuccess={onUpdate}
        />
      </Card>
    </motion.div>
  );
};
