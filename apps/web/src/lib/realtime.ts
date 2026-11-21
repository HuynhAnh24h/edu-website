"use client";

import { CORE_API_URL } from "@/lib/api";

export interface RealtimeHandle {
  send: (payload: Record<string, unknown>) => void;
  close: () => void;
}

function buildWsUrl(channel: string, token?: string | null): string {
  const base =
    CORE_API_URL && CORE_API_URL.startsWith("http")
      ? CORE_API_URL
      : typeof window !== "undefined"
        ? window.location.origin
        : "https://eduk12-scale.eduk12-scale.workers.dev";
  const wsBase = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
  const qs = new URLSearchParams({ channel });
  if (token) qs.set("token", token);
  return `${wsBase}/api/v1/ws?${qs.toString()}`;
}

/**
 * Kết nối WebSocket Real-time bền vững tới Cloudflare Durable Object RealtimeHub.
 * Tự động giữ kết nối (heartbeat) và tự động kết nối lại nếu mạng chập chờn.
 */
export function connectRealtimeChannel(
  channel: string,
  token: string | null | undefined,
  callbacks: {
    onEvent: (event: Record<string, unknown>) => void;
    onStatus?: (connected: boolean) => void;
  }
): RealtimeHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let attempt = 0;

  const cleanupTimers = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pingTimer) clearInterval(pingTimer);
    reconnectTimer = null;
    pingTimer = null;
  };

  const openSocket = () => {
    if (closed || typeof window === "undefined") return;
    try {
      ws = new WebSocket(buildWsUrl(channel, token));
    } catch {
      callbacks.onStatus?.(false);
      return;
    }

    ws.onopen = () => {
      attempt = 0;
      callbacks.onStatus?.(true);
      pingTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.data)) as Record<string, unknown>;
        if (parsed.type !== "pong") {
          callbacks.onEvent(parsed);
        }
      } catch {
        // ignore non-json frames
      }
    };

    ws.onclose = () => {
      cleanupTimers();
      callbacks.onStatus?.(false);
      if (!closed) {
        const delay = Math.min(8000, 1200 * Math.pow(1.5, attempt++));
        reconnectTimer = setTimeout(openSocket, delay);
      }
    };

    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  };

  openSocket();

  return {
    send(payload: Record<string, unknown>) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    },
    close() {
      closed = true;
      cleanupTimers();
      try {
        ws?.close();
      } catch {
        // ignore
      }
    },
  };
}
