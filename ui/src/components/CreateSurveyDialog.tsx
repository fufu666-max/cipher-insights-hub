import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSurveyContract } from "@/hooks/useSurveyContract";
import { useState } from "react";
import { Loader2, Plus, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateSurveyDialog = ({ open, onOpenChange, onSuccess }: CreateSurveyDialogProps) => {
  const { createSurvey, isLoading } = useSurveyContract();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productNames, setProductNames] = useState<string[]>(["Product A", "Product B", "Product C"]);

  const handleAddProduct = () => {
    if (productNames.length < 5) {
      setProductNames([...productNames, `Product ${String.fromCharCode(65 + productNames.length)}`]);
    }
  };

  const handleRemoveProduct = (index: number) => {
    if (productNames.length > 2) {
      setProductNames(productNames.filter((_, i) => i !== index));
    }
  };

  const handleProductNameChange = (index: number, value: string) => {
    const newNames = [...productNames];
    newNames[index] = value;
    setProductNames(newNames);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }
    if (productNames.some((name) => !name.trim())) {
      alert("All product names must be filled");
      return;
    }
    if (productNames.length < 2) {
      alert("At least 2 products are required");
      return;
    }
    if (productNames.length > 5) {
      alert("Maximum 5 products allowed");
      return;
    }

    const trimmedProductNames = productNames.map((name) => name.trim());
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    const success = await createSurvey(trimmedTitle, trimmedDescription, trimmedProductNames);
    if (success) {
      setTitle("");
      setDescription("");
      setProductNames(["Product A", "Product B", "Product C"]);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Survey
          </DialogTitle>
          <DialogDescription>
            Create an anonymous product satisfaction survey. Users will rate each product from 1-5.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <Label htmlFor="title">Survey Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q1 2024 Product Comparison"
              required
              className="transition-all focus:ring-2 focus:ring-primary/20"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this survey..."
              rows={3}
              className="transition-all focus:ring-2 focus:ring-primary/20"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <Label>Products (2-5 required) *</Label>
              {productNames.length < 5 && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddProduct} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </motion.div>
              )}
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {productNames.map((name, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <Input
                      value={name}
                      onChange={(e) => handleProductNameChange(index, e.target.value)}
                      placeholder={`Product ${String.fromCharCode(65 + index)}`}
                      required
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                    {productNames.length > 2 && (
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduct(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end gap-2 pt-4 border-t"
          >
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Create Survey
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
