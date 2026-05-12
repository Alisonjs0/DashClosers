"use client";

import { useDashboardContext } from "@/lib/contexts/DashboardContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { clsx } from "clsx";

export default function AuthGuard({ children }) {
  const { user, isSidebarCollapsed } = useDashboardContext();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, pathname, router, mounted]);

  if (!mounted) return null;

  // No login page, just render children
  if (pathname === "/login") return children;

  // Not logged in yet (and not on login page), show nothing (redirect will happen)
  if (!user) return null;

  // Protect Admin routes from CS
  const adminRoutes = ["/analise", "/configuracoes", "/panorama", "/dores", "/closers"];
  if (user.role === "CS") {
    if (adminRoutes.some(route => pathname.startsWith(route)) || pathname === "/") {
      router.push("/historico-cs");
      return null;
    }
  }

  // Protect CS routes from Admin (Optional, but cleaner)
  if (user.role === "ADMIN" && pathname === "/historico-cs") {
    router.push("/");
    return null;
  }

  return (
    <div className="flex min-h-screen relative w-full overflow-hidden bg-[#020617] m-0 p-0">
      <Sidebar />
      <main className={clsx(
        "flex-1 transition-all duration-500 relative z-10 w-full min-w-0 bg-[#020617] p-0 m-0",
        isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <div className="w-full h-full p-0 m-0 animate-fade-in flex flex-col">
          {children}
        </div>
      </main>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_100%)] pointer-events-none" />
    </div>
  );
}
