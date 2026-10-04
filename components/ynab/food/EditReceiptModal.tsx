"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  ReceiptIngestion,
  PurchasedGood,
  FoodSubCategory,
  Category,
  TransactionDetail,
} from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import { ItemPriceInput } from "./ItemPriceInput";
import { db } from "@/lib/ynab/db";
import {
  detectDefaultCategories,
  buildSplitSubtransactions,
} from "@/lib/food/split-builder";
import {
  Receipt,
  Store,
  Calendar,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface EditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptIngestion | null;
  categories?: Category[];
  transactions?: TransactionDetail[];
  onReceiptUpdated?: (receipt: ReceiptIngestion) => void;
  zIndex?: string;
}

const CATEGORY_OPTIONS: {
  key: FoodSubCategory;
  label: string;
  emoji: string;
  is_food: boolean;
}[] = [
  { key: "meat", label: "Meat & Seafood", emoji: "🥩", is_food: true },
  { key: "veggies", label: "Veggies", emoji: "🥦", is_food: true },
  { key: "fruits", label: "Fruits", emoji: "🍎", is_food: true },
  { key: "dairy", label: "Dairy & Eggs", emoji: "🧀", is_food: true },
  { key: "snacks", label: "Snacks", emoji: "🍿", is_food: true },
  { key: "pantry", label: "Pantry & Staples", emoji: "🥫", is_food: true },
  { key: "beverages", label: "Beverages", emoji: "🥤", is_food: true },
  { key: "prepared", label: "Prepared & Deli", emoji: "🍱", is_food: true },
  { key: "tax", label: "Sales Tax", emoji: "🧾", is_food: true },
  { key: "ca crv", label: "CA CRV", emoji: "♻️", is_food: true },
  { key: "home goods", label: "Home Goods (Non-Food)", emoji: "🧻", is_food: false },
  { key: "other", label: "Other", emoji: "🏷️", is_food: true },
];

