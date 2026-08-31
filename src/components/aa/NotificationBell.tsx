"use client";

import React from "react";
import { Bell, BellRinging, CircleNotch } from "@phosphor-icons/react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export function NotificationBell({ authHeaders }: { authHeaders: HeadersInit }) {
  const { t } = useLanguage();
  const { supported, needsInstall, permission, subscribed, loading, subscribe, unsubscribe } =
    usePushNotifications(authHeaders);

  if (!supported) return null;

  const handleClick = async () => {
    if (needsInstall) {
      toast.error(t("push.needsInstall"));
      return;
    }
    if (subscribed) {
      await unsubscribe();
      toast.success(t("push.disabled"));
      return;
    }
    const ok = await subscribe();
    if (ok) {
      toast.success(t("push.enabled"));
    } else if (permission === "denied" || Notification.permission === "denied") {
      toast.error(t("push.permissionDenied"));
    } else {
      toast.error(t("common.error"));
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={subscribed ? t("push.disable") : t("push.enable")}
      aria-label={subscribed ? t("push.disable") : t("push.enable")}
      className="h-9 w-9 rounded-md border border-border bg-card hover:bg-muted flex items-center justify-center transition disabled:opacity-60"
    >
      {loading ? (
        <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
      ) : subscribed ? (
        <BellRinging className="w-4 h-4 text-primary" weight="fill" />
      ) : (
        <Bell className="w-4 h-4" weight="regular" />
      )}
    </button>
  );
}
