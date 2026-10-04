"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  ReceiptIngestion,
  TransactionDetail,
  FoodSubCategory,
} from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import {
  getSubCategoryBreakdown,
  SubCategoryItem,
} from "@/lib/food/food-spend-utils";
import {
  Store,
  Calendar,
  Layers,
  ShoppingBag,
  ListOrdered,
  Tag,
  Receipt,
  Search,
  Edit3,
} from "lucide-react";

interface SubCategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryKey: FoodSubCategory | null;
  currentMonth: string; // 'YYYY-MM'
  totalFoodSpend: number; // milliunits
  receipts: ReceiptIngestion[];
  transactions: TransactionDetail[];
  onEditReceipt?: (receipt: ReceiptIngestion) => void;
}

const META: Record<
  FoodSubCategory,
  { label: string; emoji: string; color: string; barColor: string }
> = {
  meat: { label: "Meat & Seafood", emoji: "🥩", color: "text-rose-400", barColor: "bg-rose-500" },
  veggies: { label: "Veggies", emoji: "🥦", color: "text-emerald-400", barColor: "bg-emerald-500" },
  fruits: { label: "Fruits", emoji: "🍎", color: "text-amber-400", barColor: "bg-amber-400" },
  dairy: { label: "Dairy & Eggs", emoji: "🧀", color: "text-yellow-300", barColor: "bg-yellow-400" },
  snacks: { label: "Snacks", emoji: "🍿", color: "text-orange-400", barColor: "bg-orange-500" },
  pantry: { label: "Pantry & Staples", emoji: "🥫", color: "text-teal-400", barColor: "bg-teal-500" },
  beverages: { label: "Beverages", emoji: "🥤", color: "text-blue-400", barColor: "bg-blue-500" },
  prepared: { label: "Prepared & Deli", emoji: "🍱", color: "text-indigo-400", barColor: "bg-indigo-500" },
  tax: { label: "Sales Tax", emoji: "🧾", color: "text-slate-300", barColor: "bg-slate-400" },
  "ca crv": { label: "CA CRV (Bottle Deposit)", emoji: "♻️", color: "text-cyan-400", barColor: "bg-cyan-500" },
  "home goods": { label: "Home Goods (Non-Food)", emoji: "🧻", color: "text-zinc-400", barColor: "bg-zinc-600" },
  other: { label: "Other", emoji: "🏷️", color: "text-zinc-300", barColor: "bg-zinc-500" },
};

export function SubCategoryDetailModal({
  isOpen,
  onClose,
  categoryKey,
  currentMonth,
  totalFoodSpend,
  receipts,
  transactions,
  onEditReceipt,
}: SubCategoryDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"store_runs" | "items">("store_runs");
  const [searchQuery, setSearchQuery] = useState("");

  if (!categoryKey) return null;

  const info = META[categoryKey] || {
    label: categoryKey,
    emoji: "🏷️",
    color: "text-zinc-300",
    barColor: "bg-zinc-500",
  };

  const formattedMonthName = new Date(currentMonth + "-02").toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const detailData = getSubCategoryBreakdown(
    categoryKey,
    receipts,
    transactions,
    currentMonth,
    totalFoodSpend
  );

  const filteredItems = detailData.items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${info.emoji} ${info.label} Breakdown`}
      description={`Itemized breakdown of spending for ${formattedMonthName}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Category Header Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800">
          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Category Spend</span>
            <span className="font-mono text-lg font-black text-white">
              {formatCurrency(-detailData.totalAmount)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Items Count</span>
            <span className="font-mono text-lg font-black text-teal-300">
              {detailData.itemCount} {detailData.itemCount === 1 ? "item" : "items"}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Food Budget Share</span>
            {categoryKey !== "home goods" ? (
              <span className="font-mono text-lg font-black text-amber-400">
                {detailData.percentageOfFood}%
              </span>
            ) : (
              <span className="text-xs font-semibold text-purple-300 block mt-1">
                Non-Food (Filtered)
              </span>
            )}
          </div>
        </div>

        {/* View Toggle & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("store_runs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "store_runs"
                  ? "bg-zinc-800 text-teal-300 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>By Store Run ({detailData.groupedByStoreRun.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "items"
                  ? "bg-zinc-800 text-teal-300 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>All Items ({detailData.itemCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items or stores..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
          {detailData.itemCount === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-2">
              <ShoppingBag className="w-8 h-8 text-zinc-600 mx-auto" />
              <span className="text-xs font-bold text-zinc-300 block">
                No items found for {info.label} in {formattedMonthName}
              </span>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Items parsed from receipts or tagged with this subcategory in split memos will appear here.
              </p>
            </div>
          ) : activeTab === "store_runs" ? (
            /* Tab 1: Grouped By Store Run */
            detailData.groupedByStoreRun.map((run) => {
              const runMatchingItems = run.items.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.vendor.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (runMatchingItems.length === 0) return null;

              const targetReceipt = run.sourceType === "receipt"
                ? receipts.find(
                    (r) => r.id === run.sourceId || (run.items[0] && r.id === run.items[0].receiptId)
                  )
                : null;

              return (
                <div
                  key={run.sourceId}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden"
                >
                  {/* Store Run Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-900/60 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        {run.sourceType === "receipt" ? (
                          <Receipt className="w-3.5 h-3.5" />
                        ) : (
                          <Layers className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {run.vendor}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {run.date} &bull; {run.sourceType === "receipt" ? "Receipt" : "Bank Split"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 mr-1.5">Category Total:</span>
                        <span className="font-mono text-xs font-bold text-white">
                          {formatCurrency(run.totalCategoryAmount)}
                        </span>
                      </div>

                      {/* Link to Edit Receipt */}
                      {run.sourceType === "receipt" && targetReceipt && onEditReceipt && (
                        <button
                          type="button"
                          onClick={() => onEditReceipt(targetReceipt)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Edit this receipt and its items"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Line Items for this run */}
                  <div className="divide-y divide-zinc-800/50 p-2 space-y-1">
                    {runMatchingItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-zinc-900/40 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                          <span className="font-medium text-zinc-200 truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-white">
                            {formatCurrency(item.amount)}
                          </span>
                          {item.source === "receipt" && item.receiptId && onEditReceipt && targetReceipt && (
                            <button
                              type="button"
                              onClick={() => onEditReceipt(targetReceipt)}
                              title="Edit receipt"
                              className="p-1 rounded text-zinc-500 hover:text-teal-300 hover:bg-teal-500/10 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Tab 2: Flat All Items Table */
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60">
              <div className="divide-y divide-zinc-800/60">
                {filteredItems.map((item) => {
                  const targetReceipt = item.source === "receipt" && item.receiptId
                    ? receipts.find((r) => r.id === item.receiptId)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 hover:bg-zinc-900/50 transition-colors text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white truncate block">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            {item.date}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3 text-zinc-500" />
                            {item.vendor}
                          </span>
                          <span>&bull;</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 text-[9px]">
                            {item.source === "receipt" ? "Receipt" : "Bank Split"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 sm:justify-end">
                        <span className="font-mono text-sm font-bold text-white text-right">
                          {formatCurrency(item.amount)}
                        </span>
                        {targetReceipt && onEditReceipt && (
                          <button
                            type="button"
                            onClick={() => onEditReceipt(targetReceipt)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Edit this receipt"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400">
          <span>
            Showing all line items contributing to <strong>{info.label}</strong> in {formattedMonthName}.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
