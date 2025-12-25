"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = {
  id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  role: string;
  content: string;
};

export function ChatWidgetClient(props: { bookingId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const bookingId = useMemo(() => props.bookingId.trim(), [props.bookingId]);

  async function refresh() {
    const res = await fetch(`/api/chat/messages?booking_id=${encodeURIComponent(bookingId)}`, {
      method: "GET",
      credentials: "include"
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(data?.error ?? "failed");
    setMessages((data.messages ?? []) as Msg[]);
  }

  useEffect(() => {
    let cancelled = false;
    refresh().catch((e) => !cancelled && setError(String(e?.message ?? e)));
    const t = window.setInterval(() => {
      refresh().catch(() => {});
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      setDraft("");
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, content })
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setMessages((data.messages ?? []) as Msg[]);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setDraft(content);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 bg-white/5 px-3 py-2 text-sm">
        <div className="font-medium">Rentbox Support</div>
        <div className="text-xs text-white/60">Booking: {bookingId}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {error ? (
          <div className="mb-2 rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-100">
            {error}
          </div>
        ) : null}
        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.direction === "inbound";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
                    mine ? "bg-blue-500 text-white" : "bg-white/10 text-white"
                  ].join(" ")}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div className="mt-1 text-[10px] text-white/60">
                    {new Date(m.created_at).toLocaleTimeString()} · {m.role}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-white/10 p-2">
        <div className="flex gap-2">
          <input
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
            value={draft}
            placeholder="Type your message…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={loading}
          />
          <button
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
            onClick={() => void send()}
            disabled={loading}
          >
            Send
          </button>
        </div>
        <div className="mt-1 text-[11px] text-white/50">
          Safety: no refunds; locker open only when paid + within window + compartment match; outbound rate-limited.
        </div>
      </div>
    </div>
  );
}

