"use client";

import { useState } from "react";
import { ReceiptIngestion } from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowUpRight,
  Edit3,
} from "lucide-react";

interface ReceiptHistoryTableProps {
  receipts: ReceiptIngestion[];
  onResolve: (receipt: ReceiptIngestion) => void;
  onDelete: (receiptId: string) => void;
  onEdit?: (receipt: ReceiptIngestion) => void;
}

export function ReceiptHistoryTable({
  receipts,
  onResolve,
  onDelete,
  onEdit,
}: ReceiptHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  if (receipts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-zinc-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Ingested Receipts & Itemization History
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit OCR line items, edit details, and track matching status with YNAB transactions
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-800 text-zinc-300">
          {receipts.length} {receipts.length === 1 ? "receipt" : "receipts"}
        </span>
      </div>

      <div className="divide-y divide-zinc-800/80">
        {receipts.map((receipt) => {
          const isExpanded = expandedId === receipt.id;
          const isMatched = receipt.status === "matched";

          return (
            <div key={receipt.id} className="transition-colors hover:bg-zinc-800/20">
              <div
                onClick={() => toggleExpand(receipt.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-teal-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {receipt.vendor}
                      </span>
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Linked & Split</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          <AlertCircle className="w-3 h-3" />
                          <span>Unresolved</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 font-mono">
                      <span>{receipt.date}</span>
                      <span>•</span>
                      <span>{receipt.goods?.length || 0} goods itemized</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="text-right">
                    <span className="font-mono text-sm font-extrabold text-white block">
                      {formatCurrency(receipt.total_amount)}
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-emerald-400">
                        Food: {formatCurrency(receipt.food_amount)}
                      </span>
                      <span className="text-zinc-500">|</span>
                      <span className="text-zinc-400">
                        Home Goods: {formatCurrency(receipt.non_food_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(receipt)}
                        title="Edit Receipt"
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-teal-300 hover:bg-teal-500/10 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isMatched && (
                      <button
                        onClick={() => onResolve(receipt)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Resolve</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(receipt.id)}
                      title="Delete Receipt"
                      className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Itemized PurchasedGood List */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 bg-zinc-950/60 border-t border-zinc-800/40">
                  <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">Itemized Purchased Goods</span>
                    {receipt.matched_transaction_id && (
                      <span className="font-mono text-[11px] text-teal-400">
                        Linked YNAB Tx: {receipt.matched_transaction_id}
                      </span>
                    )}
                  </div>

                  <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-950/80 text-[11px] text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800/80">
                        <tr>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3">Sub-Category</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-medium">
                        {(receipt.goods || []).map((good) => (
                          <tr key={good.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2 px-3 text-zinc-200">
                              {good.name}
                            </td>
                            <td className="py-2 px-3">
                              <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                                {good.category}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {good.is_food ? (
                                <span className="text-[10px] font-semibold text-emerald-400">
                                  Food
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-zinc-400">
                                  Home Goods
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-white">
                              {formatCurrency(good.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
