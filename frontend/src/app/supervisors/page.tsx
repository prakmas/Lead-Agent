"use client";

import { BellRing, Check, CheckCircle, Eye, EyeOff, KeyRound, MapPin, Power, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { TerritoryEditor } from "@/components/TerritoryEditor";
import { PageLoader } from "@/components/Loader";
import { supervisorService } from "@/lib/api";
import { accessStyles, emptyPermissions, MODULES } from "@/lib/modules";
import type { ModuleAccess, Supervisor, Territory } from "@/types/api";

const territoryStyles: Record<string, string> = {
  state: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  city: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  pincode: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [revealPw, setRevealPw] = useState<Record<string, boolean>>({});

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", location: "", pincode: "", password: "" });
  const [createPerms, setCreatePerms] = useState<Record<string, ModuleAccess>>(emptyPermissions());
  const [createTerr, setCreateTerr] = useState<Territory[]>([]);
  const [saving, setSaving] = useState(false);

  // Edit access
  const [editing, setEditing] = useState<Supervisor | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, ModuleAccess>>(emptyPermissions());

  // Edit territory
  const [terrTarget, setTerrTarget] = useState<Supervisor | null>(null);
  const [terrValue, setTerrValue] = useState<Territory[]>([]);

  // Reset password
  const [pwTarget, setPwTarget] = useState<Supervisor | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  };

  const load = useCallback(async () => {
    const res = await supervisorService.list();
    setSupervisors(res.data);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  const create = async () => {
    setError("");
    if (!form.name || !form.phone || !form.pincode || !form.password) {
      setError("Name, phone, pincode and password are required");
      return;
    }
    setSaving(true);
    try {
      await supervisorService.create({
        name: form.name,
        phone: form.phone,
        pincode: form.pincode,
        password: form.password,
        email: form.email || undefined,
        location: form.location || undefined,
        permissions: createPerms,
        territories: createTerr,
      });
      setShowCreate(false);
      setForm({ name: "", phone: "", email: "", location: "", pincode: "", password: "" });
      setCreatePerms(emptyPermissions());
      setCreateTerr([]);
      await load();
      flash("Supervisor account created");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create supervisor");
    } finally {
      setSaving(false);
    }
  };

  const approve = async (s: Supervisor) => {
    try {
      await supervisorService.approve(s._id);
      await load();
      flash(`${s.name} approved`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    }
  };

  const reject = async (s: Supervisor) => {
    if (!confirm(`Reject ${s.name}'s signup? They won't be able to log in.`)) return;
    try {
      await supervisorService.reject(s._id);
      await load();
      flash(`${s.name} rejected`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    }
  };

  const saveAccess = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await supervisorService.setPermissions(editing._id, editPerms);
      setEditing(null);
      await load();
      flash("Access updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update access");
    } finally {
      setSaving(false);
    }
  };

  const saveTerritory = async () => {
    if (!terrTarget) return;
    setSaving(true);
    try {
      await supervisorService.setTerritories(terrTarget._id, terrValue);
      setTerrTarget(null);
      await load();
      flash("Territory updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update territory");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Supervisor) => {
    try {
      await supervisorService.setActive(s._id, !s.isActive);
      await load();
      flash(s.isActive ? "Supervisor deactivated" : "Supervisor activated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const revoke = async (s: Supervisor) => {
    if (!confirm(`Revoke ${s.name}'s account? This permanently deletes their login.`)) return;
    try {
      await supervisorService.revoke(s._id);
      await load();
      flash("Supervisor revoked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke");
    }
  };

  const savePassword = async () => {
    if (!pwTarget) return;
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      await supervisorService.setPassword(pwTarget._id, newPassword);
      setPwTarget(null);
      setNewPassword("");
      flash("Password updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set password");
    } finally {
      setSaving(false);
    }
  };

  const field = "h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

  const pendingList = supervisors.filter((s) => s.approvalStatus === "pending");
  const approvedList = supervisors.filter((s) => s.approvalStatus !== "pending");

  return (
    <AppShell>
      <PageHeader
        title="Supervisors"
        description="Create supervisor accounts and control which modules each one can access."
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <UserPlus size={16} /> New supervisor
          </button>
        }
      />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle size={15} /> {notice}
        </div>
      ) : null}

      {/* ── Pending signups awaiting approval ── */}
      {!loading && pendingList.length > 0 ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <BellRing size={16} className="text-amber-600" />
            <h2 className="text-sm font-bold text-amber-900">
              {pendingList.length} signup{pendingList.length > 1 ? "s" : ""} awaiting approval
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingList.map((s) => (
              <div key={s._id} className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-950">{s.name}</p>
                <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                  {s.phone ? <p>📞 {s.phone}</p> : null}
                  {s.location ? <p>📍 {s.location}</p> : null}
                  {s.pincode ? <p>PIN {s.pincode}</p> : null}
                  {s.email ? <p>✉️ {s.email}</p> : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approve(s)}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(s)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-300 px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <PageLoader label="Loading supervisors…" />
      ) : approvedList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <ShieldCheck className="mx-auto text-slate-300" size={36} />
          <p className="mt-3 text-sm font-medium text-slate-600">No active supervisors yet</p>
          <p className="text-xs text-slate-400">Create one, or approve a pending signup above.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {approvedList.map((s) => (
            <div key={s._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.isActive ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}>
                  {initials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950">{s.name}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${s.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-0.5 text-xs text-slate-500">
                    {s.phone ? <p className="truncate">📞 {s.phone}</p> : null}
                    {s.location ? <p className="truncate">📍 {s.location}{s.pincode ? ` · ${s.pincode}` : ""}</p> : s.pincode ? <p>PIN {s.pincode}</p> : null}
                    {s.email ? <p className="truncate">✉️ {s.email}</p> : null}
                  </div>
                  {/* Admin-viewable password */}
                  {s.viewPassword ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <KeyRound size={11} />
                      <span className="font-mono">{revealPw[s._id] ? s.viewPassword : "••••••••"}</span>
                      <button type="button" onClick={() => setRevealPw((p) => ({ ...p, [s._id]: !p[s._id] }))} className="text-slate-400 hover:text-slate-700">
                        {revealPw[s._id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {s.lastLoginAt ? `Last login ${new Date(s.lastLoginAt).toLocaleDateString()}` : "Never logged in"}
                  </p>
                </div>
              </div>

              {/* Permission summary */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {MODULES.map((m) => {
                  const lvl = (s.permissions?.[m.key] || "none") as ModuleAccess;
                  return (
                    <span key={m.key} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${accessStyles[lvl]}`}>
                      {m.label}: {lvl === "none" ? "—" : lvl}
                    </span>
                  );
                })}
              </div>

              {/* Territory summary */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                {s.territories && s.territories.length > 0 ? (
                  s.territories.map((t) => (
                    <span key={`${t.level}-${t.value}`} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${territoryStyles[t.level]}`}>
                      {t.value}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] italic text-slate-400">No territory assigned (sees no listings)</span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(s);
                    setEditPerms({ ...emptyPermissions(), ...(s.permissions || {}) });
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ShieldCheck size={13} /> Edit access
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTerrTarget(s);
                    setTerrValue(s.territories || []);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <MapPin size={13} /> Territory
                </button>
                <button
                  type="button"
                  onClick={() => setPwTarget(s)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <KeyRound size={13} /> Password
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(s)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${s.isActive ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                >
                  <Power size={13} /> {s.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => revoke(s)}
                  title="Revoke account"
                  className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {showCreate ? (
        <Modal title="New supervisor" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <input className={field} placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={field} placeholder="Phone *" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className={field} placeholder="Pincode *" inputMode="numeric" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </div>
            <input className={field} placeholder="Location (area / city)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input className={field} placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={field} placeholder="Password * (min 6 chars)" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="text-[11px] text-slate-400">The pincode is added as the supervisor&apos;s territory automatically.</p>
            <PermissionMatrix value={createPerms} onChange={setCreatePerms} />
            <TerritoryEditor value={createTerr} onChange={setCreateTerr} />
            <button onClick={create} disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              <UserPlus size={16} /> {saving ? "Creating…" : "Create supervisor"}
            </button>
          </div>
        </Modal>
      ) : null}

      {/* ── Edit territory modal ── */}
      {terrTarget ? (
        <Modal title={`Territory — ${terrTarget.name}`} onClose={() => setTerrTarget(null)}>
          <div className="space-y-3">
            <TerritoryEditor value={terrValue} onChange={setTerrValue} />
            <button onClick={saveTerritory} disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              <CheckCircle size={16} /> {saving ? "Saving…" : "Save territory"}
            </button>
          </div>
        </Modal>
      ) : null}

      {/* ── Edit access modal ── */}
      {editing ? (
        <Modal title={`Edit access — ${editing.name}`} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <PermissionMatrix value={editPerms} onChange={setEditPerms} />
            <button onClick={saveAccess} disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              <CheckCircle size={16} /> {saving ? "Saving…" : "Save access"}
            </button>
          </div>
        </Modal>
      ) : null}

      {/* ── Reset password modal ── */}
      {pwTarget ? (
        <Modal title={`Set password — ${pwTarget.name}`} onClose={() => { setPwTarget(null); setNewPassword(""); }}>
          <div className="space-y-3">
            <input className={field} placeholder="New password (min 6 chars)" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <p className="text-xs text-slate-400">Share this password with the supervisor so they can log in.</p>
            <button onClick={savePassword} disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
              <KeyRound size={16} /> {saving ? "Saving…" : "Update password"}
            </button>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
