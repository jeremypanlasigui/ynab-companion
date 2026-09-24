"use client";

import { useSyncStatus } from "@/lib/ynab/hooks";
import { RefreshCw, Wifi, WifiOff, CloudUpload } from "lucide-react";
import { useState, useEffect } from "react";

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, lastSyncedAt, pendingCount, error, sync } = useSyncStatus();
  const [justSynced, setJustSynced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSync = async () => {
    const success = await sync();
    if (success) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2000);
    }
  };

  const formattedTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-7 w-16 bg-zinc-800/40 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Online / Offline status */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isOnline
            ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-400"
            : "bg-amber-950/30 border-amber-800/50 text-amber-400"
        }`}
        title={isOnline ? "Connected to Network" : "Offline mode active"}
      >
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
      </div>

      {/* Pending offline operations indicator */}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-950/40 border border-indigo-800/50 text-indigo-300"
          title={`${pendingCount} local changes pending sync to YNAB`}
        >
          <CloudUpload className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{pendingCount} pending</span>
        </div>
      )}

      {/* Sync trigger button */}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
          isSyncing
            ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
            : "bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 hover:text-white"
        }`}
        title={formattedTime ? `Last synced at ${formattedTime}` : "Sync with YNAB"}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 text-teal-400 ${
            isSyncing ? "animate-spin" : justSynced ? "text-emerald-400" : ""
          }`}
        />
        <span className="hidden md:inline">
          {isSyncing ? "Syncing..." : justSynced ? "Synced!" : "Sync"}
        </span>
      </button>

      {error && (
        <span className="text-[11px] text-rose-400 hidden xl:inline truncate max-w-xs" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
