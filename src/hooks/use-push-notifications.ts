"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** True when running as an installed PWA (standalone display mode). */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari-specific flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function usePushNotifications(authHeaders: HeadersInit) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    const hasApi =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(hasApi);
    // iOS only supports Web Push for PWAs added to the home screen —
    // a regular Safari tab will silently fail to subscribe.
    setNeedsInstall(isIos() && !isStandalone());
    if (!hasApi) return;

    setPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || needsInstall) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) return false;
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        return false;
      }
      setSubscribed(true);
      return true;
    } finally {
      setLoading(false);
    }
  }, [supported, needsInstall, authHeaders]);

  /** Pings /api/push/test right after subscribing — tells you exactly what's
   * wrong (not configured server-side / lost the subscription / actually sent)
   * instead of a silent "maybe it works, maybe it doesn't". */
  const testSelf = useCallback(async (): Promise<
    { ok: true } | { ok: false; reason: string; message: string }
  > => {
    try {
      const res = await fetch("/api/push/test", { method: "POST", headers: authHeaders });
      const data = await res.json();
      return data;
    } catch {
      return { ok: false, reason: "network_error", message: "Не удалось связаться с сервером" };
    }
  }, [authHeaders]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [supported, authHeaders]);

  return { supported, needsInstall, permission, subscribed, loading, subscribe, unsubscribe, testSelf };
}
