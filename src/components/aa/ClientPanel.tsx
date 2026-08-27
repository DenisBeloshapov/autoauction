"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ListChecks,
  Trophy,
  Truck,
  Plus,
  Trash,
  Package,
  CircleNotch,
  X,
  Check,
  User,
  MapPin,
  Hash,
  FileText,
  Calendar,
  Coins,
  Cube,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell, type Tab } from "./AppShell";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/use-realtime";
import { useConfirm } from "./ConfirmDialog";

type Lot = {
  id: string;
  lotNumber: string;
  rawText: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  client: { id: string; name: string | null; username: string };
  wonLot: {
    id: string;
    price: number | null;
    currency: string;
    status: string;
  } | null;
};

type WonLot = {
  id: string;
  price: number | null;
  currency: string;
  status: string;
  lot: {
    id: string;
    lotNumber: string;
    rawText: string | null;
    client: { id: string; name: string | null; username: string };
  };
  deliveryReqs: {
    id: string;
    method: string | null;
    status: string;
    ownerFullName: string | null;
    ownerAddress: string | null;
    createdAt: string;
  }[];
};

const METHODS = [
  "DUTY",
  "DISASSEMBLY",
  "CUT_REAR",
  "CUT_FRONT",
  "CUT_REAR_ARCS",
] as const;
type Method = (typeof METHODS)[number];

// Stagger animation: cards appear one after another
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, damping: 22, stiffness: 280 },
  },
};

