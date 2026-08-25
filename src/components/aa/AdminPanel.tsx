"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Stack,
  Users,
  Envelope,
  Trophy,
  PaperPlaneTilt,
  Plus,
  Copy,
  Trash,
  CircleNotch,
  Tray,
  CaretRight,
  ArrowLeft,
  Truck,
  Check,
  User,
  MapPin,
  Hash,
  FileText,
  Calendar,
  Coins,
  Package,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell, type Tab } from "./AppShell";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { toast } from "sonner";
import { useRealtime } from "@/hooks/use-realtime";
import { cn, stripLotNumber, parseSearchTerms } from "@/lib/utils";

type Lot = {
  id: string;
  lotNumber: string;
  rawText: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  client: { id: string; name: string | null; username: string };
  emailBatch: { id: string; subject: string; sentAt: string } | null;
};

type WonLot = {
  id: string;
  price: number | null;
  currency: string;
  bodyNumber: string | null;
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

type EmailBatch = {
  id: string;
  subject: string;
  recipientEmail: string;
  body: string;
  sentAt: string;
  lots?: { lotNumber: string }[];
};

type Client = {
  id: string;
  username: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { lots: number };
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, damping: 22, stiffness: 280 } },
};

function parseWonText(text: string): { lotNumber: string; price: string; bodyNumber: string | null }[] {
  const out: { lotNumber: string; price: string; bodyNumber: string | null }[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const nums = line.match(/\d{1,3}(?:[,.]\d{3})+|\d+/g) || [];
    if (nums.length === 0) continue;
    const firstNum = nums[0];
    const lastNum = nums[nums.length - 1];
    const lotNumber = firstNum.replace(/[,.]/g, "");
    const price = lastNum.replace(/[,.]/g, "");
    const firstIdx = line.indexOf(firstNum);
    const lastIdx = line.lastIndexOf(lastNum);
    let bodyNumber: string | null = null;
    if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx + firstNum.length) {
      bodyNumber = line.substring(firstIdx + firstNum.length, lastIdx).trim() || null;
    }
    out.push({ lotNumber, price, bodyNumber });
  }
  return out;
}

