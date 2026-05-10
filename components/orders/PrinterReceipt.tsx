"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { Order } from "@/types/domain";
import { STATUS_META } from "@/types/domain";
import { formatTL } from "@/lib/format";

/* ─────────────────────────────────────────────────────────────
 *  STORYBOARD
 *
 *  mount   printer body springs in  (~800 ms entrance)
 *  +800ms  receipt auto-feeds out   (1.5 s, power2.out)
 *  done    receipt floats; Print / Back to orders appear
 * ───────────────────────────────────────────────────────────── */

type Phase = "idle" | "printing" | "done";

const T = {
  printerDelay:  0.06,
  feedDelay:     0.2,
  feedDuration:  1.5,
  floatY:        8,
  floatDuration: 2.0,
};

const PW      = 460;
const BODY_H  = Math.round(460 * 273 / 915);   // 137

const R_TOP     = Math.round(202  * 460 / 915); // 102
const R_LEFT    = Math.round(88   * 460 / 915); // 44
const R_W       = Math.round(742  * 460 / 915); // 373
const R_H       = Math.round(1066 * 460 / 915); // 536
const R_INNER_W = 741;
const R_INNER_H = 1065;
const R_SCALE   = R_W / R_INNER_W;             // ≈ 0.5034

const RECEIPT_INIT_Y = -488;

// ── Print sound ──────────────────────────────────────────────────
function playPrintSound(duration = 1.7) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (0.4 + 0.25 * Math.sin((i / ctx.sampleRate) * Math.PI * 18));
    }
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const lp   = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1100;
    const gain = ctx.createGain();
    const t0   = ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.18, t0 + 0.08);
    gain.gain.setValueAtTime(0.18, t0 + duration - 0.25);
    gain.gain.linearRampToValueAtTime(0, t0 + duration);
    src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(t0 + duration);
  } catch { /* audio not available */ }
}

// ── SVG divider line ─────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ width: "100%", height: 1, position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: "-1.53px 0 0 0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/receipt_divider.svg" alt="" style={{ display: "block", width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

