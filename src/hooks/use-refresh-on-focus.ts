"use client";

import { useEffect, useRef } from "react";

/**
 * Silently re-fetches whenever the tab/PWA regains visibility or focus.
 *
 * Mobile PWAs and background tabs don't get remounted when you switch back
 * to them — React's mount effects only fire once, so without this, whatever
 * was on screen when you left is exactly what's still there when you come
 * back, even if the data changed server-side in the meantime (e.g. an admin
 * accepted a bid while the client's app was in the background).
 *
 * This works with zero extra infrastructure — no WebSocket/realtime service
 * needed, unlike push notifications or the optional mini-services/realtime.
 */
export function useRefreshOnFocus(callback: () => void, minIntervalMs = 8000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const lastRunRef = useRef(0);

  useEffect(() => {
    const maybeRefresh = () => {
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      callbackRef.current();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", maybeRefresh);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [minIntervalMs]);
}
