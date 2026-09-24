"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useYNABData } from "@/lib/ynab/hooks";
import { SyncStatusIndicator } from "@/components/ynab/SyncStatusIndicator";
import { SettingsModal } from "@/components/ynab/SettingsModal";
import { AddTransactionModal } from "@/components/ynab/AddTransactionModal";
import {
  Sparkles,
  Settings,
  PlusCircle,
  LayoutDashboard,
  PieChart,
  Receipt,
  Layers,
} from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { settings } = useYNABData();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/budget", label: "Budget", icon: PieChart },
    { href: "/transactions", label: "Transactions", icon: Receipt },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo and Plan Title */}
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5 text-zinc-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white tracking-tight text-base sm:text-lg">
                      YNAB Companion
                    </span>
                    {settings?.is_demo_mode && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        Demo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 block -mt-0.5 truncate max-w-[160px] sm:max-w-xs">
                    {settings?.selected_plan_name || "Personal Finances"}
                  </span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-zinc-800">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href === "/dashboard" && pathname === "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-zinc-800 text-white shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <SyncStatusIndicator />

              {/* Quick Add Transaction Button */}
              <button
                onClick={() => setIsAddTxOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all shadow-md shadow-teal-500/10 hover:shadow-teal-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>

              {/* Settings button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Settings & Sync"
                className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden border-t border-zinc-800/60 bg-zinc-950 px-4 py-2 flex items-center justify-around">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-800 text-teal-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
      />
    </>
  );
}
