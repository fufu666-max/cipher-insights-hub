import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, ClipboardList, TrendingUp, Activity, PieChart, Loader2, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { useSurveyContract, Survey } from "@/hooks/useSurveyContract";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface DashboardStats {
  totalSurveys: number;
  activeSurveys: number;
  endedSurveys: number;
  finalizedSurveys: number;
  totalResponses: number;
  averageResponsesPerSurvey: number;
  surveysByStatus: { name: string; value: number; color: string }[];
  responseDistribution: { name: string; responses: number }[];
  productRatings: { product: string; average: number; total: number }[];
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

const COLORS = [
  "hsl(var(--chart-emerald))",
  "hsl(var(--chart-orange))",
  "hsl(var(--chart-cyan))",
  "hsl(var(--chart-amber))",
  "hsl(var(--chart-violet))",
];

const Dashboard = () => {
  const { isConnected } = useAccount();
  const { getSurveyCount, getSurvey, getDecryptedSum, contractDeployed } = useSurveyContract();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    endedSurveys: 0,
    finalizedSurveys: 0,
    totalResponses: 0,
    averageResponsesPerSurvey: 0,
    surveysByStatus: [],
    responseDistribution: [],
    productRatings: [],
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!contractDeployed || !isConnected) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const count = await getSurveyCount();
        const surveys: { id: number; data: Survey }[] = [];

        let activeSurveys = 0;
        let endedSurveys = 0;
        let finalizedSurveys = 0;
        let totalResponses = 0;
        const responseDistribution: { name: string; responses: number }[] = [];
        const productRatingsMap: Map<string, { total: number; count: number; sum: number }> = new Map();

        for (let i = 0; i < count; i++) {
          const survey = await getSurvey(i);
          if (survey) {
            surveys.push({ id: i, data: survey });

            const responses = Number(survey.totalResponses);
            totalResponses += responses;

            if (survey.isActive) {
              activeSurveys++;
            } else if (survey.isFinalized) {
              finalizedSurveys++;
            } else {
              endedSurveys++;
            }

            responseDistribution.push({
              name: survey.title.length > 15 ? survey.title.substring(0, 15) + "..." : survey.title,
              responses,
            });

            // Get decrypted sums for finalized surveys
            if (survey.isFinalized || !survey.isActive) {
              for (let j = 0; j < Number(survey.productCount); j++) {
                try {
                  const decryptedSum = await getDecryptedSum(i, j);
                  if (decryptedSum !== null && decryptedSum > 0 && responses > 0) {
                    const productName = survey.productNames[j];
                    const average = decryptedSum / responses;

                    if (productRatingsMap.has(productName)) {
                      const existing = productRatingsMap.get(productName)!;
                      existing.total += decryptedSum;
                      existing.count += responses;
                      existing.sum += average;
                    } else {
                      productRatingsMap.set(productName, { total: decryptedSum, count: responses, sum: average });
                    }
                  }
                } catch (e) {
                  // Product not finalized yet
                }
              }
            }
          }
        }

        const productRatings = Array.from(productRatingsMap.entries()).map(([product, data]) => ({
          product,
          average: Number((data.total / data.count).toFixed(2)),
          total: data.total,
        }));

        setStats({
          totalSurveys: count,
          activeSurveys,
          endedSurveys,
          finalizedSurveys,
          totalResponses,
          averageResponsesPerSurvey: count > 0 ? Number((totalResponses / count).toFixed(1)) : 0,
          surveysByStatus: [
            { name: "Active", value: activeSurveys, color: COLORS[0] },
            { name: "Ended", value: endedSurveys, color: COLORS[1] },
            { name: "Finalized", value: finalizedSurveys, color: COLORS[2] },
          ],
          responseDistribution,
          productRatings,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [contractDeployed, isConnected]);

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground">Please connect your wallet to view the dashboard</p>
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
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Real-time statistics from the blockchain</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Surveys" value={stats.totalSurveys} icon={ClipboardList} color="primary" delay={0} />
        <StatCard title="Active Surveys" value={stats.activeSurveys} icon={Activity} color="emerald" delay={0.1} />
        <StatCard title="Total Responses" value={stats.totalResponses} icon={Users} color="accent" delay={0.2} />
        <StatCard
          title="Avg Responses"
          value={stats.averageResponsesPerSurvey}
          icon={TrendingUp}
          color="amber"
          delay={0.3}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Survey Status Pie Chart */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Survey Status Distribution
              </CardTitle>
              <CardDescription>Breakdown of surveys by current status</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.surveysByStatus.some((s) => s.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={stats.surveysByStatus.filter((s) => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {stats.surveysByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No survey data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Response Distribution Bar Chart */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Responses by Survey
              </CardTitle>
              <CardDescription>Number of responses per survey</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.responseDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.responseDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar
                      dataKey="responses"
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No response data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Product Ratings Chart */}
      {stats.productRatings.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Product Average Ratings
              </CardTitle>
              <CardDescription>Average satisfaction scores from finalized surveys (1-5 scale)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.productRatings}>
                  <defs>
                    <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="product" stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="average"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorAverage)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: "primary" | "emerald" | "accent" | "amber";
  delay: number;
}

const StatCard = ({ title, value, icon: Icon, color, delay }: StatCardProps) => {
  const colorClasses = {
    primary: "text-primary bg-primary/10 border-primary/20",
    emerald: "text-chart-emerald bg-chart-emerald/10 border-chart-emerald/20",
    accent: "text-accent bg-accent/10 border-accent/20",
    amber: "text-chart-amber bg-chart-amber/10 border-chart-amber/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -5 }}
    >
      <Card className={`border ${colorClasses[color].split(" ")[2]}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
                className={`text-3xl font-bold ${colorClasses[color].split(" ")[0]}`}
              >
                {value}
              </motion.p>
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color].split(" ")[1]}`}>
              <Icon className={`h-6 w-6 ${colorClasses[color].split(" ")[0]}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Dashboard;
