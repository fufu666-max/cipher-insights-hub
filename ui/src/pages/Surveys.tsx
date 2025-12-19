import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SurveyCard } from "@/components/SurveyCard";
import { CreateSurveyDialog } from "@/components/CreateSurveyDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, AlertCircle, RefreshCw, Search, Filter, ClipboardList } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useSurveyContract, Survey } from "@/hooks/useSurveyContract";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const Surveys = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { getSurveyCount, getSurvey, contractDeployed } = useSurveyContract();
  const [surveys, setSurveys] = useState<{ id: number; data: Survey }[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<{ id: number; data: Survey }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended" | "finalized">("all");

  const isWrongNetwork = isConnected && chainId !== 31337 && !contractDeployed;

  const loadSurveys = async () => {
    if (!contractDeployed) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const count = await getSurveyCount();
      if (count === 0) {
        setSurveys([]);
        setFilteredSurveys([]);
        setLoading(false);
        return;
      }

      const loadedSurveys: { id: number; data: Survey }[] = [];

      for (let i = 0; i < count; i++) {
        const survey = await getSurvey(i);
        if (survey) {
          loadedSurveys.push({ id: i, data: survey });
        }
      }

      setSurveys(loadedSurveys);
      setFilteredSurveys(loadedSurveys);
    } catch (error) {
      console.error("Error loading surveys:", error);
      toast.error("Failed to load surveys. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && contractDeployed) {
      loadSurveys();
    } else {
      setSurveys([]);
      setFilteredSurveys([]);
      setLoading(false);
    }
  }, [isConnected, contractDeployed]);

  useEffect(() => {
    let filtered = surveys;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.data.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.data.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => {
        if (statusFilter === "active") return s.data.isActive;
        if (statusFilter === "ended") return !s.data.isActive && !s.data.isFinalized;
        if (statusFilter === "finalized") return s.data.isFinalized;
        return true;
      });
    }

    setFilteredSurveys(filtered);
  }, [searchQuery, statusFilter, surveys]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Product Satisfaction Surveys</h1>
          <p className="text-muted-foreground">Anonymous product comparison surveys powered by FHE technology</p>
        </div>
        {isConnected && contractDeployed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2 group">
              <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
              Create Survey
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Filters */}
      {isConnected && contractDeployed && surveys.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search surveys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Surveys</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="finalized">Finalized</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadSurveys} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>
      )}

      {/* Content */}
      {!isConnected ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Please connect your wallet to view surveys</p>
          <div className="text-xs text-muted-foreground bg-primary/5 p-4 rounded-lg mt-4 max-w-md mx-auto">
            <strong>Note:</strong> This app uses Fully Homomorphic Encryption (FHE) for secure, anonymous surveys. All
            ratings are encrypted before submission and remain private.
          </div>
        </motion.div>
      ) : !contractDeployed ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{isWrongNetwork ? "Wrong Network" : "Contract Not Deployed"}</h3>
          <p className="text-muted-foreground mb-4">
            {isWrongNetwork
              ? `You're connected to Chain ID ${chainId}, but the contract is deployed on localhost (Chain ID: 31337).`
              : "The survey contract is not deployed on this network."}
          </p>
          <div className="text-sm text-muted-foreground space-y-2">
            {isWrongNetwork ? (
              <>
                <p>
                  <strong>Current Network:</strong> Chain ID {chainId}
                </p>
                <p>
                  <strong>Required Network:</strong> Localhost (Chain ID: 31337)
                </p>
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      try {
                        switchChain({ chainId: 31337 });
                      } catch (error) {
                        toast.error("Failed to switch network. Please switch manually in your wallet.");
                      }
                    }}
                    className="mb-4"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Switch to Localhost Network
                  </Button>
                </div>
                <p className="text-xs mt-4">
                  <strong>Don't have localhost network?</strong> Add it to your wallet:
                </p>
                <code className="block bg-muted p-2 rounded mt-2 text-left text-xs">
                  Network Name: Localhost 8545
                  <br />
                  RPC URL: http://localhost:8545
                  <br />
                  Chain ID: 31337
                  <br />
                  Currency Symbol: ETH
                </code>
              </>
            ) : (
              <>
                <p>
                  <strong>Current Network:</strong> Chain ID {chainId}
                </p>
                <p className="mt-4">To deploy the contract:</p>
                <code className="block bg-muted p-2 rounded mt-2 text-left">
                  # Terminal 1: Start Hardhat node
                  <br />
                  npx hardhat node
                  <br />
                  <br />
                  # Terminal 2: Deploy contract
                  <br />
                  npx hardhat deploy --network localhost
                </code>
              </>
            )}
          </div>
        </motion.div>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredSurveys.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            {surveys.length === 0 ? "No surveys found. Create the first one!" : "No surveys match your filters."}
          </p>
          {surveys.length === 0 && (
            <Button onClick={() => setShowCreateDialog(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create Survey
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredSurveys.map((survey, index) => (
              <motion.div
                key={survey.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <SurveyCard surveyId={survey.id} survey={survey.data} onUpdate={loadSurveys} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateSurveyDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={loadSurveys} />
    </motion.div>
  );
};

export default Surveys;
