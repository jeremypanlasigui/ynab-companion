"use client";

import { useState, useRef, useEffect } from "react";
import { PurchasedGood } from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Receipt,
  ScanLine,
  ArrowUpToLine,
} from "lucide-react";

interface ReceiptViewerOverlayProps {
  imageSrc?: string | null;
  vendor?: string;
  date?: string;
  goods: PurchasedGood[];
  hoveredGoodId: string | null;
  selectedGoodId?: string | null;
  onHoverGood: (id: string | null) => void;
  onSelectGood?: (id: string) => void;
  isScanning?: boolean;
  scanProgress?: number;
  scanMessage?: string;
}

export function ReceiptViewerOverlay({
  imageSrc,
  vendor = "Grocery Store",
  date = new Date().toISOString().slice(0, 10),
  goods,
  hoveredGoodId,
  selectedGoodId,
  onHoverGood,
  onSelectGood,
  isScanning = false,
  scanProgress = 0,
  scanMessage = "Scanning text...",
}: ReceiptViewerOverlayProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showOverlays, setShowOverlays] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentDimensions, setContentDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const updateDimensions = () => {
    if (contentRef.current) {
      setContentDimensions({
        width: contentRef.current.offsetWidth,
        height: contentRef.current.offsetHeight,
      });
    }
  };

  useEffect(() => {
    updateDimensions();
    const timer = setTimeout(updateDimensions, 100);
    return () => clearTimeout(timer);
  }, [imageSrc, goods.length, vendor]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => {
    setZoomLevel(1);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleScrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goodsWithBoxes = goods.filter((g) => g.bbox);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden shadow-inner">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-900/90 border-b border-zinc-800 text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>Receipt Visual</span>
          </span>
          {goodsWithBoxes.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
              {goodsWithBoxes.length} {goodsWithBoxes.length === 1 ? "box" : "boxes"}
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1">
          {/* Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowOverlays((v) => !v)}
            title={showOverlays ? "Hide parsed bounding boxes" : "Show parsed bounding boxes"}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              showOverlays
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {showOverlays ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span className="hidden sm:inline">Overlay</span>
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            disabled={zoomLevel <= 0.75}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Level Indicator */}
          <span className="text-[10px] font-mono text-zinc-400 w-9 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            disabled={zoomLevel >= 2.5}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Scroll to Top */}
          <button
            type="button"
            onClick={handleScrollToTop}
            title="Scroll to Top of Receipt"
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom */}
          {zoomLevel !== 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom (100%)"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        ref={containerRef}
        tabIndex={0}
        className="relative flex-1 min-h-[360px] max-h-[580px] overflow-auto bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] bg-zinc-950/90 focus:outline-none scroll-smooth"
      >
        {/* Scanning laser animation bar */}
        {isScanning && (
          <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-center items-center bg-black/40 backdrop-blur-[2px]">
            <div className="w-48 text-center space-y-2">
              <ScanLine className="w-8 h-8 text-teal-400 mx-auto animate-pulse" />
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-teal-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(scanProgress * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-teal-300 block">{scanMessage}</span>
            </div>
          </div>
        )}

        {/* Outer alignment wrapper: anchors content to top while centering horizontally */}
        <div
          className="w-full min-h-full flex flex-col items-center justify-start p-4 transition-all duration-150"
          style={{
            paddingBottom:
              contentDimensions.height && zoomLevel > 1
                ? `${Math.round(contentDimensions.height * (zoomLevel - 1) + 40)}px`
                : "24px",
            paddingLeft:
              contentDimensions.width && zoomLevel > 1
                ? `${Math.max(24, Math.round(((contentDimensions.width * (zoomLevel - 1)) / 2) + 24))}px`
                : "24px",
            paddingRight:
              contentDimensions.width && zoomLevel > 1
                ? `${Math.max(24, Math.round(((contentDimensions.width * (zoomLevel - 1)) / 2) + 24))}px`
                : "24px",
          }}
        >
          {/* Scaled content container anchored at top */}
          <div
            ref={contentRef}
            className="transition-transform duration-150 max-w-full shrink-0"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top center",
            }}
          >
            {imageSrc ? (
              /* Uploaded receipt photo view */
              <div className="relative inline-block max-w-full rounded-xl overflow-hidden shadow-2xl border border-zinc-700/80 bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt="Receipt scan"
                  onLoad={updateDimensions}
                  className="max-h-[520px] w-auto object-contain block select-none pointer-events-none"
                />

              {/* Bounding Box Overlays */}
              {showOverlays &&
                goodsWithBoxes.map((good) => {
                  if (!good.bbox) return null;
                  const isHovered = hoveredGoodId === good.id;
                  const isSelected = selectedGoodId === good.id;
                  const boxWidth = Math.max(good.bbox.x1 - good.bbox.x0, 2);
                  const boxHeight = Math.max(good.bbox.y1 - good.bbox.y0, 1.8);

                  return (
                    <div
                      key={good.id}
                      onMouseEnter={() => onHoverGood(good.id)}
                      onMouseLeave={() => onHoverGood(null)}
                      onClick={() => onSelectGood?.(good.id)}
                      style={{
                        left: `${good.bbox.x0}%`,
                        top: `${good.bbox.y0}%`,
                        width: `${boxWidth}%`,
                        height: `${boxHeight}%`,
                      }}
                      className={`absolute rounded transition-all duration-150 cursor-pointer ${
                        good.is_food
                          ? "border border-emerald-400/70 bg-emerald-500/15 hover:bg-emerald-500/30"
                          : "border border-purple-400/70 bg-purple-500/15 hover:bg-purple-500/30"
                      } ${
                        isHovered || isSelected
                          ? "ring-2 ring-teal-300 bg-teal-400/35 z-30 shadow-[0_0_12px_rgba(45,212,191,0.7)] scale-[1.02]"
                          : "z-10"
                      }`}
                    >
                      {/* Floating tooltip on hover */}
                      {(isHovered || isSelected) && (
                        <div
                          className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-40 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-900/95 text-white border border-teal-500/60 shadow-lg flex items-center gap-1.5"
                        >
                          <span className="text-teal-300 font-bold">{good.name}</span>
                          <span className="font-mono text-zinc-300">
                            {formatCurrency(good.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            /* Synthetic Thermal Receipt Ticket for Presets & Pasted Text */
            <div className="relative w-[280px] sm:w-[320px] bg-[#faf8f5] text-zinc-900 rounded-sm shadow-2xl p-4 font-mono select-none border-t-8 border-dashed border-zinc-300">
              {/* Receipt Header */}
              <div className="text-center pb-2.5 border-b border-dashed border-zinc-400/80 mb-2">
                <span className="text-xs font-black uppercase tracking-wider block text-zinc-900">
                  {vendor}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  RECEIPT #{Math.abs(goods.reduce((s, g) => s + g.amount, 0))}
                </span>
                <span className="text-[10px] text-zinc-500 block">{date}</span>
              </div>

              {/* Items List */}
              <div className="relative space-y-1.5 text-[11px] pb-3 border-b border-dashed border-zinc-400/80">
                {goods.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 italic text-[11px]">
                    Empty receipt ticket
                  </div>
                ) : (
                  goods.map((good) => {
                    const isHovered = hoveredGoodId === good.id;
                    const isSelected = selectedGoodId === good.id;

                    return (
                      <div
                        key={good.id}
                        onMouseEnter={() => onHoverGood(good.id)}
                        onMouseLeave={() => onHoverGood(null)}
                        onClick={() => onSelectGood?.(good.id)}
                        className={`flex items-center justify-between p-1 rounded transition-all cursor-pointer ${
                          isHovered || isSelected
                            ? "bg-teal-500/20 text-teal-950 font-bold ring-1 ring-teal-500 shadow-sm"
                            : showOverlays
                            ? good.is_food
                              ? "hover:bg-emerald-50 text-zinc-800"
                              : "hover:bg-purple-50 text-zinc-800"
                            : "hover:bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {showOverlays && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                good.is_food ? "bg-emerald-500" : "bg-purple-500"
                              }`}
                            />
                          )}
                          <span className="truncate">{good.name}</span>
                        </div>
                        <span className="font-mono shrink-0">
                          {formatCurrency(good.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Totals */}
              {goods.length > 0 && (
                <div className="pt-2 text-[11px] space-y-0.5">
                  <div className="flex justify-between text-zinc-600 text-[10px]">
                    <span>FOOD ITEMS</span>
                    <span className="font-mono">
                      {formatCurrency(
                        goods.filter((g) => g.is_food).reduce((s, g) => s + g.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-[10px]">
                    <span>HOME GOODS</span>
                    <span className="font-mono">
                      {formatCurrency(
                        goods.filter((g) => !g.is_food).reduce((s, g) => s + g.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-zinc-400/60 mt-1">
                    <span>TOTAL</span>
                    <span className="font-mono">
                      {formatCurrency(goods.reduce((s, g) => s + g.amount, 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* Barcode Footer */}
              <div className="pt-3 text-center opacity-70">
                <div className="h-6 w-3/4 mx-auto flex items-stretch justify-center gap-[2px]">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className={`bg-zinc-800 ${i % 3 === 0 ? "w-1" : i % 5 === 0 ? "w-0.5" : "w-[1px]"}`}
                    />
                  ))}
                </div>
                <span className="text-[9px] text-zinc-400 block mt-1 tracking-widest">
                  *THANK YOU FOR SHOPPING*
                </span>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-t border-zinc-800 text-[10px] text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <span className="text-zinc-300">Food Items</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block shadow-[0_0_6px_rgba(192,132,252,0.6)]" />
            <span className="text-zinc-300">Home Goods</span>
          </div>
        </div>
        <span className="text-zinc-500 hidden sm:inline">
          Hover or click boxes to locate items in table
        </span>
      </div>
    </div>
  );
}
