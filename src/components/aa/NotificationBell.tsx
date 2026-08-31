"use client";

import React, { useRef } from "react";
import { Bell, BellRinging, CircleNotch } from "@phosphor-icons/react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const LONG_PRESS_MS = 550;

export function NotificationBell({ authHeaders }: { authHeaders: HeadersInit }) {
  const { t } = useLanguage();
  const { supported, needsInstall, permission, subscribed, loading, subscribe, unsubscribe, testSelf } =
    usePushNotifications(authHeaders);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  if (!supported) return null;

  const handleTap = async () => {
    if (needsInstall) {
      toast.error(t("push.needsInstall"));
      return;
    }
    if (subscribed) {
      // Already on — a plain tap re-runs the self-test rather than
      // unsubscribing, so a stray click can't silently turn notifications
      // off. Hold the button to unsubscribe instead.
      const result = await testSelf();
      if (result.ok) {
        toast.success(t("push.testSentCheckDevice"));
      } else {
        toast.error(`${t("push.testFailed")}: ${result.message}`);
      }
      return;
    }
    const ok = await subscribe();
    if (ok) {
      const result = await testSelf();
      if (result.ok) {
        toast.success(t("push.enabledAndTested"));
      } else {
        toast.error(`${t("push.enabledButTestFailed")}: ${result.message}`);
      }
    } else if (permission === "denied" || Notification.permission === "denied") {
      toast.error(t("push.permissionDenied"));
    } else {
      toast.error(t("common.error"));
    }
  };

  const startPress = () => {
    if (!subscribed) return;
    longPressFired.current = false;
    pressTimer.current = setTimeout(async () => {
      longPressFired.current = true;
      await unsubscribe();
      toast.success(t("push.disabled"));
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return; // the long-press already handled it — don't also fire a tap
    }
    void handleTap();
  };

  return (
    <button
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      disabled={loading}
      title={subscribed ? t("push.holdToDisable") : t("push.enable")}
      aria-label={subscribed ? t("push.holdToDisable") : t("push.enable")}
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
