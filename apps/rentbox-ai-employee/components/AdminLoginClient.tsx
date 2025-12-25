"use client";

import { useState } from "react";

export function AdminLoginClient() {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key })
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error ?? "unauthorized");
      window.location.href = "/admin";
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-white/70">Enter the admin key to access the console.</div>
      {error ? (
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-100">
          {error}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
          value={key}
          placeholder="ADMIN_API_KEY"
          onChange={(e) => setKey(e.target.value)}
          disabled={loading}
        />
        <button
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
          onClick={() => void submit()}
          disabled={loading || key.trim().length === 0}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

