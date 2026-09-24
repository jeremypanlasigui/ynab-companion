import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        YNAB Companion App • Offline-First Mint-style Experience • Powered by Next.js & IndexedDB
      </footer>
    </div>
  );
}
