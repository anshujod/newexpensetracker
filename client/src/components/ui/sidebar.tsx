import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ThemeToggle from "@/components/theme-toggle";
import { Menu, DollarSign, BarChart4, PieChart, Wallet, Settings, Repeat } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  active: boolean;
  onClick?: () => void;
}

const NavItem = ({ href, icon, title, active, onClick }: NavItemProps) => (
  <li>
    <Link href={href}>
      <a
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded-md",
          active && "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-slate-700/50"
        )}
      >
        {icon}
        <span>{title}</span>
      </a>
    </Link>
  </li>
);

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Track window resize to determine if mobile view
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);
  
  // Close mobile sidebar when navigating
  const closeMobileSidebar = () => {
    if (isMobile) setIsOpen(false);
  };
  
  // Get user's initials for avatar fallback
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.username?.substring(0, 2).toUpperCase() || "U";
  };
  
  const navigationItems = [
    { href: "/", icon: <DollarSign className="h-4 w-4" />, title: "Dashboard" },
    { href: "/transactions", icon: <Wallet className="h-4 w-4" />, title: "Transactions" },
    { href: "/reports", icon: <BarChart4 className="h-4 w-4" />, title: "Reports" },
    { href: "/budgets", icon: <PieChart className="h-4 w-4" />, title: "Budgets" },
    { href: "/settings", icon: <Settings className="h-4 w-4" />, title: "Settings" }
  ];
  
  const sidebarContent = (
    <>
      <div className="p-4 flex justify-between items-center md:justify-start md:flex-col md:items-start">
        <div className="flex items-center gap-2 font-semibold text-xl mb-6">
          <DollarSign className="h-6 w-6 text-primary" />
          <span>ExpenseTracker</span>
        </div>
      </div>
      
      <nav className="md:block">
        <ul className="space-y-1 p-2">
          {navigationItems.map((item) => (
            <NavItem 
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              active={location === item.href}
              onClick={closeMobileSidebar}
            />
          ))}
        </ul>
      </nav>
      
      <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-700 hidden md:block">
        <div className="flex items-center gap-2 mb-8">
          <Avatar>
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user?.firstName || user?.username}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
          </div>
        </div>
        
        <ThemeToggle />
      </div>
    </>
  );
  
  return (
    <>
      {/* Mobile Sidebar */}
      {isMobile ? (
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-2 font-semibold text-xl">
            <DollarSign className="h-6 w-6 text-primary" />
            <span>ExpenseTracker</span>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] p-0">
              <div className="h-full flex flex-col">
                {sidebarContent}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        // Desktop Sidebar
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 flex flex-col">
          {sidebarContent}
        </aside>
      )}
    </>
  );
}
