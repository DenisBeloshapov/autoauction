"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";

type Settings = {
  emailRecipient: string | null;
  smtpHost: string | null;
  smtpPort: string | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpPasswordConfigured: boolean;
};

const EMPTY: Settings = {
  emailRecipient: null,
  smtpHost: null,
  smtpPort: "587",
  smtpUser: null,
  smtpFrom: null,
  smtpPasswordConfigured: false,
};

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/settings", { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setSettings({ ...EMPTY, ...data.settings }))
      .catch(() => toast.error(t("common.error")))
      .finally(() => setLoading(false));
  }, [open]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const body: Record<string, string | null> = {
        emailRecipient: settings.emailRecipient || "",
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || "",
        smtpUser: settings.smtpUser || "",
        smtpFrom: settings.smtpFrom || "",
      };
      if (smtpPassword) body.smtpPassword = smtpPassword;
      const res = await fetch("/api/settings", { method: "PUT", headers: authHeaders, body: JSON.stringify(body) });
      if (res.ok) { toast.success(t("common.success")); setSmtpPassword(""); }
      else { const data = await res.json().catch(() => ({})); toast.error(data.error || t("common.error")); }
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: authHeaders, body: JSON.stringify({ currentPassword, newPassword }) });
      if (res.ok) { toast.success(t("settings.passwordChanged")); setCurrentPassword(""); setNewPassword(""); }
      else { const data = await res.json().catch(() => ({})); toast.error(data.error || t("common.error")); }
    } finally { setSavingPassword(false); }
  };

  const inputCls = "w-full h-11 rounded-[8px] border border-[#EAEAEA] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111] transition";
  const labelCls = "text-xs font-semibold text-[#787774] uppercase tracking-wide";

  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")} size="md">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <CircleNotch size={24} weight="bold" className="text-[#111111] animate-spin" aria-hidden="true" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-[#111111]">{t("settings.changePassword")}</h3>
            <div className="space-y-2">
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t("settings.currentPassword") + "…"} autoComplete="current-password" className={inputCls} />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("settings.newPassword") + "…"} autoComplete="new-password" className={inputCls} />
              <button onClick={changePassword} disabled={savingPassword || !currentPassword || !newPassword} className="h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:bg-[#333333] active:scale-[0.98] transition">
                {savingPassword && <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden="true" />}
                {t("settings.changePassword")}
              </button>
            </div>
          </section>
          <div className="border-t border-[#EAEAEA]" />
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-[#111111]">{t("settings.emailRecipient")}</h3>
            <input type="email" value={settings.emailRecipient || ""} onChange={(e) => setSettings({ ...settings, emailRecipient: e.target.value })} placeholder="auction@company.com…" autoComplete="off" className={inputCls} />
          </section>
          <div className="border-t border-[#EAEAEA]" />
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-[#111111]">{t("settings.smtpConfig")}</h3>
            <p className="text-xs text-[#787774]">{t("settings.smtpHint")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={labelCls}>{t("settings.smtpHost")}</label><input type="text" value={settings.smtpHost || ""} onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })} placeholder="smtp.gmail.com…" autoComplete="off" className={inputCls} /></div>
              <div><label className={labelCls}>{t("settings.smtpPort")}</label><input type="text" value={settings.smtpPort || ""} onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })} placeholder="587…" autoComplete="off" className={inputCls} /></div>
              <div><label className={labelCls}>{t("settings.smtpUser")}</label><input type="email" value={settings.smtpUser || ""} onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })} placeholder="sender@gmail.com…" autoComplete="off" className={inputCls} /></div>
              <div className="col-span-2"><label className={labelCls}>{t("settings.smtpFrom")}</label><input type="text" value={settings.smtpFrom || ""} onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })} placeholder="AutoAuction <sender@gmail.com>…" autoComplete="off" className={inputCls} /></div>
              <div className="col-span-2"><label className={labelCls}>{t("settings.smtpPassword")} {settings.smtpPasswordConfigured && <span className="text-[#346538]">✓</span>}</label><input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={settings.smtpPasswordConfigured ? t("settings.smtpPasswordConfigured") + "…" : t("settings.smtpPassword") + "…"} autoComplete="off" className={inputCls} /></div>
            </div>
          </section>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#EAEAEA]">
            <button onClick={onClose} className="h-10 px-4 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] text-sm font-medium transition">{t("common.close")}</button>
            <button onClick={saveSettings} disabled={saving} className="h-10 px-4 rounded-[6px] bg-[#111111] text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:bg-[#333333] active:scale-[0.98] transition">
              {saving && <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden="true" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