export function AdminPanel() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("allLots");
  const [lots, setLots] = useState<Lot[]>([]);
  const [wonLots, setWonLots] = useState<WonLot[]>([]);
  const [batches, setBatches] = useState<EmailBatch[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterClient, setFilterClient] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [emailPreview, setEmailPreview] = useState<{ body: string; subject: string; recipientEmail: string } | null>(null);
  const [wonInput, setWonInput] = useState("");
  const [showWonModal, setShowWonModal] = useState(false);
  const [viewBatch, setViewBatch] = useState<EmailBatch | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ username: "", password: "", name: "" });

  const [drilledClientId, setDrilledClientId] = useState<string | null>(null);
  const [clientLotsCache, setClientLotsCache] = useState<Record<string, Lot[]>>({});
  const [clientLotsLoading, setClientLotsLoading] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const loadLots = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterClient) params.set("clientId", filterClient);
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/lots?${params}`, { headers: authHeaders });
    if (res.ok) { const data = await res.json(); setLots(data.lots || []); }
  }, [token, filterClient, filterStatus]);

  const loadWonLots = useCallback(async () => {
    const res = await fetch("/api/won-lots", { headers: authHeaders });
    if (res.ok) { const data = await res.json(); setWonLots(data.wonLots || []); }
  }, [token]);

  const loadBatches = useCallback(async () => {
    const res = await fetch("/api/email", { headers: authHeaders });
    if (res.ok) { const data = await res.json(); setBatches(data.batches || []); }
  }, [token]);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/users", { headers: authHeaders });
    if (res.ok) { const data = await res.json(); setClients(data.users || []); }
  }, [token]);

  const loadClientLots = useCallback(async (clientId: string) => {
    const res = await fetch(`/api/lots?clientId=${clientId}`, { headers: authHeaders });
    if (res.ok) { return (await res.json()).lots || []; }
    return [];
  }, [token]);

  const openClientDrilldown = (clientId: string) => {
    setClientLotsLoading(clientId);
    setClientLotsCache((prev) => ({ ...prev, [clientId]: prev[clientId] || [] }));
    setDrilledClientId(clientId);
  };

  useEffect(() => {
    if (!drilledClientId) return;
    let cancelled = false;
    (async () => {
      const lotsList = await loadClientLots(drilledClientId);
      if (cancelled) return;
      setClientLotsCache((prev) => ({ ...prev, [drilledClientId]: lotsList }));
      setClientLotsLoading(null);
    })();
    return () => { cancelled = true; };
  }, [drilledClientId, loadClientLots]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadLots(), loadWonLots(), loadBatches(), loadClients()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeTab === "allLots") {
      let cancelled = false;
      (async () => { await loadLots(); if (cancelled) return; })();
      return () => { cancelled = true; };
    }
  }, [activeTab, filterClient, filterStatus, loadLots]);

  useRealtime(["lot:created", "lot:updated", "lot:deleted", "wonlot:created", "delivery:created", "email:sent"], () => {
    loadLots(); loadWonLots(); loadBatches();
  });

  const tabs: Tab[] = [
    { key: "allLots", label: t("nav.allLots"), icon: <Stack aria-hidden="true" size={16} weight="bold" /> },
    { key: "wonLots", label: t("nav.wonLots"), icon: <Trophy aria-hidden="true" size={16} weight="bold" /> },
    { key: "delivery", label: t("nav.delivery"), icon: <Truck aria-hidden="true" size={16} weight="bold" /> },
    { key: "clients", label: t("nav.clients"), icon: <Users aria-hidden="true" size={16} weight="bold" /> },
    { key: "emailHistory", label: t("email.history"), icon: <Envelope aria-hidden="true" size={16} weight="bold" /> },
  ];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (lots.length > 0 && lots.every((l) => selectedIds.has(l.id))) setSelectedIds(new Set());
    else setSelectedIds(new Set(lots.map((l) => l.id)));
  };

  const sendEmail = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { toast.error("Select at least one lot"); return; }
    const res = await fetch("/api/email", { method: "POST", headers: authHeaders, body: JSON.stringify({ lotIds: ids }) });
    if (res.ok) {
      const data = await res.json();
      setEmailPreview(data.preview);
      setSelectedIds(new Set());
      await Promise.all([loadLots(), loadBatches()]);
    } else { const data = await res.json().catch(() => ({})); toast.error(data.error || t("common.error")); }
  };

  const submitWon = async () => {
    if (!wonInput.trim()) return;
    const res = await fetch("/api/won-lots", { method: "POST", headers: authHeaders, body: JSON.stringify({ text: wonInput }) });
    if (res.ok) {
      const data = await res.json();
      toast.success(`${t("common.success")}: ${data.results.filter((r: { status: string }) => r.status !== "lot_not_found").length}/${data.processed}`);
      setWonInput(""); setShowWonModal(false);
      await Promise.all([loadLots(), loadWonLots()]);
    } else { const data = await res.json().catch(() => ({})); toast.error(data.error || t("common.error")); }
  };

  const submitNewClient = async () => {
    if (!newClient.username || !newClient.password) return;
    const res = await fetch("/api/users", { method: "POST", headers: authHeaders, body: JSON.stringify(newClient) });
    if (res.ok) { toast.success(t("common.success")); setNewClient({ username: "", password: "", name: "" }); setShowAddClient(false); await loadClients(); }
    else { const data = await res.json().catch(() => ({})); toast.error(data.error || t("common.error")); }
  };

  const copyToClipboard = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success(t("email.copy") + " ✓"); } catch { toast.error(t("common.error")); } };

  const deleteLot = async (id: string) => {
    if (!confirm(t("lots.deleteConfirm"))) return;
    const res = await fetch(`/api/lots?id=${id}`, { method: "DELETE", headers: authHeaders });
    if (res.ok) { await loadLots(); await loadWonLots();
      if (drilledClientId) { const f = await loadClientLots(drilledClientId); setClientLotsCache((p) => ({ ...p, [drilledClientId]: f })); }
    } else { const data = await res.json().catch(() => ({})); toast.error(data.error || t("common.error")); }
  };

  const deleteSelectedLots = async () => {
    const ids = Array.from(selectedIds); if (ids.length === 0) return;
    if (!confirm(t("lots.deleteSelectedConfirm").replace("{n}", String(ids.length)))) return;
    let deleted = 0, failed = 0;
    for (const id of ids) { const res = await fetch(`/api/lots?id=${id}`, { method: "DELETE", headers: authHeaders }); if (res.ok) deleted++; else failed++; }
    if (deleted > 0) toast.success(t("lots.deletedCount").replace("{n}", String(deleted)));
    if (failed > 0) toast.error(t("lots.deleteSomeFailed").replace("{n}", String(failed)));
    setSelectedIds(new Set()); await loadLots(); await loadWonLots();
  };

  const lotIndex = useMemo(() => {
    const m = new Map<string, { client: string; rawText: string | null }>();
    for (const lot of lots) m.set(lot.lotNumber, { client: lot.client.name || lot.client.username, rawText: lot.rawText });
    return m;
  }, [lots]);

  const wonPreview = useMemo(() => {
    return parseWonText(wonInput).map((p, idx) => {
      const known = lotIndex.get(p.lotNumber);
      const priceNum = parseFloat(p.price.replace(/[^\d.]/g, ""));
      return { index: idx + 1, lotNumber: p.lotNumber, price: isNaN(priceNum) ? null : priceNum, bodyNumber: p.bodyNumber, client: known?.client || null, matched: !!known };
    });
  }, [wonInput, lotIndex]);

  const wonTotal = wonPreview.reduce((acc, p) => acc + (p.matched && p.price ? p.price : 0), 0);

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-[#F7F6F3]"><CircleNotch aria-hidden="true" size={32} weight="bold" className="animate-spin text-[#111111]" /></div>);
  }

  return (
    <AppShell tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}
      fab={
        activeTab === "clients" && !drilledClientId ? { label: t("clients.add"), icon: <Plus aria-hidden="true" size={20} weight="bold" />, onClick: () => setShowAddClient(true) }
        : activeTab === "allLots" ? { label: t("lots.formEmail"), icon: <PaperPlaneTilt aria-hidden="true" size={20} weight="bold" />, onClick: sendEmail }
        : activeTab === "wonLots" ? { label: t("wonLots.acceptBids"), icon: <Trophy aria-hidden="true" size={20} weight="bold" />, onClick: () => setShowWonModal(true) }
        : undefined
      }
    >
      {activeTab === "allLots" && (
        <div>
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "var(--font-playfair)" }}>{t("nav.allLots")}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={deleteSelectedLots} disabled={selectedIds.size === 0} aria-label={t("lots.deleteSelected")} className="h-10 px-3 rounded-[6px] border border-[#FDEBEC] text-[#9F2F2D] hover:bg-[#FDEBEC] text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition">
                <Trash aria-hidden="true" size={16} weight="bold" /><span className="hidden sm:inline">{t("lots.deleteSelected")}</span>
                {selectedIds.size > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#FDEBEC] text-xs text-[#9F2F2D]">{selectedIds.size}</span>}
              </button>
              <button onClick={sendEmail} disabled={selectedIds.size === 0} className="h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:bg-[#333333] active:scale-[0.98] transition">
                <PaperPlaneTilt aria-hidden="true" size={16} weight="bold" /> {t("lots.formEmail")}
                {selectedIds.size > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/30 text-xs">{selectedIds.size}</span>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="h-10 px-3 rounded-[8px] border border-[#EAEAEA] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent">
              <option value="">{t("filter.byClient")}: {t("common.all")}</option>
              {clients.filter((c) => c.role === "CLIENT").map((c) => <option key={c.id} value={c.id}>{c.name || c.username}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 px-3 rounded-[8px] border border-[#EAEAEA] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent">
              <option value="">{t("filter.byStatus")}: {t("common.all")}</option>
              {["PENDING", "SENT", "WON", "PROCESSING"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </div>
          {lots.length === 0 ? (
            <EmptyState icon={<Tray aria-hidden="true" size={40} weight="bold" className="text-[#787774]" />} text={t("lots.noLots")} />
          ) : (
            <AdminLotsGrouped lots={lots} t={t} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} onDelete={deleteLot} />
          )}
        </div>
      )}

      {activeTab === "wonLots" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "var(--font-playfair)" }}>{t("nav.wonLots")}</h1>
            <button onClick={() => setShowWonModal(true)} className="hidden md:flex h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold items-center gap-1.5 hover:bg-[#333333] active:scale-[0.98] transition">
              <Trophy aria-hidden="true" size={16} weight="bold" /> {t("wonLots.acceptBids")}
            </button>
          </div>
          {wonLots.length === 0 ? (
            <EmptyState icon={<Trophy aria-hidden="true" size={40} weight="bold" className="text-[#787774]" />} text={t("wonLots.noWonLots")} />
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="aa-card rounded-[12px] border border-[#EAEAEA] bg-white overflow-hidden">
              <div className="overflow-x-auto scroll-slim">
                <table className="w-full text-sm">
                  <thead className="bg-[#F0EFEC] text-[#787774] text-xs uppercase"><tr>
                    <th className="text-left px-4 py-3">{t("lots.lotNumber")}</th>
                    <th className="text-left px-4 py-3">{t("lots.client")}</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">{t("wonLots.bodyNumber")}</th>
                    <th className="text-right px-4 py-3">{t("wonLots.price")}</th>
                  </tr></thead>
                  <tbody>
                    {wonLots.map((wl) => (
                      <motion.tr key={wl.id} variants={itemVariants} className="border-t border-[#EAEAEA] hover:bg-[#F0EFEC]/50 transition">
                        <td className="px-4 py-3 aa-mono font-bold text-[#111111]">#{wl.lot.lotNumber}</td>
                        <td className="px-4 py-3 text-xs text-[#111111]">{wl.lot.client.name || wl.lot.client.username}</td>
                        <td className="px-4 py-3 text-[#787774] max-w-xs truncate hidden sm:table-cell">{wl.bodyNumber || stripLotNumber(wl.lot.rawText) || "—"}</td>
                        <td className="px-4 py-3 text-right aa-mono font-semibold text-[#111111]">{wl.price ? wl.price.toLocaleString() : "—"} <span className="text-xs text-[#787774]">{t("wonLots.currency")}</span></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {activeTab === "delivery" && <AdminDelivery wonLots={wonLots} t={t} />}

      {activeTab === "clients" && (
        <div>
          {!drilledClientId ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "var(--font-playfair)" }}>{t("nav.clients")}</h1>
                <button onClick={() => setShowAddClient(true)} className="hidden md:flex h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold items-center gap-1.5 hover:bg-[#333333] active:scale-[0.98] transition">
                  <Plus aria-hidden="true" size={16} weight="bold" /> {t("clients.add")}
                </button>
              </div>
              {clients.length === 0 ? (
                <EmptyState icon={<Users aria-hidden="true" size={40} weight="bold" className="text-[#787774]" />} text={t("clients.noClients")} />
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((c) => (
                    <motion.button key={c.id} variants={itemVariants} onClick={() => openClientDrilldown(c.id)} className="aa-card rounded-[12px] border border-[#EAEAEA] bg-white p-5 text-left hover:border-[#D1D0CD] transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0"><div className="font-bold text-base text-[#111111] truncate">{c.name || c.username}</div><div className="text-xs text-[#787774] truncate">@{c.username}</div></div>
                        <StatusBadge status={c.role === "ADMIN" ? "PROCESSING" : "PENDING"} label={c.role} pulse={false} />
                      </div>
                      <div className="text-xs text-[#787774] mt-3 flex items-center gap-3"><span className="aa-mono font-semibold text-[#111111] text-lg">{c._count.lots}</span> {t("clients.lotsCount").toLowerCase()}</div>
                      <div className="mt-3 text-xs h-8 px-3 rounded-[6px] border border-[#EAEAEA] bg-[#F0EFEC] font-medium w-full flex items-center justify-center gap-1 text-[#111111]">{t("nav.allLots")} <CaretRight aria-hidden="true" size={12} weight="bold" /></div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </>
          ) : (
            (() => {
              const client = clients.find((c) => c.id === drilledClientId);
              const list = clientLotsCache[drilledClientId] || [];
              return (
                <div>
                  <button onClick={() => setDrilledClientId(null)} className="mb-4 text-sm font-medium text-[#787774] hover:text-[#111111] flex items-center gap-1.5 transition">
                    <ArrowLeft aria-hidden="true" size={16} weight="bold" /> {t("nav.clients")}
                  </button>
                  <div className="mb-5"><h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "var(--font-playfair)" }}>{client?.name || client?.username || "—"}</h1><p className="text-sm text-[#787774] mt-1">@{client?.username} · {list.length} {t("clients.lotsCount").toLowerCase()}</p></div>
                  {clientLotsLoading === drilledClientId ? (
                    <div className="aa-card rounded-[12px] border border-[#EAEAEA] bg-white p-10 flex items-center justify-center"><CircleNotch aria-hidden="true" size={24} weight="bold" className="animate-spin text-[#111111]" /></div>
                  ) : list.length === 0 ? (
                    <EmptyState icon={<Tray aria-hidden="true" size={40} weight="bold" className="text-[#787774]" />} text={t("lots.noLots")} />
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="aa-card rounded-[12px] border border-[#EAEAEA] bg-white overflow-hidden">
                      <div className="overflow-x-auto scroll-slim">
                        <table className="w-full text-sm">
                          <thead className="bg-[#F0EFEC] text-[#787774] text-xs uppercase"><tr>
                            <th className="text-left px-4 py-3">{t("lots.lotNumber")}</th>
                            <th className="text-left px-4 py-3 hidden sm:table-cell">{t("lots.rawText")}</th>
                            <th className="text-left px-4 py-3">{t("lots.status")}</th>
                            <th className="text-left px-4 py-3">{t("common.actions")}</th>
                          </tr></thead>
                          <tbody>
                            {list.map((lot) => (
                              <motion.tr key={lot.id} variants={itemVariants} className="border-t border-[#EAEAEA] hover:bg-[#F0EFEC]/50 transition">
                                <td className="px-4 py-3 aa-mono font-bold text-[#111111]">#{lot.lotNumber}</td>
                                <td className="px-4 py-3 text-[#787774] max-w-xs truncate hidden sm:table-cell">{stripLotNumber(lot.rawText) || "—"}{lot.comment && <div className="text-xs italic mt-1 text-[#111111]/80">{lot.comment}</div>}</td>
                                <td className="px-4 py-3"><StatusBadge status={lot.status} label={t(`status.${lot.status}`)} /></td>
                                <td className="px-4 py-3"><button onClick={() => deleteLot(lot.id)} aria-label="Delete" className="text-xs text-[#9F2F2D] hover:underline flex items-center gap-1 transition"><Trash aria-hidden="true" size={12} weight="bold" /></button></td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {activeTab === "emailHistory" && (
        <div>
          <h1 className="text-2xl font-bold mb-6 text-[#111111]" style={{ fontFamily: "var(--font-playfair)" }}>{t("email.history")}</h1>
          {batches.length === 0 ? (
            <EmptyState icon={<Envelope aria-hidden="true" size={40} weight="bold" className="text-[#787774]" />} text="—" />
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
              {batches.map((b) => (
                <motion.button key={b.id} variants={itemVariants} onClick={() => setViewBatch(b)} className="w-full aa-card rounded-[12px] border border-[#EAEAEA] bg-white p-4 flex items-center justify-between text-left hover:border-[#D1D0CD] transition">
                  <div className="min-w-0"><div className="font-semibold text-sm text-[#111111]">{b.subject}</div><div className="text-xs text-[#787774] mt-0.5">→ {b.recipientEmail} · {new Date(b.sentAt).toLocaleString()}</div></div>
                  <div className="text-xs text-[#787774] aa-mono">{b.lots?.length || 0} {t("nav.allLots").toLowerCase()}</div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Email preview modal */}
      <Modal open={!!emailPreview} onClose={() => setEmailPreview(null)} title={t("email.preview")} size="lg"
        footer={<>
          <button onClick={() => copyToClipboard(emailPreview?.body || "")} className="h-10 px-4 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] text-sm font-medium flex items-center gap-1.5 transition"><Copy aria-hidden="true" size={16} weight="bold" /> {t("email.copy")}</button>
          <button onClick={() => setEmailPreview(null)} className="h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold hover:bg-[#333333] active:scale-[0.98] transition">{t("common.close")}</button>
        </>}>
        {emailPreview && (<div className="space-y-3">
          <div className="text-sm"><span className="text-[#787774]">{t("email.subject")}: </span><span className="font-semibold text-[#111111]">{emailPreview.subject}</span></div>
          <div className="text-sm"><span className="text-[#787774]">{t("email.recipient")}: </span><span className="font-semibold aa-mono text-[#111111]">{emailPreview.recipientEmail}</span></div>
          <pre className="bg-[#F0EFEC] rounded-[8px] p-4 text-xs font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto scroll-slim">{emailPreview.body}</pre>
        </div>)}
      </Modal>

      {/* Accept bids modal */}
      <Modal open={showWonModal} onClose={() => setShowWonModal(false)} title={t("wonLots.acceptBids")} size="lg"
        footer={<>
          <button onClick={() => setShowWonModal(false)} className="h-10 px-4 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] text-sm font-medium transition">{t("common.cancel")}</button>
          <button onClick={submitWon} disabled={!wonInput.trim()} className="h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#333333] active:scale-[0.98] transition">{t("wonLots.confirmSave")}</button>
        </>}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">{t("wonLots.inputText")}</label>
            <textarea value={wonInput} onChange={(e) => setWonInput(e.target.value)} placeholder={t("wonLots.inputTextPlaceholder") + "…"} rows={5} autoFocus className="w-full rounded-[8px] border border-[#EAEAEA] bg-white p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent resize-none" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#787774] uppercase tracking-wide">{t("wonLots.preview")}</label>
              {wonPreview.length > 0 && <span className="text-xs text-[#787774]">{t("wonLots.matchedCount")}: <span className="aa-mono font-bold text-emerald-600">{wonPreview.filter((p) => p.matched).length}</span> / {wonPreview.length}</span>}
            </div>
            {wonPreview.length === 0 ? (
              <div className="aa-soft p-6 text-center text-sm text-[#787774]">{t("wonLots.empty")}</div>
            ) : (
              <div className="aa-soft overflow-hidden"><div className="overflow-x-auto scroll-slim">
                <table className="w-full text-sm">
                  <thead className="bg-[#F0EFEC] text-[#787774] text-[10px] uppercase"><tr>
                    <th className="text-left px-3 py-2 w-8">#</th>
                    <th className="text-left px-3 py-2">{t("lots.lotNumber")}</th>
                    <th className="text-left px-3 py-2 hidden sm:table-cell">{t("wonLots.bodyNumber")}</th>
                    <th className="text-left px-3 py-2 hidden sm:table-cell">{t("lots.client")}</th>
                    <th className="text-right px-3 py-2">{t("wonLots.price")}</th>
                    <th className="text-left px-3 py-2">{t("lots.status")}</th>
                  </tr></thead>
                  <tbody>
                    {wonPreview.map((p) => (
                      <tr key={`${p.lotNumber}-${p.index}`} className={cn("border-t border-[#EAEAEA]", !p.matched && "bg-[#FDEBEC]/40")}>
                        <td className="px-3 py-2 text-xs text-[#787774] aa-mono">{p.index}</td>
                        <td className="px-3 py-2 aa-mono font-bold text-[#111111]">#{p.lotNumber}</td>
                        <td className="px-3 py-2 text-xs hidden sm:table-cell text-[#787774]">{p.bodyNumber || "—"}</td>
                        <td className="px-3 py-2 text-xs hidden sm:table-cell text-[#787774]">{p.client || "—"}</td>
                        <td className="px-3 py-2 text-right aa-mono font-semibold text-[#111111]">{p.price !== null ? p.price.toLocaleString() : "—"} <span className="text-xs text-[#787774]">{t("wonLots.currency")}</span></td>
                        <td className="px-3 py-2">{p.matched ? <StatusBadge status="WON" label={t("wonStatus.WON")} pulse={false} /> : <span className="text-xs text-[#9F2F2D] font-medium">{t("wonLots.notFound")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  {wonTotal > 0 && (
                    <tfoot><tr className="border-t-2 border-[#EAEAEA] bg-[#F0EFEC]">
                      <td colSpan={4} className="px-3 py-3 text-right text-xs font-semibold uppercase text-[#787774]">{t("wonLots.total")}:</td>
                      <td className="px-3 py-3 text-right aa-mono font-bold text-[#111111] text-base">{wonTotal.toLocaleString()} <span className="text-xs text-[#787774]">{t("wonLots.currency")}</span></td>
                      <td></td>
                    </tr></tfoot>
                  )}
                </table>
              </div></div>
            )}
          </div>
        </div>
      </Modal>

      {/* View batch modal */}
      <Modal open={!!viewBatch} onClose={() => setViewBatch(null)} title={viewBatch?.subject} size="lg"
        footer={<>
          <button onClick={() => copyToClipboard(viewBatch?.body || "")} className="h-10 px-4 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] text-sm font-medium flex items-center gap-1.5 transition"><Copy aria-hidden="true" size={16} weight="bold" /> {t("email.copy")}</button>
          <button onClick={() => setViewBatch(null)} className="h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold hover:bg-[#333333] active:scale-[0.98] transition">{t("common.close")}</button>
        </>}>
        {viewBatch && (<div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-[#787774]">{t("email.recipient")}</div><div className="font-semibold aa-mono text-[#111111]">{viewBatch.recipientEmail}</div></div>
            <div><div className="text-xs text-[#787774]">{t("email.sentAt")}</div><div className="font-semibold text-[#111111]">{new Date(viewBatch.sentAt).toLocaleString()}</div></div>
          </div>
          <pre className="bg-[#F0EFEC] rounded-[8px] p-4 text-xs font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto scroll-slim">{viewBatch.body}</pre>
        </div>)}
      </Modal>

      {/* Add client modal */}
      <Modal open={showAddClient} onClose={() => setShowAddClient(false)} title={t("clients.add")} size="sm"
        footer={<>
          <button onClick={() => setShowAddClient(false)} className="h-10 px-4 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] text-sm font-medium transition">{t("common.cancel")}</button>
          <button onClick={submitNewClient} disabled={!newClient.username || !newClient.password} className="h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#333333] active:scale-[0.98] transition">{t("common.save")}</button>
        </>}>
        <div className="space-y-3">
          <input type="text" value={newClient.username} onChange={(e) => setNewClient({ ...newClient, username: e.target.value })} placeholder={t("clients.newUsername") + "…"} className="w-full h-11 rounded-[8px] border border-[#EAEAEA] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent" />
          <input type="password" value={newClient.password} onChange={(e) => setNewClient({ ...newClient, password: e.target.value })} placeholder={t("clients.newPassword") + "…"} className="w-full h-11 rounded-[8px] border border-[#EAEAEA] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent" />
          <input type="text" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder={t("clients.newName") + "…"} className="w-full h-11 rounded-[8px] border border-[#EAEAEA] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent" />
        </div>
      </Modal>
    </AppShell>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (<div className="aa-card rounded-[12px] border border-[#EAEAEA] bg-white p-12 flex flex-col items-center justify-center text-center">{icon}<p className="text-sm text-[#787774] mt-3">{text}</p></div>);
}

function AdminLotsGrouped({ lots, t, selectedIds, onToggleSelect, onToggleSelectAll, onDelete }: {
  lots: Lot[]; t: (k: string) => string; selectedIds: Set<string>;
  onToggleSelect: (id: string) => void; onToggleSelectAll: () => void; onDelete: (id: string) => void | Promise<void>;
}) {
  type Group = { key: string; comment: string | null; clientName: string; lots: Lot[] };
  const groups: Group[] = (() => {
    const map = new Map<string, Lot[]>(); const individual: Lot[] = [];
    for (const lot of lots) { const c = lot.comment?.trim() || null;
      if (c) { const k = `${lot.clientId}::${c}`; if (!map.has(k)) map.set(k, []); map.get(k)!.push(lot); }
      else individual.push(lot); }
    const out: Group[] = [];
    map.forEach((arr) => { out.push({ key: `kit:${arr[0]?.id}`, comment: arr[0]?.comment || null, clientName: arr[0]?.client.name || arr[0]?.client.username || "—", lots: arr }); });
    for (const lot of individual) out.push({ key: `single:${lot.id}`, comment: null, clientName: lot.client.name || lot.client.username, lots: [lot] });
    return out;
  })();

  const toggleKit = (group: Group) => {
    const all = group.lots.every((l) => selectedIds.has(l.id));
    group.lots.forEach((l) => { if (all ? selectedIds.has(l.id) : !selectedIds.has(l.id)) onToggleSelect(l.id); });
  };

  return (<>
    <div className="flex items-center gap-3 mb-4 px-2">
      <input type="checkbox" checked={lots.length > 0 && lots.every((l) => selectedIds.has(l.id))} onChange={onToggleSelectAll} className="w-4 h-4 accent-[#111111]" aria-label={t("common.all")} />
      <span className="text-xs text-[#787774]">{t("common.all")} ({lots.length})</span>
    </div>
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {groups.map((group) => {
        const isKit = group.lots.length > 1;
        const allKit = group.lots.every((l) => selectedIds.has(l.id));
        const someKit = group.lots.some((l) => selectedIds.has(l.id));
        return (
          <motion.div key={group.key} variants={itemVariants} className="aa-card rounded-[12px] border border-[#EAEAEA] bg-white overflow-hidden hover:border-[#D1D0CD] transition">
            <div className="flex items-center gap-3 p-5 pb-3 border-b border-[#EAEAEA]">
              <input type="checkbox" checked={allKit} ref={(el) => { if (el) el.indeterminate = !allKit && someKit; }} onChange={() => toggleKit(group)} className="w-5 h-5 accent-[#111111] flex-shrink-0 cursor-pointer" />
              <div className="flex-1 min-w-0">
                {isKit ? (<><div className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold">{t("lots.kit")} · {group.clientName}</div><div className="text-sm font-semibold text-[#111111] truncate">{group.comment}</div></>)
                : (<><div className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold">{group.clientName}</div><div className="text-lg font-extrabold aa-mono text-[#111111] truncate">#{group.lots[0]?.lotNumber}</div></>)}
              </div>
              <span className="text-xs text-[#787774] aa-mono flex-shrink-0">{group.lots.length} {t("lots.kitLots")}</span>
            </div>
            <div className="p-5 space-y-3">
              {group.lots.map((lot) => (
                <div key={lot.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {isKit && <span className="text-base font-bold aa-mono text-[#111111] flex-shrink-0 mt-0.5">#{lot.lotNumber}</span>}
                    <div className="min-w-0 flex-1">
                      {lot.rawText && <p className="text-sm text-[#111111] break-words">{stripLotNumber(lot.rawText)}</p>}
                      {!isKit && lot.comment && <p className="text-xs text-[#787774] italic mt-1">{lot.comment}</p>}
                      <div className="flex items-center gap-3 mt-2"><StatusBadge status={lot.status} label={t(`status.${lot.status}`)} /><span className="text-xs text-[#787774]">{new Date(lot.createdAt).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                  <button onClick={() => onDelete(lot.id)} aria-label="Delete" className="text-xs text-[#9F2F2D] hover:underline flex items-center gap-1 transition flex-shrink-0 mt-1"><Trash aria-hidden="true" size={12} weight="bold" /></button>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  </>);
}

function AdminDelivery({ wonLots, t }: { wonLots: WonLot[]; t: (k: string) => string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const withDelivery = wonLots.filter((w) => w.deliveryReqs.length > 0);
  const filtered = useMemo(() => {
    const terms = parseSearchTerms(searchQuery);
    if (terms.length === 0) return withDelivery;
    return withDelivery.filter((wl) => {
      const bodyNum = (wl.bodyNumber || stripLotNumber(wl.lot.rawText) || "").toLowerCase();
      const lotNum = wl.lot.lotNumber.toLowerCase();
      return terms.some((term) => { const t = term.toLowerCase(); return bodyNum.includes(t) || lotNum.includes(t); });
    });
  }, [withDelivery, searchQuery]);

  return (
    <div>
      <div className="mb-5"><h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "var(--font-playfair)" }}>{t("nav.delivery")}</h1></div>
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass aria-hidden="true" size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787774] pointer-events-none" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("delivery.searchPlaceholder") + "…"} className="w-full h-12 pl-10 pr-4 rounded-[8px] border border-[#EAEAEA] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent" />
        </div>
        {searchQuery && <p className="text-xs text-[#787774] mt-2">{t("delivery.found")}: <span className="aa-mono font-bold text-[#111111]">{filtered.length}</span> / {withDelivery.length}</p>}
      </div>
      {withDelivery.length === 0 ? (
        <EmptyState icon={<Truck aria-hidden="true" size={40} weight="bold" className="text-[#787774]" />} text={t("delivery.noRequests")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<MagnifyingGlass aria-hidden="true" size={40} weight="bold" className="text-[#787774]" />} text={t("delivery.noSearchResults")} />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
          {filtered.map((wl) => {
            const req = wl.deliveryReqs[0]; const isDuty = req?.method === "DUTY";
            return (
              <motion.div key={wl.id} variants={itemVariants} className="aa-card rounded-[12px] border border-[#EAEAEA] bg-white overflow-hidden hover:border-[#D1D0CD] transition">
                <div className="flex items-start justify-between p-5 pb-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-[12px] bg-[#111111] flex items-center justify-center flex-shrink-0"><Truck aria-hidden="true" size={20} weight="bold" className="text-white" /></div>
                    <div className="min-w-0"><div className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold">{t("delivery.lotNumber")}</div><div className="text-xl font-extrabold aa-mono text-[#111111] mt-0.5 truncate">#{wl.lot.lotNumber}</div></div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex-shrink-0"><Check aria-hidden="true" size={14} weight="bold" />{t("delivery.choosen")}</span>
                </div>
                <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <div className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5"><FileText aria-hidden="true" size={12} weight="bold" />{t("delivery.lotInfo")}</div>
                    <InfoRow icon={<Hash aria-hidden="true" size={14} weight="bold" />} label={t("delivery.lotNumber")} value={`#${wl.lot.lotNumber}`} mono />
                    <InfoRow icon={<FileText aria-hidden="true" size={14} weight="bold" />} label={t("wonLots.bodyNumber")} value={wl.bodyNumber || stripLotNumber(wl.lot.rawText) || "—"} />
                    <InfoRow icon={<Coins aria-hidden="true" size={14} weight="bold" />} label={t("delivery.price")} value={wl.price ? `${wl.price.toLocaleString()} ${t("wonLots.currency")}` : "—"} mono />
                    <InfoRow icon={<Truck aria-hidden="true" size={14} weight="bold" />} label={t("delivery.method")} value={req?.method ? t(`delivery.${req.method}`) : "—"} />
                    <InfoRow icon={<Calendar aria-hidden="true" size={14} weight="bold" />} label={t("delivery.createdAt")} value={req ? new Date(req.createdAt).toLocaleString() : "—"} />
                  </div>
                  {isDuty && (
                    <div className="space-y-2.5 sm:border-l sm:border-[#EAEAEA] sm:pl-4">
                      <div className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5"><User aria-hidden="true" size={12} weight="bold" />{t("delivery.ownerData")}</div>
                      <InfoRow icon={<User aria-hidden="true" size={14} weight="bold" />} label={t("delivery.ownerFullName")} value={req?.ownerFullName || "—"} />
                      <InfoRow icon={<MapPin aria-hidden="true" size={14} weight="bold" />} label={t("delivery.ownerAddress")} value={req?.ownerAddress || "—"} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-6 h-6 rounded-[6px] bg-[#F0EFEC] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#787774]">{icon}</div>
      <div className="min-w-0 flex-1"><div className="text-[10px] text-[#787774] uppercase tracking-wider font-semibold">{label}</div><div className={`text-sm text-[#111111] break-words ${mono ? "aa-mono font-semibold" : "font-medium"}`}>{value}</div></div>
    </div>
  );
}
