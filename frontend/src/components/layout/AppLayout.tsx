import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { collapsed } = useSidebar();
  const isMobile = useIsMobile();
  const sidebarCollapsed = collapsed || isMobile;
  
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main
        className={`min-w-0 transition-all duration-300 p-6 lg:p-8 ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default AppLayout;