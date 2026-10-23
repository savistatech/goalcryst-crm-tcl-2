"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  UploadCloud,
  ListChecks,
  BarChart3,
  Users as UsersIcon,
  Settings,
  Search,
  Bell,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Database,
  GitBranch,
  Lock
} from "lucide-react";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import { createClient } from "@/utils/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dynamic user details parsed from active cookie
  const [currentUser, setCurrentUser] = useState({
    name: "Loading...",
    role: "Employee",
    scope: "Loading profile...",
    avatar: "??"
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Permission map resolved from server
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [permsLoaded, setPermsLoaded] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");

  const applyTheme = (mode: "light" | "dark" | "system") => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.add("light");
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      const timer = setTimeout(() => {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setTheme("dark");
      applyTheme("dark");
    }
  }, []);

  const handleThemeToggle = () => {
    let nextTheme: "light" | "dark" | "system" = "dark";
    if (theme === "dark") nextTheme = "light";
    else if (theme === "light") nextTheme = "system";
    else nextTheme = "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      let role = "Employee";
      
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) {
          role = profile.role;
          const initials = profile.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
          
          setCurrentUser({
            name: profile.full_name,
            role: profile.role,
            scope: role === "Admin" ? "All regions · All permissions" : "Restricted",
            avatar: initials
          });
        }
      } else {
        router.push("/login");
        return;
      }

      // Admins bypass all permission checks — grant full access instantly
      if (role === "Admin") {
        setPerms({ _superAdmin: true } as Record<string, boolean>);
        setPermsLoaded(true);
        return;
      }

      // Fetch resolved permission map from server action for all other roles
      try {
        const { getCurrentUserPermissions } = await import("@/app/actions/userActions");
        const resolvedPerms = await getCurrentUserPermissions();
        setPerms(resolvedPerms);
      } catch (err) {
        console.error("Failed to resolve permission map:", err);
        setPerms({});
      } finally {
        setPermsLoaded(true);
      }
    };
    
    fetchUser();
  }, [router]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Nav items — each declares a `requiredPermission` key (null = always visible)
  const allNavItems = [
    { label: "Overview", path: "/", icon: LayoutDashboard, section: "Main", badge: undefined, requiredPermission: null },
    { label: "Search", path: "/search", icon: Search, section: "Main", badge: undefined, requiredPermission: "can_search_customer" },
    { label: "Follow-ups", path: "/ptp", icon: CalendarCheck, section: "Main", badge: undefined, requiredPermission: "can_add_disposition" },
    {
      label: "Waivers",
      path: "/waivers", icon: ShieldCheck, section: "Main", badge: undefined, requiredPermission: "can_raise_waiver"
    },
    { label: "Bulk Import", path: "/imports", icon: UploadCloud, section: "Admin", badge: undefined, requiredPermission: "can_upload_excel" },
    { label: "Contracts", path: "/contracts", icon: Database, section: "Admin", badge: undefined, requiredPermission: "can_manage_users" },
    { label: "Reports", path: "/reports", icon: BarChart3, section: "Admin", badge: undefined, requiredPermission: "can_export_reports" },
    { label: "Users", path: "/users", icon: UsersIcon, section: "Admin", badge: undefined, requiredPermission: "can_manage_users" },
    { label: "Org Chart", path: "/org", icon: GitBranch, section: "Admin", badge: undefined, requiredPermission: null },
    { label: "Audits", path: "/audit", icon: ListChecks, section: "Admin", badge: undefined, requiredPermission: "can_view_audit_logs" },
    { label: "Dispositions Setup", path: "/settings/dispositions", icon: Settings, section: "Admin", badge: undefined, requiredPermission: "_superAdmin" },
    { label: "Waiver Setup", path: "/settings/waivers", icon: ShieldCheck, section: "Admin", badge: undefined, requiredPermission: "_superAdmin" },
  ];

  const isSuperAdmin = perms["_superAdmin"] === true;

  // Filter to only items this operator has clearance for
  const visibleNavItems = permsLoaded
    ? allNavItems.filter((item) => {
      if (item.requiredPermission === null) return true;
      if (isSuperAdmin) return true;
      return !!perms[item.requiredPermission];
    })
    : allNavItems.filter((item) => item.requiredPermission === null); // only always-visible while loading

  // Role badge color map
  const roleBadgeColor: Record<string, string> = {
    "Admin": "bg-accent-custom text-white",
    "Branch Manager": "bg-good-bg text-good",
    "Assistant Manager": "bg-good-bg text-good opacity-90",
    "Team Leader": "bg-bg-warm border border-border-custom text-ink",
    "Employee": "bg-warn-bg text-warn",
  };

  const sections = ["Main", "Admin"];

  return (
    <div className="flex min-h-screen bg-bg text-ink relative font-sans">
      {/* Noise overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.025] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E')]" />

      {/* ===== SIDEBAR ===== */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-bg-warm border-r border-border-custom">
        {/* Brand */}
        <div className="px-6 py-7 flex flex-col select-none">
          <img src="/logo.png" alt="GoalCryst Logo" className="h-16 w-auto object-contain mb-2 self-start" />
          {/* <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-ink font-serif">GoalCryst</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-custom" />
          </div> */}
          {/* <span className="text-[10px] uppercase tracking-[0.18em] text-ink-3 font-medium mt-0.5">Recovery CRM</span> */}
        </div>

        {/* Navigation */}
        <nav className="px-3 flex-1 overflow-y-auto space-y-4">
          {sections.map((section) => {
            const sectionItems = visibleNavItems.filter((item) => item.section === section);
            if (sectionItems.length === 0) return null;
            return (
              <div key={section} className="space-y-1">
                <div className="px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-semibold text-ink-3">
                  {section}
                </div>
                {sectionItems.map((item) => {
                  const isActive = pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] transition-all ${isActive
                        ? "bg-surface text-ink font-semibold border-l-2 border-accent-custom shadow-sm"
                        : "text-ink-2 hover:bg-surface/50 hover:text-ink"
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-accent-custom" : "text-ink-3"}`} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`ml-auto text-[9.5px] font-mono px-2 py-0.5 rounded-full font-semibold ${isActive ? "bg-accent-soft text-accent-ink" : "bg-border-custom text-ink-2"
                          }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Shimmer placeholder while permissions are resolving */}
          {!permsLoaded && (
            <div className="px-3 space-y-2 pt-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-border-custom/50" />
              ))}
            </div>
          )}
        </nav>

        {/* Operator Profile Card */}
        <div className="p-3 m-3 rounded-xl bg-surface border border-border-custom flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center text-xs font-semibold select-none">
              {currentUser.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ink truncate leading-tight">
                {currentUser.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-semibold ${roleBadgeColor[currentUser.role] ?? "bg-bg-warm text-ink-3"}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleThemeToggle}
                title={`Current Theme: ${theme.toUpperCase()} (Click to toggle)`}
                className="p-1 border border-border-custom rounded hover:bg-bg-warm text-ink-3 hover:text-ink transition-colors cursor-pointer"
              >
                {theme === "light" && <Sun className="w-3.5 h-3.5 text-warn animate-pulse" />}
                {theme === "dark" && <Moon className="w-3.5 h-3.5 text-accent-custom" />}
                {theme === "system" && <Monitor className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                title="Change Password"
                className="p-1 border border-border-custom rounded hover:bg-bg-warm text-ink-3 hover:text-ink transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="h-px bg-border-custom my-1" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-good font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
              <span>Shift Active</span>
            </div>
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="flex items-center gap-1 text-[11px] text-ink-2 hover:text-bad font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 px-8 py-3 bg-bg/90 backdrop-blur-md border-b border-border-custom flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-3 py-1 border border-border-custom rounded-full bg-surface text-xs text-ink-2 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-custom" />
              <span>Role: <strong className="text-ink font-semibold">{currentUser.role}</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <form onSubmit={handleGlobalSearch} className="w-full max-w-sm">
              <div className="relative flex items-center bg-surface border border-border-custom rounded-lg px-3 py-1.5 shadow-sm transition-all focus-within:border-ink-2">
                <Search className="w-3.5 h-3.5 text-ink-3 mr-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search contract, customer, or mobile..."
                  className="w-full bg-transparent border-0 outline-none text-xs text-ink placeholder-ink-3"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="hidden sm:inline-block text-[9.5px] font-mono text-ink-3 border border-border-custom rounded px-1.5 py-0.5 bg-bg-warm select-none font-semibold">
                  /
                </span>
              </div>
            </form>

            <button
              onClick={() => alert("No new notifications. The system alerts would display critical PTP follow-ups and upload completions.")}
              className="p-2 border border-border-custom rounded-lg bg-surface hover:bg-bg-warm text-ink-2 hover:text-ink transition-all shadow-sm"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-10 py-8 pb-14 animate-fade-in overflow-y-auto">
          {children}
        </div>
      </main>

      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={() => setIsPasswordModalOpen(false)} />
      )}
    </div>
  );
}
