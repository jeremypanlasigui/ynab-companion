"use client";

import { useState, useEffect } from "react";

interface ItemPriceInputProps {
  amountMilliunits: number;
  onCommitAmount: (milliunits: number) => void;
  className?: string;
}

/**
 * A user-friendly currency text input for receipt line items.
 * Avoids browser `type="number"` quirks and prevents cursor jumping/forced
 * reformatting while actively typing.
 */
export function ItemPriceInput({
  amountMilliunits,
  onCommitAmount,
  className = "",
}: ItemPriceInputProps) {
  // Convert milliunits to dollar string (e.g., -5990 -> "5.99")
  const formattedInitial = (Math.abs(amountMilliunits) / 1000).toFixed(2);
  const [text, setText] = useState(formattedInitial);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external changes (such as loading presets or OCR completing)
  // only when the user is not actively typing in this input.
  useEffect(() => {
    if (!isFocused) {
      setText((Math.abs(amountMilliunits) / 1000).toFixed(2));
    }
  }, [amountMilliunits, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Allow empty string, digits, and at most one decimal point
    // Matches e.g. "", "5", "5.", "5.9", "5.99", "124.50"
    if (/^[0-9]*\.?[0-9]*$/.test(val)) {
      setText(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0) {
        // Real-time update of parent totals/splits with valid amount
        onCommitAmount(-Math.round(parsed * 1000));
      } else if (val === "") {
        onCommitAmount(0);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(text);
    if (isNaN(parsed) || parsed < 0) {
      const fallback = (Math.abs(amountMilliunits) / 1000).toFixed(2);
      setText(fallback);
    } else {
      // Cleanly format to standard 2 decimals on blur
      const formatted = parsed.toFixed(2);
      setText(formatted);
      onCommitAmount(-Math.round(parsed * 1000));
    }
  };

  return (
    <div className="flex items-center font-mono text-xs">
      <span className="text-zinc-500 mr-1 select-none text-xs">$</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={text}
        onFocus={() => setIsFocused(true)}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-right text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors ${className}`}
      />
    </div>
  );
}
