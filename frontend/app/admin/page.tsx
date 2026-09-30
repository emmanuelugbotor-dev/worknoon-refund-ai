"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

type Refund = {
  id: string;
  status: string;
  decision: string;
  amount: number;
  message: string;
  customer: any;
  order: any;
  policy: any;
  ai: any;
  audit: {
    event: string;
    actor: string;
    createdAt: string;
  }[];
  createdAt: string;
};
export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("admin@worknoon.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<Refund[]>([]);
  const [selected, setSelected] = useState<Refund | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const storedToken = localStorage.getItem("admin_token");
    setToken(storedToken);

    const handleAuthExpired = () => {
      setToken(null);
      setStats(null);
      setRows([]);
      setSelected(null);
    };

    window.addEventListener("admin-auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("admin-auth-expired", handleAuthExpired);
    };
  }, []);
  async function login() {
    try {
      const x = await api<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("admin_token", x.data.token);
      setToken(x.data.token);
      setAuthError("");
    } catch (e: any) {
      setAuthError(e.message);
    }
  }
  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [s, r] = await Promise.all([
        api<any>("/refunds/stats", { headers }),
        api<any>("/refunds?limit=50", { headers }),
      ]);
      setStats(s.data);
      setRows(r.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (token) load();
  }, [token]);
  if (!token)
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="card w-full max-w-md p-7">
          <div className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-400">
            WORKNOON · SUPPORT OPS
          </div>
          <h1 className="mt-2 text-2xl font-bold">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-500">
            Demo credentials are documented for the assessment environment.
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"
            placeholder="Password"
          />
          {authError && (
            <p className="mt-3 text-sm text-red-300">{authError}</p>
          )}
          <button
            onClick={login}
            className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-800 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-400">
              WORKNOON · SUPPORT OPS
            </div>
            <h1 className="mt-1 text-xl font-bold">Refund Operations</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
          >
            Customer flow
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total requests" value={stats?.total ?? "—"} />
          <Stat label="Approved" value={stats?.byStatus?.APPROVED ?? 0} />
          <Stat label="Denied" value={stats?.byStatus?.DENIED ?? 0} />
          <Stat label="Escalated" value={stats?.byStatus?.ESCALATED ?? 0} />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="font-semibold">Recent refund requests</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Policy decision + AI audit trail
                </p>
              </div>
              <button onClick={load} className="text-sm text-cyan-400">
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-slate-500">Loading…</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      api<any>(`/refunds/${r.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      }).then((x) => setSelected(x.data))
                    }
                    className="grid w-full grid-cols-[1fr_auto_auto] gap-4 p-4 text-left hover:bg-slate-900"
                  >
                    <div>
                      <div className="font-medium">{r.customer?.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {r.id} · {r.order?.id}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      ${r.amount.toFixed(2)}
                    </div>
                    <Badge status={r.status} />
                  </button>
                ))}
                {rows.length === 0 && (
                  <div className="p-8 text-slate-500">No requests yet.</div>
                )}
              </div>
            )}
          </div>
          <div className="card p-5">
            {selected ? (
              <Details r={selected} />
            ) : (
              <div className="grid min-h-[400px] place-items-center text-center text-slate-500">
                <div>
                  Select a request to inspect policy checks, AI analysis and
                  audit events.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
function Badge({ status }: { status: string }) {
  const c =
    status === "APPROVED"
      ? "text-emerald-300 bg-emerald-400/10"
      : status === "DENIED"
        ? "text-red-300 bg-red-400/10"
        : "text-amber-300 bg-amber-400/10";
  return (
    <span className={`h-fit rounded-full px-2.5 py-1 text-xs ${c}`}>
      {status}
    </span>
  );
}
function Details({ r }: { r: Refund }) {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500">{r.id}</div>
          <h2 className="mt-1 text-xl font-bold">{r.customer.name}</h2>
          <p className="text-sm text-slate-400">
            {r.order.id} · ${r.amount.toFixed(2)}
          </p>
        </div>
        <Badge status={r.status} />
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold">Customer request</h3>
        <p className="mt-2 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
          {r.message}
        </p>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold">Policy flags</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(r.policy?.flags || []).map((f: string) => (
            <span
              key={f}
              className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
            >
              {f}
            </span>
          ))}
          {!r.policy?.flags?.length && (
            <span className="text-sm text-emerald-300">No policy flags</span>
          )}
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold">AI reasoning summary</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{r.ai?.summary}</p>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold">Audit trail</h3>
        <div className="mt-2 space-y-2">
          {(r.audit || []).map((a, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-800 p-3 text-xs"
            >
              <div className="font-medium">{a.event}</div>
              <div className="mt-1 text-slate-500">
                {a.actor} · {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
