"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Users,
  Mail,
  Trophy,
  Send,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Inbox,
  ChevronRight,
  ArrowLeft,
  Truck,
  Check,
  User,
  MapPin,
  Hash,
  FileText,
  Calendar,
  Coins,
  Boxes,
  Search,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell, type Tab } from "./AppShell";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { toast } from "sonner";
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

// Парсер: извлекает lotNumber (первое число), price (последнее число, поддерживает
// точки/запятые как thousand separators), и bodyNumber (текст между ними — номер кузова).
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

    // Извлекаем текст между первым и последним числом
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
    if (res.ok) {
      const data = await res.json();
      setLots(data.lots || []);
    }
  }, [token, filterClient, filterStatus]);

  const loadWonLots = useCallback(async () => {
    const res = await fetch("/api/won-lots", { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setWonLots(data.wonLots || []);
    }
  }, [token]);

  const loadBatches = useCallback(async () => {
    const res = await fetch("/api/email", { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setBatches(data.batches || []);
    }
  }, [token]);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/users", { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      setClients(data.users || []);
    }
  }, [token]);

  const loadClientLots = useCallback(async (clientId: string) => {
    const res = await fetch(`/api/lots?clientId=${clientId}`, { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      return data.lots || [];
    }
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
      (async () => {
        await loadLots();
        if (cancelled) return;
      })();
      return () => { cancelled = true; };
    }
  }, [activeTab, filterClient, filterStatus, loadLots]);

  const tabs: Tab[] = [
    { key: "allLots", label: t("nav.allLots"), icon: <Layers className="w-4 h-4" /> },
    { key: "wonLots", label: t("nav.wonLots"), icon: <Trophy className="w-4 h-4" /> },
    { key: "delivery", label: t("nav.delivery"), icon: <Truck className="w-4 h-4" /> },
    { key: "clients", label: t("nav.clients"), icon: <Users className="w-4 h-4" /> },
    { key: "emailHistory", label: t("email.history"), icon: <Mail className="w-4 h-4" /> },
  ];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (lots.length > 0 && lots.every((l) => selectedIds.has(l.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lots.map((l) => l.id)));
    }
  };

  const sendEmail = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Select at least one lot");
      return;
    }
    const res = await fetch("/api/email", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ lotIds: ids }),
    });
    if (res.ok) {
      const data = await res.json();
      setEmailPreview(data.preview);
      setSelectedIds(new Set());
      await Promise.all([loadLots(), loadBatches()]);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || t("common.error"));
    }
  };

  const submitWon = async () => {
    if (!wonInput.trim()) return;
    const res = await fetch("/api/won-lots", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ text: wonInput }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(
        `${t("common.success")}: ${data.results.filter((r: { status: string }) => r.status !== "lot_not_found").length}/${data.processed}`
      );
      setWonInput("");
      setShowWonModal(false);
      await Promise.all([loadLots(), loadWonLots()]);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || t("common.error"));
    }
  };

  const submitNewClient = async () => {
    if (!newClient.username || !newClient.password) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(newClient),
    });
    if (res.ok) {
      toast.success(t("common.success"));
      setNewClient({ username: "", password: "", name: "" });
      setShowAddClient(false);
      await loadClients();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || t("common.error"));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("email.copy") + " ✓");
    } catch {
      toast.error(t("common.error"));
    }
  };

  const deleteLot = async (id: string) => {
    if (!confirm(t("lots.deleteConfirm"))) return;
    const res = await fetch(`/api/lots?id=${id}`, { method: "DELETE", headers: authHeaders });
    if (res.ok) {
      await loadLots();
      await loadWonLots();
      if (drilledClientId) {
        const fresh = await loadClientLots(drilledClientId);
        setClientLotsCache((prev) => ({ ...prev, [drilledClientId]: fresh }));
      }
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || t("common.error"));
    }
  };

  const deleteSelectedLots = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(t("lots.deleteSelectedConfirm").replace("{n}", String(ids.length)))) return;
    let deleted = 0;
    let failed = 0;
    for (const id of ids) {
      const res = await fetch(`/api/lots?id=${id}`, { method: "DELETE", headers: authHeaders });
      if (res.ok) deleted++;
      else failed++;
    }
    if (deleted > 0) toast.success(t("lots.deletedCount").replace("{n}", String(deleted)));
    if (failed > 0) toast.error(t("lots.deleteSomeFailed").replace("{n}", String(failed)));
    setSelectedIds(new Set());
    await loadLots();
    await loadWonLots();
    if (drilledClientId) {
      const fresh = await loadClientLots(drilledClientId);
      setClientLotsCache((prev) => ({ ...prev, [drilledClientId]: fresh }));
    }
  };

  // ---- Won preview logic ----
  const lotIndex = useMemo(() => {
    const m = new Map<string, { client: string; rawText: string | null }>();
    for (const lot of lots) {
      m.set(lot.lotNumber, {
        client: lot.client.name || lot.client.username,
        rawText: lot.rawText,
      });
    }
    return m;
  }, [lots]);

  const wonPreview = useMemo(() => {
    const parsed = parseWonText(wonInput);
    return parsed.map((p, idx) => {
      const known = lotIndex.get(p.lotNumber);
      const priceNum = parseFloat(p.price.replace(/[^\d.]/g, ""));
      return {
        index: idx + 1,
        lotNumber: p.lotNumber,
        price: isNaN(priceNum) ? null : priceNum,
        bodyNumber: p.bodyNumber,
        client: known?.client || null,
        rawText: known?.rawText || null,
        matched: !!known,
      };
    });
  }, [wonInput, lotIndex]);

  const wonTotal = wonPreview.reduce((acc, p) => acc + (p.matched && p.price ? p.price : 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fab={
        activeTab === "clients" && !drilledClientId
          ? { label: t("clients.add"), icon: <Plus className="w-5 h-5" />, onClick: () => setShowAddClient(true) }
          : activeTab === "allLots"
          ? { label: t("lots.formEmail"), icon: <Send className="w-5 h-5" />, onClick: sendEmail }
          : activeTab === "wonLots"
          ? { label: t("wonLots.acceptBids"), icon: <Trophy className="w-5 h-5" />, onClick: () => setShowWonModal(true) }
          : undefined
      }
    >
      {activeTab === "allLots" && (
        <div>
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{t("nav.allLots")}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={deleteSelectedLots}
                disabled={selectedIds.size === 0}
                className="h-10 px-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive hover:text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-destructive transition"
                title={t("lots.deleteSelected")}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t("lots.deleteSelected")}</span>
                {selectedIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-xs">{selectedIds.size}</span>
                )}
              </button>
              <button
                onClick={sendEmail}
                disabled={selectedIds.size === 0}
                className="h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60 hover:brightness-110 transition"
              >
                <Send className="w-4 h-4" /> {t("lots.formEmail")}
                {selectedIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/30 text-xs">{selectedIds.size}</span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="h-10 px-3 rounded-xl border border-input bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("filter.byClient")}: {t("common.all")}</option>
              {clients.filter((c) => c.role === "CLIENT").map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.username}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-input bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("filter.byStatus")}: {t("common.all")}</option>
              {["PENDING", "SENT", "WON", "PROCESSING"].map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </select>
          </div>

          {lots.length === 0 ? (
            <EmptyState icon={<Inbox className="w-10 h-10 text-muted-foreground" />} text={t("lots.noLots")} />
          ) : (
            <AdminLotsGrouped
              lots={lots}
              t={t}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onDelete={deleteLot}
            />
          )}
        </div>
      )}

      {/* «Выигранные» — с bodyNumber (номер кузова), без # колонки, с клиентом */}
      {activeTab === "wonLots" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold">{t("nav.wonLots")}</h1>
            <button
              onClick={() => setShowWonModal(true)}
              className="hidden md:flex h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold items-center gap-1.5 hover:brightness-110 transition"
            >
              <Trophy className="w-4 h-4" /> {t("wonLots.acceptBids")}
            </button>
          </div>
          {wonLots.length === 0 ? (
            <EmptyState icon={<Trophy className="w-10 h-10 text-muted-foreground" />} text={t("wonLots.noWonLots")} />
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="aa-card overflow-hidden">
              <div className="overflow-x-auto scroll-slim">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">{t("lots.lotNumber")}</th>
                      <th className="text-left px-4 py-3">{t("lots.client")}</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">{t("wonLots.bodyNumber")}</th>
                      <th className="text-right px-4 py-3">{t("wonLots.price")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wonLots.map((wl) => (
                      <motion.tr key={wl.id} variants={itemVariants} className="border-t border-border/60 hover:bg-muted/30 transition">
                        <td className="px-4 py-3 aa-mono font-bold text-primary">#{wl.lot.lotNumber}</td>
                        <td className="px-4 py-3 text-xs">{wl.lot.client.name || wl.lot.client.username}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate hidden sm:table-cell">
                          {wl.bodyNumber || stripLotNumber(wl.lot.rawText) || "—"}
                        </td>
                        <td className="px-4 py-3 text-right aa-mono font-semibold">
                          {wl.price ? wl.price.toLocaleString() : "—"}{" "}
                          <span className="text-xs text-muted-foreground">{t("wonLots.currency")}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* НОВОЕ: «Доставка» у админа — с поиском по bodyNumber (несколько) */}
      {activeTab === "delivery" && (
        <AdminDelivery
          wonLots={wonLots}
          t={t}
        />
      )}

      {activeTab === "clients" && (
        <div>
          {!drilledClientId ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-bold">{t("nav.clients")}</h1>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="hidden md:flex h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold items-center gap-1.5 hover:brightness-110 transition"
                >
                  <Plus className="w-4 h-4" /> {t("clients.add")}
                </button>
              </div>
              {clients.length === 0 ? (
                <EmptyState icon={<Users className="w-10 h-10 text-muted-foreground" />} text={t("clients.noClients")} />
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((c) => (
                    <motion.button
                      key={c.id}
                      variants={itemVariants}
                      onClick={() => openClientDrilldown(c.id)}
                      className="aa-card aa-card-hover p-5 text-left"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <div className="font-bold text-base truncate">{c.name || c.username}</div>
                          <div className="text-xs text-muted-foreground truncate">@{c.username}</div>
                        </div>
                        <StatusBadge status={c.role === "ADMIN" ? "PROCESSING" : "PENDING"} label={c.role} pulse={false} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-3 flex items-center gap-3">
                        <span className="aa-mono font-semibold text-primary text-lg">{c._count.lots}</span>
                        {t("clients.lotsCount").toLowerCase()}
                      </div>
                      <div className="mt-3 text-xs h-8 px-3 rounded-lg border border-border bg-muted/30 font-medium w-full flex items-center justify-center gap-1">
                        {t("nav.allLots")}
                        <ChevronRight className="w-3 h-3" />
                      </div>
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
                  <button
                    onClick={() => setDrilledClientId(null)}
                    className="mb-4 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t("nav.clients")}
                  </button>
                  <div className="flex items-center justify-between mb-5 gap-3">
                    <div>
                      <h1 className="text-2xl font-bold">{client?.name || client?.username || "—"}</h1>
                      <p className="text-sm text-muted-foreground mt-1">@{client?.username} · {list.length} {t("clients.lotsCount").toLowerCase()}</p>
                    </div>
                  </div>
                  {clientLotsLoading === drilledClientId ? (
                    <div className="aa-card p-10 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : list.length === 0 ? (
                    <EmptyState icon={<Inbox className="w-10 h-10 text-muted-foreground" />} text={t("lots.noLots")} />
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="aa-card overflow-hidden">
                      <div className="overflow-x-auto scroll-slim">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                            <tr>
                              <th className="text-left px-4 py-3">{t("lots.lotNumber")}</th>
                              <th className="text-left px-4 py-3 hidden sm:table-cell">{t("lots.rawText")}</th>
                              <th className="text-left px-4 py-3">{t("lots.status")}</th>
                              <th className="text-left px-4 py-3">{t("common.actions")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((lot) => (
                              <motion.tr key={lot.id} variants={itemVariants} className="border-t border-border/60 hover:bg-muted/30 transition">
                                <td className="px-4 py-3 aa-mono font-bold text-primary">#{lot.lotNumber}</td>
                                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate hidden sm:table-cell">
                                  {lot.rawText || "—"}
                                  {lot.comment && <div className="text-xs italic mt-1 text-foreground/80">💬 {lot.comment}</div>}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge status={lot.status} label={t(`status.${lot.status}`)} />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => deleteLot(lot.id)}
                                    className="text-xs text-destructive hover:underline flex items-center gap-1 transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
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
          <h1 className="text-2xl font-bold mb-6">{t("email.history")}</h1>
          {batches.length === 0 ? (
            <EmptyState icon={<Mail className="w-10 h-10 text-muted-foreground" />} text="—" />
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
              {batches.map((b) => (
                <motion.button
                  key={b.id}
                  variants={itemVariants}
                  onClick={() => setViewBatch(b)}
                  className="w-full aa-card aa-card-hover p-4 flex items-center justify-between text-left"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{b.subject}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">→ {b.recipientEmail} · {new Date(b.sentAt).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-muted-foreground aa-mono">{b.lots?.length || 0} {t("nav.allLots").toLowerCase()}</div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Email preview modal */}
      <Modal
        open={!!emailPreview}
        onClose={() => setEmailPreview(null)}
        title={t("email.preview")}
        size="lg"
        footer={
          <>
            <button
              onClick={() => copyToClipboard(emailPreview?.body || "")}
              className="h-10 px-4 rounded-xl border border-border hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition"
            >
              <Copy className="w-4 h-4" /> {t("email.copy")}
            </button>
            <button
              onClick={() => setEmailPreview(null)}
              className="h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold hover:brightness-110 transition"
            >
              {t("common.close")}
            </button>
          </>
        }
      >
        {emailPreview && (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">{t("email.subject")}: </span>
              <span className="font-semibold">{emailPreview.subject}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">{t("email.recipient")}: </span>
              <span className="font-semibold aa-mono">{emailPreview.recipientEmail}</span>
            </div>
            <pre className="bg-muted/50 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto scroll-slim">
              {emailPreview.body}
            </pre>
          </div>
        )}
      </Modal>

      {/* НОВОЕ: Accept bids modal — БЕЗ подсказки «Парсер: первое число…» */}
      <Modal
        open={showWonModal}
        onClose={() => setShowWonModal(false)}
        title={t("wonLots.acceptBids")}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowWonModal(false)}
              className="h-10 px-4 rounded-xl border border-border hover:bg-muted text-sm font-medium transition"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={submitWon}
              disabled={!wonInput.trim()}
              className="h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold disabled:opacity-60 hover:brightness-110 transition"
            >
              {t("wonLots.confirmSave")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("wonLots.inputText")}</label>
            <textarea
              value={wonInput}
              onChange={(e) => setWonInput(e.target.value)}
              placeholder={t("wonLots.inputTextPlaceholder")}
              rows={5}
              autoFocus
              className="w-full rounded-xl border border-input bg-white p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("wonLots.preview")}</label>
              {wonPreview.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("wonLots.matchedCount")}:{" "}
                  <span className="aa-mono font-bold text-emerald-600">{wonPreview.filter((p) => p.matched).length}</span>
                  / {wonPreview.length}
                </span>
              )}
            </div>
            {wonPreview.length === 0 ? (
              <div className="aa-soft p-6 text-center text-sm text-muted-foreground">{t("wonLots.empty")}</div>
            ) : (
              <div className="aa-soft overflow-hidden">
                <div className="overflow-x-auto scroll-slim">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase">
                      <tr>
                        <th className="text-left px-3 py-2 w-8">#</th>
                        <th className="text-left px-3 py-2">{t("lots.lotNumber")}</th>
                        <th className="text-left px-3 py-2 hidden sm:table-cell">{t("wonLots.bodyNumber")}</th>
                        <th className="text-left px-3 py-2 hidden sm:table-cell">{t("lots.client")}</th>
                        <th className="text-right px-3 py-2">{t("wonLots.price")}</th>
                        <th className="text-left px-3 py-2">{t("lots.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wonPreview.map((p) => (
                        <tr key={`${p.lotNumber}-${p.index}`} className={cn("border-t border-border/40", !p.matched && "bg-red-50/40")}>
                          <td className="px-3 py-2 text-xs text-muted-foreground aa-mono">{p.index}</td>
                          <td className="px-3 py-2 aa-mono font-bold text-primary">#{p.lotNumber}</td>
                          <td className="px-3 py-2 text-xs hidden sm:table-cell text-muted-foreground">{p.bodyNumber || "—"}</td>
                          <td className="px-3 py-2 text-xs hidden sm:table-cell text-muted-foreground">{p.client || "—"}</td>
                          <td className="px-3 py-2 text-right aa-mono font-semibold">
                            {p.price !== null ? p.price.toLocaleString() : "—"}{" "}
                            <span className="text-xs text-muted-foreground">{t("wonLots.currency")}</span>
                          </td>
                          <td className="px-3 py-2">
                            {p.matched ? (
                              <StatusBadge status="WON" label={t("wonStatus.WON")} pulse={false} />
                            ) : (
                              <span className="text-xs text-destructive font-medium">{t("wonLots.notFound")}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {wonTotal > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/40">
                          <td colSpan={4} className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                            {t("wonLots.total")}:
                          </td>
                          <td className="px-3 py-3 text-right aa-mono font-bold text-primary text-base">
                            {wonTotal.toLocaleString()}{" "}
                            <span className="text-xs text-muted-foreground">{t("wonLots.currency")}</span>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* View batch modal */}
      <Modal
        open={!!viewBatch}
        onClose={() => setViewBatch(null)}
        title={viewBatch?.subject}
        size="lg"
        footer={
          <>
            <button
              onClick={() => copyToClipboard(viewBatch?.body || "")}
              className="h-10 px-4 rounded-xl border border-border hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition"
            >
              <Copy className="w-4 h-4" /> {t("email.copy")}
            </button>
            <button
              onClick={() => setViewBatch(null)}
              className="h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold hover:brightness-110 transition"
            >
              {t("common.close")}
            </button>
          </>
        }
      >
        {viewBatch && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{t("email.recipient")}</div>
                <div className="font-semibold aa-mono">{viewBatch.recipientEmail}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("email.sentAt")}</div>
                <div className="font-semibold">{new Date(viewBatch.sentAt).toLocaleString()}</div>
              </div>
            </div>
            <pre className="bg-muted/50 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto scroll-slim">
              {viewBatch.body}
            </pre>
          </div>
        )}
      </Modal>

      {/* Add client modal */}
      <Modal
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        title={t("clients.add")}
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowAddClient(false)}
              className="h-10 px-4 rounded-xl border border-border hover:bg-muted text-sm font-medium transition"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={submitNewClient}
              disabled={!newClient.username || !newClient.password}
              className="h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold disabled:opacity-60 hover:brightness-110 transition"
            >
              {t("common.save")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            type="text"
            value={newClient.username}
            onChange={(e) => setNewClient({ ...newClient, username: e.target.value })}
            placeholder={t("clients.newUsername")}
            className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            value={newClient.password}
            onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
            placeholder={t("clients.newPassword")}
            className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            placeholder={t("clients.newName")}
            className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </Modal>
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

/**
 * «Все лоты» у админа — комплекты по (clientId + comment).
 * Лоты с одинаковым комментарием одного клиента группируются в комплект.
 * Лоты без комментария показываются отдельно.
 */
function AdminLotsGrouped({
  lots,
  t,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
}: {
  lots: Lot[];
  t: (k: string) => string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  type Group = { key: string; comment: string | null; clientName: string; lots: Lot[] };

  const groups: Group[] = (() => {
    const map = new Map<string, Lot[]>();
    const individual: Lot[] = [];
    for (const lot of lots) {
      const c = lot.comment && lot.comment.trim() ? lot.comment.trim() : null;
      if (c) {
        // Группируем по clientId + comment (комплекты в пределах одного клиента)
        const key = `${lot.clientId}::${c}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(lot);
      } else {
        individual.push(lot);
      }
    }
    const out: Group[] = [];
    map.forEach((lotsArr, key) => {
      const [clientId, comment] = key.split("::");
      const clientName = lotsArr[0]?.client.name || lotsArr[0]?.client.username || "—";
      out.push({ key, comment, clientName, lots: lotsArr });
    });
    for (const lot of individual) {
      out.push({
        key: `single:${lot.id}`,
        comment: null,
        clientName: lot.client.name || lot.client.username,
        lots: [lot],
      });
    }
    return out;
  })();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {groups.map((group) => {
        const isKit = group.lots.length > 1;
        return (
          <motion.div key={group.key} variants={itemVariants} className="space-y-3">
            {isKit && (
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-7 h-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
                  <Boxes className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {t("lots.kit")} · {group.clientName}
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">💬 {group.comment}</div>
                </div>
                <span className="ml-auto text-xs text-muted-foreground aa-mono">
                  {group.lots.length} {t("lots.kitLots")}
                </span>
              </div>
            )}
            <div className={`grid grid-cols-1 ${group.lots.length > 1 ? "md:grid-cols-2" : ""} gap-4`}>
              {group.lots.map((lot) => (
                <motion.div key={lot.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="aa-card aa-card-hover p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lot.id)}
                        onChange={() => onToggleSelect(lot.id)}
                        className="w-4 h-4 accent-[#3A6BFF] flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          {t("lots.lotNumber")}
                        </div>
                        <div className="text-2xl font-extrabold aa-mono text-primary mt-0.5">#{lot.lotNumber}</div>
                      </div>
                    </div>
                    <StatusBadge status={lot.status} label={t(`status.${lot.status}`)} />
                  </div>
                  {lot.rawText && (
                    <p className="text-sm text-foreground mb-2 break-words">{stripLotNumber(lot.rawText)}</p>
                  )}
                  {!isKit && lot.comment && (
                    <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-2.5 py-1.5">💬 {lot.comment}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <span className="text-xs text-muted-foreground">
                      {group.clientName} · {new Date(lot.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onDelete(lot.id)}
                      className="text-xs text-destructive hover:underline flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" /> {t("common.delete")}
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

/**
 * «Доставка» у админа — все доставки всех клиентов с поиском по bodyNumber.
 * Поиск поддерживает несколько номеров кузова (через запятую/пробел/перенос).
 */
function AdminDelivery({
  wonLots,
  t,
}: {
  wonLots: WonLot[];
  t: (k: string) => string;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Только лоты с выбранной доставкой
  const withDelivery = wonLots.filter((w) => w.deliveryReqs.length > 0);

  // Фильтрация по поисковому запросу (поддержка нескольких терминов)
  const filtered = useMemo(() => {
    const terms = parseSearchTerms(searchQuery);
    if (terms.length === 0) return withDelivery;
    return withDelivery.filter((wl) => {
      const bodyNum = (wl.bodyNumber || stripLotNumber(wl.lot.rawText) || "").toLowerCase();
      const lotNum = wl.lot.lotNumber.toLowerCase();
      // Лот подходит, если хотя бы один из термов найден в bodyNumber или lotNumber
      return terms.some((term) => {
        const tLower = term.toLowerCase();
        return bodyNum.includes(tLower) || lotNum.includes(tLower);
      });
    });
  }, [withDelivery, searchQuery]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.delivery")}</h1>
      </div>

      {/* Поиск по bodyNumber (несколько номеров через запятую/пробел) */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("delivery.searchPlaceholder")}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-2">
            {t("delivery.found")}: <span className="aa-mono font-bold text-primary">{filtered.length}</span> / {withDelivery.length}
          </p>
        )}
      </div>

      {withDelivery.length === 0 ? (
        <EmptyState icon={<Truck className="w-10 h-10 text-muted-foreground" />} text={t("delivery.noRequests")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search className="w-10 h-10 text-muted-foreground" />} text={t("delivery.noSearchResults")} />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
          {filtered.map((wl) => {
            const req = wl.deliveryReqs[0];
            const isDuty = req?.method === "DUTY";
            return (
              <motion.div key={wl.id} variants={itemVariants} className="aa-card aa-card-hover overflow-hidden">
                <div className="flex items-start justify-between p-5 pb-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl aa-grad flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {t("delivery.lotNumber")}
                      </div>
                      <div className="text-xl font-extrabold aa-mono text-primary mt-0.5 truncate">#{wl.lot.lotNumber}</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    {t("delivery.choosen")}
                  </span>
                </div>
                <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      {t("delivery.lotInfo")}
                    </div>
                    <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label={t("delivery.lotNumber")} value={`#${wl.lot.lotNumber}`} mono />
                    <InfoRow
                      icon={<FileText className="w-3.5 h-3.5" />}
                      label={t("wonLots.bodyNumber")}
                      value={wl.bodyNumber || stripLotNumber(wl.lot.rawText) || "—"}
                    />
                    <InfoRow icon={<Coins className="w-3.5 h-3.5" />} label={t("delivery.price")} value={wl.price ? `${wl.price.toLocaleString()} ${t("wonLots.currency")}` : "—"} mono />
                    <InfoRow icon={<Truck className="w-3.5 h-3.5" />} label={t("delivery.method")} value={req?.method ? t(`delivery.${req.method}`) : "—"} />
                    <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label={t("delivery.createdAt")} value={req ? new Date(req.createdAt).toLocaleString() : "—"} />
                  </div>
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
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
        <div className={`text-sm text-foreground break-words ${mono ? "aa-mono font-semibold" : "font-medium"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
