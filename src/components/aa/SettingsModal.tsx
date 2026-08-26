"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { CircleNotch, Check, ShieldCheck, EnvelopeSimple, Plugs } from "@phosphor-icons/react";

type Settings = {
  emailRecipient: string | null;
  emailSubjectTemplate: string | null;
  emailIntroTemplate: string | null;
  smtpHost: string | null;
  smtpPort: string | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpPasswordConfigured: boolean;
};

const EMPTY: Settings = {
  emailRecipient: null,
  emailSubjectTemplate: null,
  emailIntroTemplate: null,
  smtpHost: null,
  smtpPort: "587",
  smtpUser: null,
  smtpFrom: null,
  smtpPasswordConfigured: false,
};

function CategoryHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/30 transition-colors";
const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

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
        emailSubjectTemplate: settings.emailSubjectTemplate || "",
        emailIntroTemplate: settings.emailIntroTemplate || "",
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
          <CircleNotch className="w-6 h-6 animate-spin text-primary" weight="bold" />
        </div>
      ) : (
        <div className="space-y-7">
          {/* Категория: Безопасность */}
          <section>
            <CategoryHeader icon={<ShieldCheck className="w-4 h-4" weight="bold" />} title={t("settings.categorySecurity")} />
            <div className="space-y-2 pl-9">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settings.currentPassword")}
                className={inputClass}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings.newPassword")}
                className={inputClass}
              />
              <button
                onClick={changePassword}
                disabled={savingPassword || !currentPassword || !newPassword}
                className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {savingPassword && <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />}
                {t("settings.changePassword")}
              </button>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Категория: Письмо клиентам */}
          <section>
            <CategoryHeader icon={<EnvelopeSimple className="w-4 h-4" weight="bold" />} title={t("settings.categoryEmail")} />
            <div className="space-y-3 pl-9">
              <div>
                <label className={labelClass}>{t("settings.emailRecipient")}</label>
                <input
                  type="email"
                  value={settings.emailRecipient || ""}
                  onChange={(e) => setSettings({ ...settings, emailRecipient: e.target.value })}
                  placeholder="auction@company.com"
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>{t("settings.emailSubjectTemplate")}</label>
                <input
                  type="text"
                  value={settings.emailSubjectTemplate || ""}
                  onChange={(e) => setSettings({ ...settings, emailSubjectTemplate: e.target.value })}
                  placeholder="Лоты от {date}"
                  className={`${inputClass} mt-1 aa-mono`}
                />
                <p className="text-[11px] text-muted-foreground mt-1">{t("settings.emailSubjectHint")}</p>
              </div>
              <div>
                <label className={labelClass}>{t("settings.emailIntroTemplate")}</label>
                <textarea
                  value={settings.emailIntroTemplate || ""}
                  onChange={(e) => setSettings({ ...settings, emailIntroTemplate: e.target.value })}
                  placeholder={t("settings.emailIntroTemplate")}
                  rows={3}
                  className={`${inputClass} h-auto py-2.5 mt-1 resize-none`}
                />
                <p className="text-[11px] text-muted-foreground mt-1">{t("settings.emailIntroHint")}</p>
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* Категория: SMTP-подключение */}
          <section>
            <CategoryHeader icon={<Plugs className="w-4 h-4" weight="bold" />} title={t("settings.categorySmtp")} />
            <div className="pl-9 space-y-3">
              <p className="text-xs text-muted-foreground">{t("settings.smtpHint")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>{t("settings.smtpHost")}</label>
                  <input
                    type="text"
                    value={settings.smtpHost || ""}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className={`${inputClass} mt-1`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("settings.smtpPort")}</label>
                  <input
                    type="text"
                    value={settings.smtpPort || ""}
                    onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                    placeholder="587"
                    className={`${inputClass} mt-1`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("settings.smtpUser")}</label>
                  <input
                    type="email"
                    value={settings.smtpUser || ""}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    placeholder="sender@gmail.com"
                    className={`${inputClass} mt-1`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t("settings.smtpFrom")}</label>
                  <input
                    type="text"
                    value={settings.smtpFrom || ""}
                    onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                    placeholder='AutoAuction <sender@gmail.com>'
                    className={`${inputClass} mt-1`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>
                    {t("settings.smtpPassword")} {settings.smtpPasswordConfigured && <Check className="inline w-3.5 h-3.5 text-[#346538]" weight="bold" />}
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={settings.smtpPasswordConfigured ? t("settings.smtpPasswordConfigured") : t("settings.smtpPassword")}
                    className={`${inputClass} mt-1`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-md border border-border hover:bg-muted text-sm font-medium transition"
            >
              {t("common.close")}
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {saving && <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
