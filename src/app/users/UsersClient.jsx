"use client";

import { ROLES, ROLE_LABEL } from "@/server/authz/policy";
import { useState } from "react";

const EMPTY = { name: "", email: "", password: "", role: "sales_agent" };

export default function UsersClient({ initialUsers, canManage }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  // Dialog state — one holds the user being reset, the other being edited.
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
    alert(`Password updated. Share it with ${name}; they'll be asked to change it on next sign-in.`);
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
    "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] " +
    "outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";

  return (
    <div className="mt-6">
      {/* ── Edit dialog ─────────────────────────────── */}
      {editUser ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#E4E1DA] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#14201F]">Edit user</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#14201F]">Full name</label>
                <input
                  className={field}
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#14201F]">Email</label>
                <input
                  type="email"
                  className={field}
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#14201F]">Role</label>
                <select
                  className={field}
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#14201F]">
                <input
                  type="checkbox"
                  checked={editUser.is_active}
                  onChange={(e) => setEditUser({ ...editUser, is_active: e.target.checked })}
                  className="h-4 w-4 accent-[#1F7A6B]"
                />
                Active — can sign in
              </label>
            </div>
            {error ? (
              <p className="mt-3 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setEditUser(null); setError(""); }}
                className="text-sm text-[#6C7A78] hover:text-[#14201F]"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={busy}
                className="rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Reset-password dialog ───────────────────── */}
      {resetFor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#E4E1DA] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#14201F]">
              Reset password — {resetFor.name}
            </h2>
            <p className="mt-1 text-xs text-[#6C7A78]">
              They'll be signed out everywhere and asked to set a new password next time they log in.
            </p>
            <input
              type="text"
              autoFocus
              placeholder="New temporary password"
              className={`${field} mt-4`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-[#6C7A78]">
              At least 10 characters, with upper, lower and a number.
            </p>
            {error ? (
              <p className="mt-3 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setResetFor(null); setError(""); }}
                className="text-sm text-[#6C7A78] hover:text-[#14201F]"
              >
                Cancel
              </button>
              <button
                onClick={resetPassword}
                disabled={busy || newPassword.length < 10}
                className="rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
              >
                {busy ? "Updating…" : "Update password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Add user ────────────────────────────────── */}
      {canManage ? (
        <div className="flex justify-end">
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md bg-[#0F1C1E] px-3 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C]"
          >
            {open ? "Cancel" : "Add user"}
          </button>
        </div>
      ) : null}

      {canManage && open ? (
        <div className="mt-4 rounded-lg border border-[#E4E1DA] bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#14201F]">Full name</label>
              <input className={field} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#14201F]">Email</label>
              <input type="email" className={field} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#14201F]">Temporary password</label>
              <input type="text" className={field} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="mt-1 text-xs text-[#6C7A78]">At least 10 characters. Share it with them directly.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#14201F]">Role</label>
              <select className={field} value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABEL[r]}</option>))}
              </select>
            </div>
          </div>
          <button
            onClick={createUser}
            disabled={busy}
            className="mt-5 rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      ) : null}

      {error && !resetFor && !editUser ? (
        <p className="mt-4 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p>
      ) : null}

      {/* ── Table ───────────────────────────────────── */}
      <div className="mt-6 overflow-hidden rounded-lg border border-[#E4E1DA] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4E1DA] text-left text-xs text-[#6C7A78]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage ? <th className="px-4 py-3 font-medium"></th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#F0EEE9] last:border-0">
                <td className="px-4 py-3 text-[#14201F]">{u.name}</td>
                <td className="px-4 py-3 text-[#6C7A78]">{u.email}</td>
                <td className="px-4 py-3 text-[#14201F]">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? "text-[#1F7A6B]" : "text-[#A03A2B]"}>
                    {u.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => { setEditUser(u); setError(""); }}
                        className="text-xs text-[#6C7A78] transition hover:text-[#14201F]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setResetFor(u); setNewPassword(""); setError(""); }}
                        className="text-xs text-[#6C7A78] transition hover:text-[#1F7A6B]"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => deleteUser(u.id, u.name)}
                        className="text-xs text-[#6C7A78] transition hover:text-[#A03A2B]"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}