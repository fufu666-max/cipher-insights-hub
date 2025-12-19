import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Survey, useSurveyContract } from "@/hooks/useSurveyContract";
import { useState } from "react";
import { Loader2, Lock, Star, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface SubmitRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: number;
  survey: Survey;
  onSuccess: () => void;
}

const ratingLabels = [
  { value: 1, label: "Very Unsatisfied", emoji: "😞" },
  { value: 2, label: "Unsatisfied", emoji: "😕" },
  { value: 3, label: "Neutral", emoji: "😐" },
  { value: 4, label: "Satisfied", emoji: "😊" },
  { value: 5, label: "Very Satisfied", emoji: "😄" },
];

export const SubmitRatingDialog = ({ open, onOpenChange, surveyId, survey, onSuccess }: SubmitRatingDialogProps) => {
  const { submitRatings, isLoading } = useSurveyContract();
  const [ratings, setRatings] = useState<number[]>(Array(Number(survey.productCount)).fill(3));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (ratings.some((r) => r < 1 || r > 5)) {
      alert("All ratings must be between 1 and 5");
      return;
    }

    if (ratings.length !== Number(survey.productCount)) {
      alert(`Please rate all ${survey.productCount} products`);
      return;
    }

    setIsSubmitting(true);
    const success = await submitRatings(surveyId, ratings);
    setIsSubmitting(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
      setRatings(Array(Number(survey.productCount)).fill(3));
    }
  };

  const updateRating = (index: number, value: number[]) => {
    const newRatings = [...ratings];
    newRatings[index] = value[0];
    setRatings(newRatings);
  };

  const getRatingInfo = (rating: number) => {
    return ratingLabels.find((r) => r.value === rating) || ratingLabels[2];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Submit Ratings
          </DialogTitle>
          <DialogDescription>
            Rate each product from 1 (Very Unsatisfied) to 5 (Very Satisfied). Your ratings are encrypted before
            submission.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4"
        >
          <Shield className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Your ratings will be encrypted using FHE technology before submission
          </p>
        </motion.div>

        <div className="space-y-6 py-4">
          {survey.productNames.map((productName, index) => {
            const ratingInfo = getRatingInfo(ratings[index]);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-4 p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor={`rating-${index}`} className="text-base font-semibold">
                    {productName}
                  </Label>
                  <motion.div
                    key={ratings[index]}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-2xl">{ratingInfo.emoji}</span>
                    <span className="text-sm font-medium text-muted-foreground">{ratingInfo.label}</span>
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <Slider
                    id={`rating-${index}`}
                    min={1}
                    max={5}
                    step={1}
                    value={[ratings[index]]}
                    onValueChange={(value) => updateRating(index, value)}
                    className="w-full"
                  />
                  <div className="flex justify-between">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        type="button"
                        onClick={() => updateRating(index, [star])}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            star <= ratings[index] ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end gap-2 pt-4 border-t"
        >
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSubmit} disabled={isLoading || isSubmitting} className="gap-2">
              {isLoading || isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Encrypting & Submitting...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Submit Encrypted Ratings
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
