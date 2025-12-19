import { Shield, Bell } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { useAccount, useChainId } from "wagmi";
import { getChainName } from "@/config/wagmi";

export const Header = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Shield className="h-4 w-4 text-primary" />
              </motion.div>
              <span className="text-sm font-medium text-primary">FHE Protected</span>
            </div>
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">{getChainName(chainId)}</span>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg hover:bg-muted transition-colors relative"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
            </motion.button>
            <ConnectButton showBalance={false} />
          </div>
        </div>
      </div>
    </motion.header>
  );
};
