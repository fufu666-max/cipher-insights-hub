import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, BarChart3, Users, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useSurveyContract } from "@/hooks/useSurveyContract";
import { useEffect, useState } from "react";

const features = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "All survey responses are encrypted using Fully Homomorphic Encryption (FHE) technology.",
  },
  {
    icon: Shield,
    title: "Privacy Preserved",
    description: "Individual responses remain completely anonymous and private throughout the process.",
  },
  {
    icon: BarChart3,
    title: "Secure Analytics",
    description: "Aggregate results are computed on encrypted data without exposing individual votes.",
  },
  {
    icon: Users,
    title: "Decentralized",
    description: "Built on blockchain technology for transparency and immutability.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const Index = () => {
  const { isConnected } = useAccount();
  const { getSurveyCount, contractDeployed } = useSurveyContract();
  const [surveyCount, setSurveyCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      if (contractDeployed) {
        const count = await getSurveyCount();
        setSurveyCount(count);
      }
    };
    loadCount();
  }, [contractDeployed, getSurveyCount]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12">
      {/* Hero Section */}
      <motion.section variants={itemVariants} className="text-center py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Powered by FHE Technology</span>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Anonymous Surveys
          </span>
          <br />
          <span className="text-foreground">with Privacy Guaranteed</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Create and participate in product satisfaction surveys where your responses are encrypted and private. Only
          aggregate results are revealed.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {isConnected ? (
            <>
              <Link to="/surveys">
                <Button size="lg" className="gap-2 group">
                  View Surveys
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Connect your wallet to get started</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Supports Localhost & Sepolia networks</span>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* Stats Section */}
      {isConnected && contractDeployed && (
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="text-4xl font-bold text-primary mb-2"
              >
                {surveyCount}
              </motion.div>
              <p className="text-muted-foreground">Active Surveys</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="pt-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                className="text-4xl font-bold text-accent mb-2"
              >
                100%
              </motion.div>
              <p className="text-muted-foreground">Privacy Protected</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-chart-emerald/10 to-chart-emerald/5 border-chart-emerald/20">
            <CardContent className="pt-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                className="text-4xl font-bold text-chart-emerald mb-2"
              >
                FHE
              </motion.div>
              <p className="text-muted-foreground">Encryption Standard</p>
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* Features Section */}
      <motion.section variants={itemVariants}>
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose Cipher Insights?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow border-border/50 hover:border-primary/30">
                <CardHeader>
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4"
                  >
                    <feature.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        variants={itemVariants}
        className="text-center py-12 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20"
      >
        <h2 className="text-2xl font-bold mb-4">Ready to Create Your First Survey?</h2>
        <p className="text-muted-foreground mb-6">
          Start collecting anonymous feedback with complete privacy protection.
        </p>
        <Link to="/surveys">
          <Button size="lg" className="gap-2 group">
            Get Started
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </motion.section>
    </motion.div>
  );
};

export default Index;
