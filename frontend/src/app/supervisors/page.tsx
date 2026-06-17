"use client";

import { CheckCircle, KeyRound, Power, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { PageLoader } from "@/components/Loader";
import { supervisorService } from "@/lib/api";
import { accessStyles, emptyPermissions, MODULES } from "@/lib/modules";
import type { ModuleAccess, Supervisor } from "@/types/api";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [createPerms, setCreatePerms] = useState<Record<string, ModuleAccess>>(emptyPermissions());
  const [saving, setSaving] = useState(false);

  // Edit access
  const [editing, setEditing] = useState<Supervisor | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, ModuleAccess>>(emptyPermissions());

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
    if (!form.name || !form.email || !form.password) {
      setError("Name, email and password are required");
      return;
    }
    setSaving(true);
    try {
      await supervisorService.create({ ...form, permissions: createPerms });
      setShowCreate(false);
      setForm({ name: "", email: "", password: "" });
      setCreatePerms(emptyPermissions());
      await load();
      flash("Supervisor account created");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create supervisor");
    } finally {
      setSaving(false);
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

      {loading ? (
        <PageLoader label="Loading supervisors…" />
      ) : supervisors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <ShieldCheck className="mx-auto text-slate-300" size={36} />
          <p className="mt-3 text-sm font-medium text-slate-600">No supervisors yet</p>
          <p className="text-xs text-slate-400">Create one to delegate access to specific modules.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {supervisors.map((s) => (
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
                  <p className="truncate text-xs text-slate-500">{s.email}</p>
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
            <input className={field} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={field} placeholder="Password * (min 6 chars)" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <PermissionMatrix value={createPerms} onChange={setCreatePerms} />
            <button onClick={create} disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              <UserPlus size={16} /> {saving ? "Creating…" : "Create supervisor"}
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
