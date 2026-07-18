"use client";

import { ROLES, ROLE_LABEL } from "@/server/authz/policy";
import { KeyRound, Pencil, Trash2, UserPlus, X, Users as UsersIcon } from "lucide-react";
import { useState } from "react";

const EMPTY = { name: "", email: "", password: "", role: "sales_agent" };

const ROLE_STYLE = {
  super_admin: { bg: "#7C3AED18", fg: "#6D28D9" },
  admin: { bg: "#2563EB18", fg: "#1D4ED8" },
  sales_agent: { bg: "#1F7A6B18", fg: "#1F7A6B" },
  telecaller: { bg: "#C58A1218", fg: "#8a6410" },
};

const AVATAR_COLORS = [
  "#1F7A6B",
  "#2563EB",
  "#7C3AED",
  "#C58A12",
  "#A03A2B",
  "#0891B2",
  "#BE185D",
  "#4338CA",
  "#15803D",
  "#B45309",
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++)
    h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(name) {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export default function UsersClient({ initialUsers, canManage }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [editUser, setEditUser] = useState(null);

  async function createUser() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setUsers([data.user, ...users]);
    setForm(EMPTY);
    setOpen(false);
  }

  async function saveEdit() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        is_active: editUser.is_active,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setUsers(users.map((u) => (u.id === data.user.id ? data.user : u)));
    setEditUser(null);
  }

  async function resetPassword() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/users/${resetFor.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    const name = resetFor.name;
    setResetFor(null);
    setNewPassword("");
    alert(
      `Password updated. Share it with ${name}; they'll be asked to change it on next sign-in.`,
    );
  }

  async function deleteUser(id, name) {
    if (!confirm(`Remove ${name}? They'll lose access immediately.`)) return;
    setError("");
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Something went wrong");
    setUsers(users.filter((u) => u.id !== id));
  }

  const field =
    "w-full rounded-lg border border-[#E4E1DA] bg-white px-3.5 py-2.5 text-sm text-[#14201F] " +
    "outline-none transition-all duration-200 placeholder:text-[#B7BFBD] focus:border-[#1F7A6B] focus:ring-4 focus:ring-[#1F7A6B]/10";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795]";

  return (
    <div className="p-8 font-sans">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap");
        .font-serif { font-family: "Fraunces", ui-serif, Georgia, serif; font-optical-sizing: auto; }
        .font-sans { font-family: "Work Sans", ui-sans-serif, system-ui, sans-serif; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .rise-in { animation: riseIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .modal-in { animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {/* Edit dialog */}
      {editUser ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F1C1E]/40 p-4 backdrop-blur-[2px]">
          <div className="modal-in w-full max-w-sm overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-2xl">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">Edit user</h2>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Full name</label>
                  <input
                    className={field}
                    value={editUser.name}
                    onChange={(e) =>
                      setEditUser({ ...editUser, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    className={field}
                    value={editUser.email}
                    onChange={(e) =>
                      setEditUser({ ...editUser, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Role</label>
                  <select
                    className={field}
                    value={editUser.role}
                    onChange={(e) =>
                      setEditUser({ ...editUser, role: e.target.value })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-[#14201F]">
                  <input
                    type="checkbox"
                    checked={editUser.is_active}
                    onChange={(e) =>
                      setEditUser({ ...editUser, is_active: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#1F7A6B]"
                  />
                  Active — can sign in
                </label>
              </div>
              {error ? (
                <div className="mt-4 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
                  <p className="text-sm text-[#A03A2B]">{error}</p>
                </div>
              ) : null}
              <div className="mt-6 flex justify-end gap-3 border-t border-[#F0EEE6] pt-5">
                <button
                  onClick={() => {
                    setEditUser(null);
                    setError("");
                  }}
                  className="rounded-full border border-[#E4E1DA] px-4 py-2 text-sm text-[#6C7A78] transition hover:border-[#14201F] hover:text-[#14201F]"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={busy}
                  className="rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reset-password dialog */}
      {resetFor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F1C1E]/40 p-4 backdrop-blur-[2px]">
          <div className="modal-in w-full max-w-sm overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-2xl">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">
                Reset password — {resetFor.name}
              </h2>
              <p className="mt-1 text-xs text-[#8C9795]">
                They'll be signed out everywhere and asked to set a new password
                next time they log in.
              </p>
            </div>
            <div className="px-6 py-6">
              <label className={labelCls}>New temporary password</label>
              <input
                type="text"
                autoFocus
                placeholder="New temporary password"
                className={field}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-[#8C9795]">
                At least 10 characters, with upper, lower and a number.
              </p>
              {error ? (
                <div className="mt-4 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
                  <p className="text-sm text-[#A03A2B]">{error}</p>
                </div>
              ) : null}
              <div className="mt-6 flex justify-end gap-3 border-t border-[#F0EEE6] pt-5">
                <button
                  onClick={() => {
                    setResetFor(null);
                    setError("");
                  }}
                  className="rounded-full border border-[#E4E1DA] px-4 py-2 text-sm text-[#6C7A78] transition hover:border-[#14201F] hover:text-[#14201F]"
                >
                  Cancel
                </button>
                <button
                  onClick={resetPassword}
                  disabled={busy || newPassword.length < 10}
                  className="rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Updating…" : "Update password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E7E3D9] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F7A6B]/10 text-[#1F7A6B]">
              <UsersIcon size={15} />
            </span>
            <h1 className="font-serif text-[26px] font-semibold tracking-tight text-[#14201F]">
              Users
            </h1>
          </div>
          <p className="mt-1.5 text-[13px] text-[#8C9795]">
            {users.length} team member{users.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManage ? (
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] shadow-sm transition hover:bg-[#16292C] hover:shadow-md"
          >
            {open ? <X size={15} /> : <UserPlus size={15} />}
            {open ? "Cancel" : "Add user"}
          </button>
        ) : null}
      </div>

      {/* Add user panel */}
      {canManage && open ? (
        <div className="rise-in mt-6 overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
          <div className="border-b border-[#F0EEE6] px-6 py-5">
            <h2 className="font-serif text-lg font-semibold text-[#14201F]">Add a team member</h2>
          </div>
          <div className="px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Full name</label>
                <input
                  className={field}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  className={field}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Temporary password</label>
                <input
                  type="text"
                  className={field}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="mt-1.5 text-xs text-[#8C9795]">
                  At least 10 characters. Share it with them directly.
                </p>
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select
                  className={field}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error ? (
              <div className="mt-4 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
                <p className="text-sm text-[#A03A2B]">{error}</p>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end border-t border-[#F0EEE6] pt-5">
              <button
                onClick={createUser}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error && !resetFor && !editUser ? (
        <div className="mt-5 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
          <p className="text-sm text-[#A03A2B]">{error}</p>
        </div>
      ) : null}

      {/* User cards */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
        <div className="hidden border-b border-[#F0EEE6] bg-[#FBF9F4] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795] lg:grid lg:grid-cols-[2fr_1.2fr_1fr_auto]">
          <div>Member</div>
          <div>Role</div>
          <div>Status</div>
          {canManage ? <div className="text-right">Actions</div> : <div />}
        </div>

        {users.map((u) => {
          const rs = ROLE_STYLE[u.role] || ROLE_STYLE.sales_agent;
          return (
            <div
              key={u.id}
              className="grid grid-cols-1 items-center gap-3 border-b border-[#F0EEE6] px-5 py-4 transition-colors duration-150 last:border-0 hover:bg-[#FBF9F4] lg:grid-cols-[2fr_1.2fr_1fr_auto]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
                  style={{ background: avatarColor(u.name) }}
                >
                  {initials(u.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#14201F]">
                    {u.name}
                  </div>
                  <div className="truncate text-xs text-[#8C9795]">
                    {u.email}
                  </div>
                </div>
              </div>

              <div>
                <span
                  className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: rs.bg, color: rs.fg }}
                >
                  {ROLE_LABEL[u.role]}
                </span>
              </div>

              <div>
                <span
                  className={
                    "inline-flex items-center gap-1.5 text-xs font-medium " +
                    (u.is_active ? "text-[#15803D]" : "text-[#A03A2B]")
                  }
                >
                  <span
                    className={
                      "h-2 w-2 rounded-full " +
                      (u.is_active ? "bg-[#15803D]" : "bg-[#A03A2B]")
                    }
                  />
                  {u.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              {canManage ? (
                <div className="flex items-center gap-1 lg:justify-end">
                  <button
                    onClick={() => {
                      setEditUser(u);
                      setError("");
                    }}
                    title="Edit"
                    className="rounded-lg p-2 text-[#8C9795] transition hover:bg-[#F3F1EB] hover:text-[#14201F]"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setResetFor(u);
                      setNewPassword("");
                      setError("");
                    }}
                    title="Reset password"
                    className="rounded-lg p-2 text-[#8C9795] transition hover:bg-[#1F7A6B]/10 hover:text-[#1F7A6B]"
                  >
                    <KeyRound size={15} />
                  </button>
                  <button
                    onClick={() => deleteUser(u.id, u.name)}
                    title="Remove"
                    className="rounded-lg p-2 text-[#8C9795] transition hover:bg-[#A03A2B]/10 hover:text-[#A03A2B]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 