export function ClientPanel() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("myLots");
  const [lots, setLots] = useState<Lot[]>([]);
  const [wonLots, setWonLots] = useState<WonLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [lotEntries, setLotEntries] = useState<string[]>([""]);
  const [lotComment, setLotComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delivery modal state
  const [deliveryWonLot, setDeliveryWonLot] = useState<WonLot | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<Method>("DUTY");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);
  const [deliveryErrors, setDeliveryErrors] = useState<{ ownerFullName?: boolean; ownerAddress?: boolean }>({});

  const { confirm, dialog: confirmDialog } = useConfirm();

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [lotsRes, wonRes] = await Promise.all([
        fetch("/api/lots", { headers: authHeaders }),
        fetch("/api/won-lots", { headers: authHeaders }),
      ]);
      if (lotsRes.ok) {
        const data = await lotsRes.json();
        setLots(data.lots || []);
      }
      if (wonRes.ok) {
        const data = await wonRes.json();
        setWonLots(data.wonLots || []);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Realtime: обновляем данные при WS-событиях — тихо, без полноэкранного спиннера
  useRealtime(["lot:created", "lot:updated", "lot:deleted", "wonlot:created", "delivery:created"], () => {
    loadData(true);
  });

  const tabs: Tab[] = [
    { key: "myLots", label: t("nav.requests"), icon: <ListChecks className="w-4 h-4" /> },
    { key: "delivery", label: t("nav.wonSection"), icon: <Truck className="w-4 h-4" /> },
  ];

  // --- Multiple-lots form helpers ---
  const addLotEntry = () => {
    setLotEntries((prev) => [...prev, ""]);
  };
  const removeLotEntry = (idx: number) => {
    setLotEntries((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateLotEntry = (idx: number, val: string) => {
    if (val.includes("\n")) {
      const lines = val.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        // Bulk paste: each non-empty line is structurally one lot — explode into separate entries
        setLotEntries((prev) => {
          const next = [...prev];
          next.splice(idx, 1, ...lines);
          return next;
        });
        return;
      }
      if (lines.length === 1) {
        setLotEntries((prev) => prev.map((e, i) => (i === idx ? lines[0] : e)));
        return;
      }
      // all-blank paste (e.g. trailing newline only) — fall through to normal update below
    }
    setLotEntries((prev) => prev.map((e, i) => (i === idx ? val : e)));
  };

  // Extract lot number from text (first number sequence). A lot number is always digits-only —
  // strip any stray glued-on characters (e.g. a leading "\") and any thousand separators.
  const extractLotNumber = (text: string): string | null => {
    const m = text.match(/\d{1,3}(?:[,.]\d{3})+|\d+/);
    return m ? m[0].replace(/[^\d]/g, "") : null;
  };

  // Valid lots = non-empty entries with an extractable lot number
  const validLots = lotEntries
    .map((text, idx) => ({ idx, text, lotNumber: extractLotNumber(text) }))
    .filter((e) => e.text.trim() && e.lotNumber);

  const submitLots = async () => {
    if (validLots.length === 0) return;
    setSubmitting(true);
    let created = 0;
    let failed = 0;
    try {
      for (const entry of validLots) {
        const res = await fetch("/api/lots", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            lotText: entry.text,
            comment: lotComment || null,
          }),
        });
        if (res.ok) {
          created++;
        } else {
          failed++;
          const data = await res.json().catch(() => ({}));
          toast.error(`#${entry.lotNumber}: ${data.error || t("common.error")}`);
        }
      }
      if (created > 0) {
        toast.success(t("lots.batchCreated").replace("{n}", String(created)));
      }
      if (failed === 0) {
        setLotEntries([""]);
        setLotComment("");
        setShowAdd(false);
        await loadData();
      } else {
        // Keep entries that failed for correction
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLot = async (id: string) => {
    if (!(await confirm(t("lots.deleteConfirm"), { danger: true, confirmLabel: t("common.delete") }))) return;
    const snapshot = lots;
    setLots((prev) => prev.filter((l) => l.id !== id));
    const res = await fetch(`/api/lots?id=${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (res.ok) {
      toast.success(t("common.success"));
      loadData(true);
    } else {
      setLots(snapshot);
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || t("common.error"));
    }
  };

  const submitDelivery = async () => {
    if (!deliveryWonLot || deliverySubmitting) return;
    if (deliveryMethod === "DUTY") {
      const errors = { ownerFullName: !ownerFullName.trim(), ownerAddress: !ownerAddress.trim() };
      if (errors.ownerFullName || errors.ownerAddress) {
        setDeliveryErrors(errors);
        return;
      }
    }
    setDeliverySubmitting(true);
    const res = await fetch("/api/delivery", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        wonLotId: deliveryWonLot.id,
        method: deliveryMethod,
        ownerFullName: deliveryMethod === "DUTY" ? ownerFullName : null,
        ownerAddress: deliveryMethod === "DUTY" ? ownerAddress : null,
      }),
    });
    setDeliverySubmitting(false);
    if (res.ok) {
      toast.success(t("common.success"));
      setDeliveryWonLot(null);
      setOwnerFullName("");
      setOwnerAddress("");
      setDeliveryErrors({});
      loadData(true);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || t("common.error"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <CircleNotch className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <AppShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fab={
        activeTab === "myLots"
          ? { label: t("lots.add"), icon: <Plus className="w-5 h-5" />, onClick: () => setShowAdd(true) }
          : undefined
      }
    >
      {activeTab === "myLots" && (
        <div>
          <div className="hidden md:flex items-center justify-between mb-6">
            <h1 className="aa-serif text-2xl font-semibold">{t("nav.requests")}</h1>
            <button
              onClick={() => setShowAdd(true)}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> {t("lots.add")}
            </button>
          </div>
          <h1 className="aa-serif md:hidden text-xl font-semibold mb-4">{t("nav.requests")}</h1>

          {lots.length === 0 ? (
            <EmptyState icon={<Package className="w-10 h-10 text-muted-foreground" />} text={t("lots.noLots")} />
          ) : (
            <MyLotsGrouped
              lots={lots}
              t={t}
              onDelete={deleteLot}
            />
          )}
        </div>
      )}

      {activeTab === "delivery" && (
        <div>
          <h1 className="aa-serif text-2xl font-semibold mb-6">{t("nav.wonSection")}</h1>
          {wonLots.length === 0 ? (
            <EmptyState icon={<Trophy className="w-10 h-10 text-muted-foreground" />} text={t("wonLots.noWonLots")} />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {wonLots.map((wl) => {
                const req = wl.deliveryReqs[0];
                const isDuty = req?.method === "DUTY";
                const awaitingMethod = wl.deliveryReqs.length === 0;
                return (
                  <motion.div
                    key={wl.id}
                    variants={itemVariants}
                    className="aa-card aa-card-hover overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between p-5 pb-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                          <Truck className="w-5 h-5 text-background" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {t("delivery.lotNumber")}
                          </div>
                          <div className="text-xl font-extrabold aa-mono text-primary mt-0.5 truncate">
                            #{wl.lot.lotNumber}
                          </div>
                        </div>
                      </div>
                      {awaitingMethod ? (
                        <StatusBadge status="AWAITING" label={t("wonStatus.awaitingMethod")} pulse />
                      ) : (
                        <StatusBadge status={wl.status} label={t(`wonStatus.${wl.status}`)} pulse={wl.status === "DELIVERY_REQUESTED"} />
                      )}
                    </div>

                    {/* Body */}
                    <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Lot info */}
                      <div className="space-y-2.5">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                          <FileText className="w-3 h-3" />
                          {t("delivery.lotInfo")}
                        </div>
                        <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label={t("delivery.lotNumber")} value={`#${wl.lot.lotNumber}`} mono />
                        <InfoRow icon={<Coins className="w-3.5 h-3.5" />} label={t("delivery.price")} value={wl.price != null ? `${wl.price.toLocaleString()} ${t("wonLots.currency")}` : "—"} mono />
                        {!awaitingMethod && (
                          <InfoRow icon={<Truck className="w-3.5 h-3.5" />} label={t("delivery.method")} value={req?.method ? t(`delivery.${req.method}`) : "—"} />
                        )}
                        {!awaitingMethod && (
                          <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label={t("delivery.createdAt")} value={req ? new Date(req.createdAt).toLocaleString() : "—"} />
                        )}
                        {wl.lot.rawText && (
                          <div className="pt-2 mt-1 border-t border-border/60">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                              {t("delivery.rawText")}
                            </div>
                            <p className="text-xs text-foreground/80 break-words">
                              {wl.lot.rawText}
                            </p>
                          </div>
                        )}
                        {awaitingMethod && (
                          <button
                            onClick={() => {
                              setDeliveryWonLot(wl);
                              setDeliveryMethod("DUTY");
                              setOwnerFullName("");
                              setOwnerAddress("");
                              setDeliveryErrors({});
                            }}
                            className="w-full h-10 mt-1 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors"
                          >
                            <Truck className="w-4 h-4" /> {t("delivery.chooseMethod")}
                          </button>
                        )}
                      </div>

                      {/* Owner data (only for DUTY) */}
                      {isDuty && (
                        <div className="space-y-2.5 sm:border-l sm:border-border/60 sm:pl-4">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {t("delivery.ownerData")}
                          </div>
                          <InfoRow icon={<User className="w-3.5 h-3.5" />} label={t("delivery.ownerFullName")} value={req?.ownerFullName || "—"} />
                          <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label={t("delivery.ownerAddress")} value={req?.ownerAddress || "—"} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}

      {/* Add Lot Modal — multiple lots + shared comment */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={t("lots.add")}
        size="xl"
        footer={
          <>
            <button
              onClick={() => setShowAdd(false)}
              className="h-10 px-4 rounded-md border border-border hover:bg-muted text-sm font-medium transition"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={submitLots}
              disabled={submitting || validLots.length === 0}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors hover:bg-primary/90"
            >
              {submitting && <CircleNotch className="w-4 h-4 animate-spin" />}
              {t("lots.saveN").replace("{n}", String(validLots.length))}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Lot entries list */}
          <div className="space-y-3">
            {lotEntries.map((entry, idx) => {
              const lotNum = extractLotNumber(entry);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 24, stiffness: 300 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("lots.lotN").replace("{n}", String(idx + 1))}
                    </label>
                    {lotEntries.length > 1 && (
                      <button
                        onClick={() => removeLotEntry(idx)}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition"
                        aria-label={t("lots.removeLot")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <textarea
                      value={entry}
                      onChange={(e) => updateLotEntry(idx, e.target.value)}
                      placeholder={t("lots.lotTextPlaceholder")}
                      rows={2}
                      autoFocus={idx === 0}
                      className="flex-1 rounded-md border border-input bg-background p-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/30 transition-colors resize-none"
                    />
                  </div>
                  {entry.trim() && (
                    <p className="text-xs text-muted-foreground">
                      {t("lots.lotNumber")}:{" "}
                      <span className="aa-mono font-bold text-primary">
                        {lotNum ? `#${lotNum}` : "—"}
                      </span>
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Add another lot button */}
          <button
            onClick={addLotEntry}
            className="w-full h-11 rounded-md border-2 border-dashed border-border hover:border-primary/40 hover:bg-accent/40 text-sm font-medium text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            {t("lots.addAnother")}
          </button>

          {/* Separator */}
          <div className="border-t border-border/60 pt-4 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("lots.commentAll")}
            </label>
            <textarea
              value={lotComment}
              onChange={(e) => setLotComment(e.target.value)}
              placeholder={t("lots.commentAllPlaceholder")}
              rows={2}
              className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/30 transition-colors resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Delivery Modal */}
      <Modal
        open={!!deliveryWonLot}
        onClose={() => { setDeliveryWonLot(null); setDeliveryErrors({}); }}
        title={t("delivery.chooseMethod")}
        size="md"
        footer={
          <>
            <button
              onClick={() => { setDeliveryWonLot(null); setDeliveryErrors({}); }}
              className="h-10 px-4 rounded-md border border-border hover:bg-muted text-sm font-medium transition"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={submitDelivery}
              disabled={deliverySubmitting}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5"
            >
              {deliverySubmitting && <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />}
              {t("common.save")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {deliveryWonLot && (
            <div className="text-sm text-muted-foreground">
              {t("lots.lotNumber")}:{" "}
              <span className="aa-mono font-bold text-primary text-base">
                #{deliveryWonLot.lot.lotNumber}
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("delivery.method")}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setDeliveryMethod(m); setDeliveryErrors({}); }}
                  className={`text-left p-3 rounded-md border text-sm font-medium transition ${
                    deliveryMethod === m
                      ? "border-primary bg-accent text-accent-foreground shadow-sm"
                      : "border-border hover:bg-muted hover:border-primary/30"
                  }`}
                >
                  {t(`delivery.${m}`)}
                </button>
              ))}
            </div>
          </div>
          {deliveryMethod === "DUTY" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("delivery.ownerFullName")} *
                </label>
                <input
                  type="text"
                  value={ownerFullName}
                  onChange={(e) => { setOwnerFullName(e.target.value); if (deliveryErrors.ownerFullName) setDeliveryErrors((p) => ({ ...p, ownerFullName: false })); }}
                  placeholder={t("delivery.ownerFullNamePlaceholder")}
                  className={`w-full h-11 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 transition-colors ${
                    deliveryErrors.ownerFullName
                      ? "border-destructive focus:ring-destructive/30 focus:border-destructive"
                      : "border-input focus:ring-foreground/30 focus:border-foreground/30"
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("delivery.ownerAddress")} *
                </label>
                <input
                  type="text"
                  value={ownerAddress}
                  onChange={(e) => { setOwnerAddress(e.target.value); if (deliveryErrors.ownerAddress) setDeliveryErrors((p) => ({ ...p, ownerAddress: false })); }}
                  placeholder={t("delivery.ownerAddressPlaceholder")}
                  className={`w-full h-11 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 transition-colors ${
                    deliveryErrors.ownerAddress
                      ? "border-destructive focus:ring-destructive/30 focus:border-destructive"
                      : "border-input focus:ring-foreground/30 focus:border-foreground/30"
                  }`}
                />
              </div>
            </motion.div>
          )}
        </div>
      </Modal>

      {confirmDialog}
    </AppShell>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="aa-card p-12 flex flex-col items-center justify-center text-center">
      {icon}
      <p className="text-sm text-muted-foreground mt-3">{text}</p>
    </div>
  );
}

/** Group client lots into "kits" — sets sharing the same non-empty comment. */
function MyLotsGrouped({
  lots,
  t,
  onDelete,
}: {
  lots: Lot[];
  t: (k: string) => string;
  onDelete: (id: string) => void | Promise<void>;
}) {
  // Group by comment (lots without a comment → individual group of size 1 each)
  type Group = {
    key: string;
    comment: string | null;
    lots: Lot[];
  };

  const groups: Group[] = (() => {
    const map = new Map<string, Lot[]>();
    const individual: Lot[] = [];

    for (const lot of lots) {
      const c = lot.comment && lot.comment.trim() ? lot.comment.trim() : null;
      if (c) {
        if (!map.has(c)) map.set(c, []);
        map.get(c)!.push(lot);
      } else {
        individual.push(lot);
      }
    }

    const out: Group[] = [];
    map.forEach((lotsArr, comment) => {
      out.push({ key: `kit:${comment}`, comment, lots: lotsArr });
    });
    for (const lot of individual) {
      out.push({ key: `single:${lot.id}`, comment: null, lots: [lot] });
    }
    // Sort by each group's most recent lot — kits and individual lots interleave by true recency
    out.sort((a, b) => {
      const aMax = Math.max(...a.lots.map((l) => new Date(l.createdAt).getTime()));
      const bMax = Math.max(...b.lots.map((l) => new Date(l.createdAt).getTime()));
      return bMax - aMax;
    });
    return out;
  })();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {groups.map((group) => {
        const isKit = group.lots.length > 1;
        return (
          <motion.div key={group.key} variants={itemVariants} className="space-y-3">
            {/* Kit header */}
            {isKit && (
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-7 h-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
                  <Cube className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {t("lots.kit")}
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    💬 {group.comment}
                  </div>
                </div>
                <span className="ml-auto text-xs text-muted-foreground aa-mono">
                  {group.lots.length} {t("lots.kitLots")}
                </span>
              </div>
            )}

            {/* Lots grid */}
            <div className={`grid grid-cols-1 ${group.lots.length > 1 ? "md:grid-cols-2" : ""} gap-4`}>
              {group.lots.map((lot) => (
                <motion.div
                  key={lot.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="aa-card aa-card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {t("lots.lotNumber")}
                      </div>
                      <div className="text-2xl font-extrabold aa-mono text-primary mt-0.5">
                        #{lot.lotNumber}
                      </div>
                    </div>
                    <StatusBadge status={lot.status} label={t(`status.${lot.status}`)} />
                  </div>
                  {lot.rawText && (
                    <p className="text-sm text-foreground mb-2 break-words">
                      {lot.rawText}
                    </p>
                  )}
                  {/* For single lots (no kit) show comment inline */}
                  {!isKit && lot.comment && (
                    <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-2.5 py-1.5">
                      💬 {lot.comment}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <span className="text-xs text-muted-foreground">
                      {new Date(lot.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onDelete(lot.id)}
                      className="text-xs text-destructive hover:underline flex items-center gap-1 transition"
                    >
                      <Trash className="w-3 h-3" /> {t("common.delete")}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {label}
        </div>
        <div className={`text-sm text-foreground break-words ${mono ? "aa-mono font-semibold" : "font-medium"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
