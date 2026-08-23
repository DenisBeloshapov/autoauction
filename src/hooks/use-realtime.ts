"use client";

import { useEffect, useRef } from "react";

/**
 * Hook для подписки на WebSocket события.
 *
 * На Vercel (без mini-service) подключение тихо завершается —
 * приложение продолжает работать без real-time.
 * Ошибки в консоли подавляются.
 */

export function useRealtime(
  events: string | string[],
  callback: (data: unknown) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let socket: { on: (event: string, cb: (data: unknown) => void) => void; disconnect: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import("socket.io-client");
        if (cancelled) return;
        const io = mod.io;

        // Таймаут 3 секунды — если не подключилось, тихо выходим
        const timeout = setTimeout(() => { cancelled = true; }, 3000);

        socket = io("/?XTransformPort=3003", {
          transports: ["websocket"],
          reconnection: false,
          timeout: 2000,
        });

        socket.on("connect_error", () => {
          // WebSocket недоступен (Vercel) — тихо отключаемся
          clearTimeout(timeout);
          cancelled = true;
          socket?.disconnect();
          socket = null;
        });

        socket.on("disconnect", () => {
          clearTimeout(timeout);
        });

        if (cancelled) { clearTimeout(timeout); return; }

        const eventList = Array.isArray(events) ? events : [events];
        eventList.forEach((event) => {
          socket?.on(event, (data: unknown) => {
            callbackRef.current(data);
          });
        });
      } catch {
        // socket.io-client недоступен — работаем без realtime
      }
    })();

    return () => {
      cancelled = true;
      try { socket?.disconnect(); } catch {}
    };
  }, []);
}
