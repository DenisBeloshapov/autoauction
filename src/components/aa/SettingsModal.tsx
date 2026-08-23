"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  // Password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // SMTP password (only entered when changing)
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

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(t("common.success"));
        setSmtpPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("common.error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success(t("settings.passwordChanged"));
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("common.error"));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")} size="md">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Смена пароля */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">{t("settings.changePassword")}</h3>
            <div className="space-y-2">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settings.currentPassword")}
                className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings.newPassword")}
                className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={changePassword}
                disabled={savingPassword || !currentPassword || !newPassword}
                className="h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60 hover:brightness-110 transition"
              >
                {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("settings.changePassword")}
              </button>
            </div>
          </section>

          <div className="border-t border-border/60" />

          {/* Email получателя */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">{t("settings.emailRecipient")}</h3>
            <input
              type="email"
              value={settings.emailRecipient || ""}
              onChange={(e) => setSettings({ ...settings, emailRecipient: e.target.value })}
              placeholder="auction@company.com"
              className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </section>

          <div className="border-t border-border/60" />

          {/* SMTP настройки */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">{t("settings.smtpConfig")}</h3>
            <p className="text-xs text-muted-foreground">{t("settings.smtpHint")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t("settings.smtpHost")}</label>
                <input
                  type="text"
                  value={settings.smtpHost || ""}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t("settings.smtpPort")}</label>
                <input
                  type="text"
                  value={settings.smtpPort || ""}
                  onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                  placeholder="587"
                  className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t("settings.smtpUser")}</label>
                <input
                  type="email"
                  value={settings.smtpUser || ""}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  placeholder="sender@gmail.com"
                  className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t("settings.smtpFrom")}</label>
                <input
                  type="text"
                  value={settings.smtpFrom || ""}
                  onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                  placeholder='AutoAuction <sender@gmail.com>'
                  className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("settings.smtpPassword")} {settings.smtpPasswordConfigured && <span className="text-emerald-600">✓</span>}
                </label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={settings.smtpPasswordConfigured ? t("settings.smtpPasswordConfigured") : t("settings.smtpPassword")}
                  className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-border hover:bg-muted text-sm font-medium transition"
            >
              {t("common.close")}
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="h-10 px-4 rounded-xl aa-grad text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60 hover:brightness-110 transition"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