export function EditReceiptModal({
  isOpen,
  onClose,
  receipt,
  categories = [],
  transactions = [],
  onReceiptUpdated,
  zIndex = "z-[60]",
}: EditReceiptModalProps) {
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");
  const [goods, setGoods] = useState<PurchasedGood[]>([]);
  const [showImage, setShowImage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync state when receipt prop changes
  useEffect(() => {
    if (receipt) {
      setVendor(receipt.vendor || "");
      setDate(receipt.date || new Date().toISOString().slice(0, 10));
      setGoods(receipt.goods ? JSON.parse(JSON.stringify(receipt.goods)) : []);
      setShowImage(false);
      setZoomLevel(1);
      setStatusMessage(null);
    }
  }, [receipt]);

  // Dynamic calculated totals
  const { totalAmount, foodAmount, nonFoodAmount } = useMemo(() => {
    let tot = 0;
    let food = 0;
    let nonFood = 0;

    goods.forEach((g) => {
      tot += g.amount;
      if (g.is_food) {
        food += g.amount;
      } else {
        nonFood += g.amount;
      }
    });

    return { totalAmount: tot, foodAmount: food, nonFoodAmount: nonFood };
  }, [goods]);

  if (!receipt) return null;

  const isMatched = receipt.status === "matched" && Boolean(receipt.matched_transaction_id);

  // Modify individual item
  const handleUpdateItem = (
    index: number,
    field: keyof PurchasedGood,
    value: string | number | boolean
  ) => {
    setGoods((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === "category") {
        const option = CATEGORY_OPTIONS.find((o) => o.key === value);
        item.category = value as FoodSubCategory;
        item.is_food = option ? option.is_food : value !== "home goods";
      } else if (field === "is_food") {
        item.is_food = Boolean(value);
        if (!value && item.category !== "home goods") {
          item.category = "home goods";
        }
      } else if (field === "amount") {
        item.amount = typeof value === "number" ? value : 0;
      } else if (field === "name") {
        item.name = String(value);
      }

      copy[index] = item;
      return copy;
    });
  };

  // Delete item
  const handleDeleteItem = (index: number) => {
    setGoods((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new item
  const handleAddNewItem = () => {
    const newItem: PurchasedGood = {
      id: `good-${Date.now()}-${goods.length + 1}`,
      receipt_id: receipt.id,
      name: "New Item",
      amount: -1000, // -$1.00 default
      category: "other",
      is_food: true,
    };
    setGoods((prev) => [...prev, newItem]);
  };

  // Save changes
  const handleSave = async () => {
    if (!receipt) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updatedReceipt: ReceiptIngestion = {
        ...receipt,
        vendor: vendor.trim() || receipt.vendor,
        date,
        goods,
        total_amount: totalAmount,
        food_amount: foodAmount,
        non_food_amount: nonFoodAmount,
      };

      // 1. Update receipt in Dexie
      await db.saveReceipt(updatedReceipt);

      // 2. If matched to a YNAB transaction, update transaction split subtransactions
      if (receipt.matched_transaction_id && transactions.length > 0) {
        const linkedTx = transactions.find((t) => t.id === receipt.matched_transaction_id);
        if (linkedTx) {
          const { foodCategory, homeGoodsCategory } = detectDefaultCategories(categories);
          const subtransactions = buildSplitSubtransactions(goods, {
            transactionId: linkedTx.id,
            foodCategoryId: foodCategory?.id || null,
            foodCategoryName: foodCategory?.name || "Groceries",
            homeGoodsCategoryId: homeGoodsCategory?.id || null,
            homeGoodsCategoryName: homeGoodsCategory?.name || "Home Goods",
            strategy: "granular",
          });

          const updatedTx: TransactionDetail = {
            ...linkedTx,
            amount: totalAmount,
            payee_name: vendor.trim() || linkedTx.payee_name,
            date,
            category_id: null,
            category_name: "Split (Multiple Categories)",
            subtransactions,
          };
          await db.updateTransaction(updatedTx);
        }
      }

      setStatusMessage("Receipt updated successfully!");
      onReceiptUpdated?.(updatedReceipt);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error("Failed to update receipt:", err);
      setStatusMessage("Error saving receipt changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Receipt"
      description={`Update store name, date, and individual line items for ${receipt.vendor}`}
      maxWidth="4xl"
      zIndex={zIndex}
    >
      <div className="space-y-4">
        {/* Status & Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.includes("Error")
                ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
            }`}
          >
            {statusMessage.includes("Error") ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Dynamic Spend Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800">
          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Total Spend</span>
            <span className="font-mono text-base font-extrabold text-white">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 block font-medium">Food Spend</span>
            <span className="font-mono text-base font-extrabold text-emerald-400">
              {formatCurrency(foodAmount)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Home Goods</span>
            <span className="font-mono text-base font-extrabold text-zinc-300">
              {formatCurrency(nonFoodAmount)}
            </span>
          </div>
          <div className="text-right sm:text-left">
            <span className="text-[10px] text-zinc-400 block font-medium">Item Count</span>
            <span className="font-mono text-base font-extrabold text-teal-300">
              {goods.length} {goods.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Receipt Metadata Inputs & Image Preview Button */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-800/80">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Store / Vendor Name
            </label>
            <div className="relative">
              <Store className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Tokyo Central, Trader Joe's"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Receipt Date
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Status & Photo
            </label>
            <div className="flex items-center gap-2">
              {isMatched ? (
                <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Linked to YNAB</span>
                </span>
              ) : (
                <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Pending Receipt</span>
                </span>
              )}

              {receipt.image_url && (
                <button
                  type="button"
                  onClick={() => setShowImage(!showImage)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    showImage
                      ? "bg-teal-500 text-zinc-950 shadow-xs"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>{showImage ? "Hide Photo" : "View Photo"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Original Receipt Image Cross-Reference */}
        {showImage && receipt.image_url && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Original Receipt Photo Cross-Reference</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-zinc-400 font-mono px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-auto border border-zinc-800/80 rounded-xl bg-zinc-900/60 p-2 flex justify-center">
              <img
                src={receipt.image_url}
                alt="Receipt Original"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
                className="max-w-full h-auto rounded transition-transform"
              />
            </div>
          </div>
        )}

        {/* Purchased Goods Item Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-teal-400" />
              <span>Purchased Goods & Categories ({goods.length})</span>
            </span>
            <button
              type="button"
              onClick={handleAddNewItem}
              className="flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/50">
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60">
              {goods.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No line items on this receipt. Click "+ Add Line Item" to add goods.
                </div>
              ) : (
                goods.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 hover:bg-zinc-900/50 transition-colors text-xs"
                  >
                    {/* Item Name Input */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                        placeholder="Item name"
                        className="w-full bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none focus:border-b focus:border-teal-500 truncate"
                      />
                    </div>

                    {/* Sub-Category Selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateItem(index, "category", e.target.value)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.emoji} {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Food vs Home Good Toggle */}
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(index, "is_food", !item.is_food)}
                        title={item.is_food ? "Counted in food budget" : "Non-food home good"}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                          item.is_food
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                        }`}
                      >
                        {item.is_food ? "Food" : "Home Good"}
                      </button>

                      {/* Price Input with ItemPriceInput */}
                      <ItemPriceInput
                        amountMilliunits={item.amount}
                        onCommitAmount={(amt) => handleUpdateItem(index, "amount", amt)}
                      />

                      {/* Delete Item */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index)}
                        title="Delete item"
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <div className="text-[11px] text-zinc-400">
            {isMatched ? (
              <span>
                💡 Saving will also automatically synchronize the split subtransactions on the linked YNAB transaction.
              </span>
            ) : (
              <span>
                Pending receipt items will immediately update food spending metrics and sub-category breakdowns.
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all shadow-md shadow-teal-500/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Receipt"}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
