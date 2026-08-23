"use client";

import { useEffect, useRef } from "react";

/**
 * Hook для подписки на WebSocket события.
 *
 * Подключается к mini-service на порту 3003 (через Caddy XTransformPort).
 * При получении события вызывает callback.
 *
 * Если WebSocket недоступен (например, на Vercel без mini-service),
 * подключение тихо завершается — приложение продолжает работать в режиме polling.
 *
 * Использование:
 *   useRealtime("lot:created", () => { loadData() })
 *   useRealtime(["lot:created", "lot:deleted"], () => { loadData() })
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
        // Динамический импорт socket.io-client (только на клиенте)
        const { io } = await import("socket.io-client");
        if (cancelled) return;

        // Подключаемся через Caddy: / с XTransformPort=3003
        socket = io("/?XTransformPort=3003", {
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

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
      socket?.disconnect();
    };
  }, []);
}
