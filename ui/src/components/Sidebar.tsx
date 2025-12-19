import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, ClipboardList, BarChart3, Home, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.svg";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/surveys", icon: ClipboardList, label: "Surveys" },
  { path: "/results", icon: BarChart3, label: "Results" },
];

export const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card border border-border shadow-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40",
          "flex flex-col shadow-xl",
          "md:translate-x-0 md:animate-none",
        )}
        style={{ transform: "translateX(-300px)" }}
      >
        <style>{`
          @media (min-width: 768px) {
            aside { transform: translateX(0) !important; }
          }
        `}</style>

        {/* Logo section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <motion.img
              src={logo}
              alt="Cipher Insights Hub"
              className="h-10 w-10"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Cipher Insights
              </h1>
              <p className="text-xs text-muted-foreground">FHE Survey Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                  "hover:bg-primary/10 hover:translate-x-1",
                  isActive && "bg-primary/15 text-primary border-l-4 border-primary",
                )}
              >
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <item.icon
                    className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
                  />
                </motion.div>
                <span className={cn("font-medium transition-colors", isActive ? "text-primary" : "text-foreground")}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-2 h-2 rounded-full bg-primary"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>FHE Protected</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
