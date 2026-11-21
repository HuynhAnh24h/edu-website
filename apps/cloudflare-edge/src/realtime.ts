import { DurableObject } from "cloudflare:workers";

interface WsMeta {
  uid: string;
  name: string;
  role: string;
}

/**
 * Cloudflare Durable Object với Hibernatable WebSockets (0ms push, 0 CPU khi nhàn rỗi).
 * Mỗi phòng chat (`chat:<roomKey>`), mỗi người dùng (`user:<uid>`),
 * kênh cộng đồng (`social:feed`) và kênh cảnh báo Admin (`admin:safety`)
 * là một Durable Object độc lập để mở rộng tuyến tính không nghẽn cổ chai.
 */
export class RealtimeHub extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 1. Nâng cấp kết nối WebSocket cho trình duyệt
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const uid = url.searchParams.get("uid") || "guest";
      const name = url.searchParams.get("name") || "Thành viên";
      const role = url.searchParams.get("role") || "student";

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ uid, name, role } satisfies WsMeta);

      // Gửi trạng thái online hiện tại cho cả phòng ngay lập tức
      this.broadcastPresence();

      return new Response(null, { status: 101, webSocket: client });
    }

    // 2. Nội bộ Worker đẩy sự kiện real-time tới tất cả socket đang mở trong kênh này
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const payload = await request.text();
      this.broadcastRaw(payload);
      return new Response(JSON.stringify({ ok: true, clients: this.ctx.getWebSockets().length }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("RealtimeHub Ready", { status: 200 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    try {
      const data = JSON.parse(message) as { type?: string; is_typing?: boolean };
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        return;
      }
      if (data.type === "typing") {
        const meta = (ws.deserializeAttachment() as WsMeta | null) || {
          uid: "unknown",
          name: "Thành viên",
          role: "student",
        };
        const payload = JSON.stringify({
          type: "typing",
          uid: meta.uid,
          name: meta.name,
          is_typing: Boolean(data.is_typing),
        });
        for (const peer of this.ctx.getWebSockets()) {
          if (peer !== ws) {
            try {
              peer.send(payload);
            } catch {
              // ignore closed socket
            }
          }
        }
      }
    } catch {
      // ignore malformed ws frame
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {
      // already closed
    }
    this.broadcastPresence(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {
      // ignore
    }
    this.broadcastPresence(ws);
  }

  private broadcastRaw(payload: string) {
    for (const sock of this.ctx.getWebSockets()) {
      try {
        sock.send(payload);
      } catch {
        // socket closed
      }
    }
  }

  private broadcastPresence(excluding?: WebSocket) {
    const onlineUsers: { uid: string; name: string; role: string }[] = [];
    const seen = new Set<string>();
    for (const sock of this.ctx.getWebSockets()) {
      if (excluding && sock === excluding) continue;
      const meta = sock.deserializeAttachment() as WsMeta | null;
      if (meta && !seen.has(meta.uid)) {
        seen.add(meta.uid);
        onlineUsers.push(meta);
      }
    }
    this.broadcastRaw(JSON.stringify({ type: "presence", online: onlineUsers }));
  }
}

export async function pushRealtimeEvent(
  hub: DurableObjectNamespace | undefined,
  channel: string,
  event: Record<string, unknown>
): Promise<void> {
  if (!hub) return;
  try {
    const id = hub.idFromName(channel);
    const stub = hub.get(id);
    await stub.fetch("https://realtime.internal/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...event, ts: Date.now() }),
    });
  } catch {
    // Non-fatal: REST persistence already succeeded
  }
}