// ── Receipt content at 741 × 1065 px (scaled down by R_SCALE) ────
function SfxOrderReceipt({ order }: { order: Order }) {
  const createdAt  = parseISO(order.created_at);
  const statusMeta = STATUS_META[order.status];
  const SANS: React.CSSProperties = { fontFamily: "var(--font-geist-sans, 'Inter', system-ui, sans-serif)" };
  const MONO: React.CSSProperties = { fontFamily: "var(--font-geist-mono, 'ui-monospace', monospace)" };

  return (
    <div style={{ position: "relative", width: R_INNER_W, height: R_INNER_H }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/receipt_bg.svg"
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
      <div style={{
        position: "relative", zIndex: 1,
        padding: "62px 46px 46px",
        display: "flex", flexDirection: "column",
        height: "100%",
      }}>
        {/* Letterhead */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-primary.svg"
            alt="SFx Burger"
            style={{ width: 72, height: 72, margin: "0 auto 14px", display: "block" }}
          />
          <p style={{ ...SANS, fontSize: 16, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "#7B3F00", opacity: 0.55, lineHeight: 1 }}>
            Unique Taste Everyday
          </p>
        </div>

        <Divider />

        {/* Sequence */}
        <div style={{ textAlign: "center", padding: "22px 0" }}>
          <p style={{ ...SANS, fontSize: 17, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" as const, color: "#2C2C2C", opacity: 0.32, marginBottom: 10, lineHeight: 1 }}>
            Receipt
          </p>
          <p style={{ ...MONO, fontSize: 40, fontWeight: 700, color: "#2C2C2C", lineHeight: 1 }}>
            {order.seq_number}
          </p>
        </div>

        <Divider />

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 0" }}>
          <RRow SANS={SANS} label="Customer" value={order.customer_name} />
          {order.customer_phone && <RRow SANS={SANS} label="Phone" value={order.customer_phone} />}
          <RRow SANS={SANS} label="Date" value={format(createdAt, "dd MMM yyyy, HH:mm")} />
          <RRow SANS={SANS} label="Status" value={statusMeta.label} />
          {order.order_type === "bulk" && order.scheduled_date && (
            <RRow SANS={SANS} label="Scheduled" value={format(parseISO(order.scheduled_date), "EEE, dd MMM yyyy")} />
          )}
          {order.fulfillment_type === "delivery" && order.delivery_address ? (
            <RRow SANS={SANS} label="Deliver to" value={order.delivery_address} />
          ) : order.fulfillment_type === "pickup" ? (
            <RRow SANS={SANS} label="Fulfillment" value="Pickup" />
          ) : null}
        </div>

        <Divider />

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 0" }}>
          {order.items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...SANS, fontSize: 22, fontWeight: 500, color: "#2C2C2C" }}>{item.menu_item_name}</span>
                <span style={{ ...MONO, fontSize: 18, color: "#2C2C2C", opacity: 0.4, marginLeft: 8 }}>× {item.quantity}</span>
              </div>
              <span style={{ ...MONO, fontSize: 22, fontWeight: 500, color: "#2C2C2C", flexShrink: 0 }}>
                {formatTL(item.unit_price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Divider />

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0" }}>
          <span style={{ ...SANS, fontSize: 28, fontWeight: 700, color: "#2C2C2C" }}>Total</span>
          <span style={{ ...MONO, fontSize: 32, fontWeight: 700, color: "#D7263D" }}>
            {formatTL(order.total_amount)}
          </span>
        </div>

        {/* Notes */}
        {order.notes && (
          <>
            <Divider />
            <div style={{ padding: "16px 0" }}>
              <p style={{ ...SANS, fontSize: 16, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#2C2C2C", opacity: 0.32, marginBottom: 10, lineHeight: 1 }}>Notes</p>
              <p style={{ ...SANS, fontSize: 22, color: "#2C2C2C" }}>{order.notes}</p>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: "auto", paddingTop: 28, textAlign: "center" }}>
          <p style={{ ...SANS, fontSize: 20, color: "#2C2C2C", opacity: 0.38, marginBottom: 10 }}>Thank you for your order!</p>
          <p style={{ ...MONO, fontSize: 18, color: "#2C2C2C", opacity: 0.45 }}>+90 533 841 09 38</p>
        </div>
      </div>
    </div>
  );
}

function RRow({ SANS, label, value }: { SANS: React.CSSProperties; label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
      <span style={{ ...SANS, fontSize: 20, color: "#2C2C2C", opacity: 0.4, flexShrink: 0 }}>{label}</span>
      <span style={{ ...SANS, fontSize: 20, color: "#2C2C2C", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── Print-only receipt (Tailwind, hidden on screen) ──────────────
function PrintPaper({ order }: { order: Order }) {
  const createdAt  = parseISO(order.created_at);
  const statusMeta = STATUS_META[order.status];
  return (
    <div className="hidden print:block w-full max-w-[360px] mx-auto bg-sfx-cream">
      <div className="px-6 pt-6 pb-5 text-center border-b border-sfx-charcoal/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-primary.svg" alt="SFx Burger" className="w-[52px] h-[52px] mx-auto mb-2.5" />
        <p className="text-[10px] tracking-[0.25em] uppercase font-medium text-sfx-charcoal/50">Unique Taste Everyday</p>
      </div>
      <div className="px-6 py-4 text-center border-b border-dashed border-sfx-charcoal/20">
        <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-sfx-charcoal/40 mb-1">Receipt</p>
        <p className="font-mono text-2xl font-bold text-sfx-charcoal">{order.seq_number}</p>
      </div>
      <div className="px-6 py-4 space-y-2.5 border-b border-dashed border-sfx-charcoal/20 text-sm">
        <PPRow label="Customer" value={order.customer_name} />
        {order.customer_phone && <PPRow label="Phone" value={order.customer_phone} />}
        <PPRow label="Date" value={format(createdAt, "dd MMM yyyy, HH:mm")} />
        <PPRow label="Status" value={statusMeta.label} />
        {order.order_type === "bulk" && order.scheduled_date && (
          <PPRow label="Scheduled" value={format(parseISO(order.scheduled_date), "EEE, dd MMM yyyy")} />
        )}
        {order.fulfillment_type === "delivery" && order.delivery_address ? (
          <PPRow label="Deliver to" value={order.delivery_address} />
        ) : order.fulfillment_type === "pickup" ? (
          <PPRow label="Fulfillment" value="Pickup" />
        ) : null}
      </div>
      <div className="px-6 py-4 border-b border-dashed border-sfx-charcoal/20 space-y-2.5">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="text-sfx-charcoal font-medium">{item.menu_item_name}</span>
              <span className="font-mono text-sfx-charcoal/50 ml-1 text-xs">× {item.quantity}</span>
            </div>
            <span className="font-mono text-sfx-charcoal flex-shrink-0">
              {formatTL(item.unit_price * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 border-b border-dashed border-sfx-charcoal/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-sfx-charcoal">Total</span>
          <span className="font-mono text-lg font-bold text-sfx-red">
            {formatTL(order.total_amount)}
          </span>
        </div>
      </div>
      {order.notes && (
        <div className="px-6 py-3 border-b border-dashed border-sfx-charcoal/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sfx-charcoal/40 mb-1">Notes</p>
          <p className="text-sm text-sfx-charcoal">{order.notes}</p>
        </div>
      )}
      <div className="px-6 py-5 text-center">
        <p className="text-xs text-sfx-charcoal/50 mb-1">Thank you for your order!</p>
        <p className="text-xs font-mono text-sfx-charcoal/60">+90 533 841 09 38</p>
      </div>
    </div>
  );
}

function PPRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-sfx-charcoal/50 flex-shrink-0">{label}</span>
      <span className="text-sfx-charcoal text-right">{value}</span>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────
export function PrinterReceipt({ order }: { order: Order }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const receiptRef        = useRef<HTMLDivElement>(null);
  const tlRef             = useRef<gsap.core.Timeline | null>(null);

  // Shared animation runner — used by auto-start and "Print again"
  const runAnimation = useCallback(() => {
    const el = receiptRef.current;
    if (!el) return;
    tlRef.current?.kill();
    gsap.set(el, { y: RECEIPT_INIT_Y });
    setPhase("printing");
    playPrintSound(T.feedDelay + T.feedDuration + 0.1);
    const tl = gsap.timeline();
    tl.to(el, { y: 0, duration: T.feedDuration, ease: "power2.out", delay: T.feedDelay, onComplete: () => setPhase("done") });
    tl.to(el, { y: T.floatY, duration: T.floatDuration, ease: "sine.inOut", yoyo: true, repeat: -1 }, ">0.2");
    tlRef.current = tl;
  }, []);

  // Auto-start: wait for printer entrance spring to settle (~800 ms), then feed receipt
  useEffect(() => {
    gsap.set(receiptRef.current, { y: RECEIPT_INIT_Y });
    const timer = setTimeout(runAnimation, 800);
    return () => {
      clearTimeout(timer);
      tlRef.current?.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Print output — hidden on screen, renders when window.print() fires */}
      <PrintPaper order={order} />

      {/* Animated printer — hidden during actual printing */}
      <div
        className="print:hidden"
        style={{
          minHeight: "100vh",
          display: "flex", flexDirection: "column",
          background: "var(--background)",
        }}
      >
        {/* Page header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "var(--background)",
          borderBottom: "1px solid color-mix(in oklch, var(--sidebar-border) 100%, transparent)",
          height: 60,
          display: "flex", alignItems: "center",
          padding: "0 24px",
        }}>
          {/* Left: Back to orders */}
          <Link
            href="/orders"
            style={{
              fontFamily: "var(--font-geist-sans, 'Inter', system-ui, sans-serif)",
              fontSize: 13, color: "var(--muted-foreground)",
              textDecoration: "none", letterSpacing: "-0.084px",
              flexShrink: 0,
            }}
          >
            ← Back to orders
          </Link>

          {/* Centre: seq number — absolutely positioned so it's always centred regardless of button widths */}
          <span style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            fontFamily: "var(--font-geist-mono, 'ui-monospace', monospace)",
            fontSize: 13, fontWeight: 600, color: "var(--foreground)",
            pointerEvents: "none",
          }}>
            {order.seq_number}
          </span>

          {/* Right: Print button */}
          <motion.button
            onClick={() => window.print()}
            disabled={phase !== "done"}
            whileHover={phase === "done" ? { scale: 1.04 } : {}}
            whileTap={phase === "done" ? { scale: 0.96 } : {}}
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-geist-sans, 'Inter', system-ui, sans-serif)",
              background: phase === "done" ? "#D7263D" : "var(--muted)",
              border: "none", borderRadius: 8, padding: "8px 20px",
              fontSize: 13, fontWeight: 600, letterSpacing: "-0.1px",
              color: phase === "done" ? "white" : "var(--muted-foreground)",
              cursor: phase === "done" ? "pointer" : "not-allowed",
              transition: "background 0.3s, color 0.3s",
              flexShrink: 0,
            }}
          >
            {phase === "printing" ? "Printing…" : "Print"}
          </motion.button>
        </div>

        {/* Printer + receipt centred below header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 48, paddingBottom: 60 }}>
        {/* Printer body + receipt */}
        <div style={{ position: "relative", width: PW, height: BODY_H, flexShrink: 0 }}>
          {/* Mask above the paper slot — must match page background exactly */}
          <div style={{
            position: "absolute", top: -600, left: -120,
            width: PW + 240, height: 600,
            background: "var(--background)", zIndex: 15, pointerEvents: "none",
          }} />

          {/* Receipt card — GSAP animates translateY */}
          <div
            ref={receiptRef}
            style={{
              position: "absolute", top: R_TOP, left: R_LEFT,
              width: R_W, height: R_H, zIndex: 10,
              filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.13)) drop-shadow(0 3px 8px rgba(0,0,0,0.07))",
            }}
          >
            <div style={{ width: R_INNER_W, height: R_INNER_H, transform: `scale(${R_SCALE})`, transformOrigin: "top left" }}>
              <SfxOrderReceipt order={order} />
            </div>
          </div>

          {/* Printer body — springs in on mount */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: T.printerDelay }}
            style={{
              position: "absolute", top: 0, left: 0, zIndex: 20, lineHeight: 0,
              filter: "drop-shadow(0 24px 52px rgba(0,0,0,0.18)) drop-shadow(0 6px 16px rgba(0,0,0,0.12))",
            }}
          >
            {/*
              Printer body: warm off-white gradient to match the dashboard's near-white background.
              The darker lower section and charcoal paper slot provide contrast so the printer pops
              on both light and dark backgrounds.
            */}
            <svg width={PW} height={BODY_H} viewBox="0 0 915 273" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
              <defs>
                {/* Body: warm near-white top → cool light-grey mid → muted mid-grey base */}
                <linearGradient id="pbGrad" x1="0" y1="0" x2="0" y2="273" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#f5f1ed" />
                  <stop offset="42%"  stopColor="#e8e2da" />
                  <stop offset="100%" stopColor="#d4cdc4" />
                </linearGradient>
                {/* Satin highlight: soft white sheen on the upper-centre */}
                <radialGradient id="pbSatin" cx="50%" cy="16%" rx="40%" ry="28%">
                  <stop offset="0%"  stopColor="rgba(255,255,255,0.72)" />
                  <stop offset="40%" stopColor="rgba(255,255,255,0.28)" />
                  <stop offset="70%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                {/* Edge vignette: darkens left and right rims for depth */}
                <linearGradient id="pbEdge" x1="0" y1="0" x2="915" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="rgba(0,0,0,0.14)" />
                  <stop offset="6%"   stopColor="rgba(0,0,0,0)" />
                  <stop offset="94%"  stopColor="rgba(0,0,0,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.14)" />
                </linearGradient>
              </defs>
              <path d="M6.453 37.318C14.594 15.499 38.726 0.953984 61.536 0.895984C108.174 0.776984 154.813 0.878974 201.452 0.885974L480.59 0.896991L730.13 0.891986C771.31 0.888986 812.84 0.670002 854.03 0.959002C860.55 1.005 867.79 2.18498 873.9 4.43398C888.87 9.83798 900.99 21.132 907.42 35.692C915.2 47.969 914.97 85.885 913.63 100.47C913.68 113.99 914.87 170.736 912.15 180.64C910.61 203.777 911.67 245.055 894.29 261.033C879.54 274.596 856.57 272.256 837.84 272.04L837.83 256.793L837.82 245.209L79.047 245.216L79.05 256.901L79.092 272.008C66.206 272.223 52.641 273.578 40.869 268.495C13.146 256.739 13.016 222.537 8.55298 196.177C-2.92702 174.888 1.21802 120.221 1.30902 94.199C0.445022 78.162 -0.093996 51.577 6.453 37.318Z" fill="url(#pbGrad)" />
              <path d="M6.453 37.318C14.594 15.499 38.726 0.953984 61.536 0.895984C108.174 0.776984 154.813 0.878974 201.452 0.885974L480.59 0.896991L730.13 0.891986C771.31 0.888986 812.84 0.670002 854.03 0.959002C860.55 1.005 867.79 2.18498 873.9 4.43398C888.87 9.83798 900.99 21.132 907.42 35.692C915.2 47.969 914.97 85.885 913.63 100.47C913.68 113.99 914.87 170.736 912.15 180.64C910.61 203.777 911.67 245.055 894.29 261.033C879.54 274.596 856.57 272.256 837.84 272.04L837.83 256.793L837.82 245.209L79.047 245.216L79.05 256.901L79.092 272.008C66.206 272.223 52.641 273.578 40.869 268.495C13.146 256.739 13.016 222.537 8.55298 196.177C-2.92702 174.888 1.21802 120.221 1.30902 94.199C0.445022 78.162 -0.093996 51.577 6.453 37.318Z" fill="url(#pbSatin)" />
              <path d="M6.453 37.318C14.594 15.499 38.726 0.953984 61.536 0.895984C108.174 0.776984 154.813 0.878974 201.452 0.885974L480.59 0.896991L730.13 0.891986C771.31 0.888986 812.84 0.670002 854.03 0.959002C860.55 1.005 867.79 2.18498 873.9 4.43398C888.87 9.83798 900.99 21.132 907.42 35.692C915.2 47.969 914.97 85.885 913.63 100.47C913.68 113.99 914.87 170.736 912.15 180.64C910.61 203.777 911.67 245.055 894.29 261.033C879.54 274.596 856.57 272.256 837.84 272.04L837.83 256.793L837.82 245.209L79.047 245.216L79.05 256.901L79.092 272.008C66.206 272.223 52.641 273.578 40.869 268.495C13.146 256.739 13.016 222.537 8.55298 196.177C-2.92702 174.888 1.21802 120.221 1.30902 94.199C0.445022 78.162 -0.093996 51.577 6.453 37.318Z" fill="url(#pbEdge)" />
              {/* Lower-body shadow strip */}
              <path d="M12.185 198.952C18.021 204.52 21.809 209.803 29 214.484C51.911 229.399 87.703 224.591 114.766 224.601L228.8 224.578L581.68 224.561L776.5 224.574L826.74 224.712C860.57 224.809 886.81 226.691 906.02 192.246C908.2 188.344 909.55 184.247 912.15 180.64C910.61 203.777 911.67 245.055 894.29 261.033C879.54 274.596 856.57 272.256 837.84 272.04L837.83 256.793L837.82 245.209L79.047 245.216L79.05 256.901L79.092 272.008C66.206 272.223 52.641 273.578 40.869 268.495C13.146 256.739 13.016 222.537 8.55298 196.177L10.074 195.805C11.138 197.159 11.572 197.418 12.185 198.952Z" fill="rgba(0,0,0,0.06)" />
              {/* Paper slot — charcoal so the white receipt paper reads crisply against it */}
              <path d="M79.05 256.901C70.623 257.056 63.632 258.241 57.038 251.901C47.845 243.062 58.301 234.462 67.603 234.216C85.768 233.736 104.006 233.979 122.182 234.024L230.618 234.086L692.27 234.076L806.7 234.074C820.89 234.074 836.81 233.625 850.99 234.535C856.65 234.897 863.08 242.207 860.14 247.942C855.66 258.055 846.8 257.139 837.83 256.793L837.82 245.209L79.047 245.216L79.05 256.901Z" fill="#2C2C2C" />
            </svg>
          </motion.div>
        </div>

        </div>
      </div>
    </>
  );
}
