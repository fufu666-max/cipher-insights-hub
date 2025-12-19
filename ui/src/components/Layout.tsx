import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { motion } from "framer-motion";

export const Layout = () => {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        <Header />
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 container mx-auto px-4 py-8"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};
