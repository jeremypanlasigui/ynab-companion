"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { db } from "@/lib/ynab/db";
import { useYNABData, useSyncStatus } from "@/lib/ynab/hooks";
import { KeyRound, ShieldCheck, Check, Eye, EyeOff, RotateCcw, Sparkles } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, plans } = useYNABData();
  const { sync } = useSyncStatus();

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasEnvToken, setHasEnvToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setToken(settings.api_token || "");
      setSelectedPlanId(settings.selected_plan_id || "");
      setIsDemoMode(settings.is_demo_mode);
    }
  }, [settings]);

  const handleTestAndFetch = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/ynab/test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();
      if (data.hasEnvToken) {
        setHasEnvToken(true);
      }

      if (!res.ok || !data.success) {
        setTestResult({
          success: false,
          message: data.error || "Failed to connect to YNAB API.",
        });
        return;
      }

      if (data.plans && data.plans.length > 0) {
        await db.plans.bulkPut(data.plans);
        if (!selectedPlanId || !data.plans.some((p: any) => p.id === selectedPlanId)) {
          setSelectedPlanId(data.default_plan?.id || data.plans[0].id);
        }
        setTestResult({
          success: true,
          message: `Connected successfully! Found ${data.plans.length} plan(s).`,
        });
      } else {
        setTestResult({ success: false, message: "Connected, but no plans found in your account." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Failed to connect to YNAB API." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    const chosenPlan = plans.find((p) => p.id === selectedPlanId);

    const updated = {
      ...settings,
      api_token: token.trim(),
      selected_plan_id: selectedPlanId,
      selected_plan_name: chosenPlan?.name || settings.selected_plan_name,
      is_demo_mode: isDemoMode,
    };

    // Update local Dexie cache
    await db.settings.put(updated);

    // Persist securely to encrypted server-side SQLite
    try {
      await fetch("/api/data/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SAVE_SETTINGS", payload: updated }),
      });
    } catch (err) {
      console.warn("Failed persisting settings to server SQLite:", err);
    }

    setSaveSuccess(true);

    if (!isDemoMode && token.trim()) {
      await sync();
    }

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetDemo = async () => {
    if (confirm("Reset local database to default Mint-like demo dataset?")) {
      await db.seedDemoData(true);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="App Settings & YNAB Sync"
      description="Configure your YNAB access token and encrypted persistent storage"
      maxWidth="md"
    >
      <div className="space-y-5 text-sm">
        {/* Security Banner */}
        <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 p-3 flex items-center justify-between text-xs text-teal-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>SQLite database encrypted with <strong>AES-256-GCM</strong> at rest (`data/budget.sqlite`).</span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-medium text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Demo / Mock Mode
            </span>
            <p className="text-xs text-zinc-400">
              Run locally with realistic sample data without connecting YNAB
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDemoMode ? "bg-teal-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDemoMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* YNAB API Token */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="font-medium text-zinc-200 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-zinc-400" />
              Personal Access Token (PAT)
            </label>
            <a
              href="https://app.ynab.com/settings/developer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-400 hover:text-teal-300 underline"
            >
              Get Token in YNAB ↗
            </a>
          </div>

          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your YNAB Personal Access Token..."
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 text-xs font-mono focus:border-teal-500 focus:outline-hidden pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={handleTestAndFetch}
              disabled={isTesting || (!token.trim() && !hasEnvToken)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-50 transition-colors"
            >
              {isTesting ? "Connecting..." : "Test Connection & Load Plans"}
            </button>
            <p className="text-[11px] text-zinc-500">
              Tokens are stored encrypted in SQLite or via .env.local
            </p>
          </div>

          {testResult && (
            <p
              className={`text-xs p-2 rounded-lg ${
                testResult.success
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                  : "bg-rose-950/40 text-rose-300 border border-rose-800/40"
              }`}
            >
              {testResult.message}
            </p>
          )}
        </div>

        {/* Plan / Budget Selector */}
        {plans.length > 0 && (
          <div className="space-y-1.5">
            <label className="font-medium text-zinc-200">Selected Plan / Budget</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 text-xs focus:border-teal-500 focus:outline-hidden"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Database actions */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDemo}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Sample Demo Data
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" /> Saved!
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
