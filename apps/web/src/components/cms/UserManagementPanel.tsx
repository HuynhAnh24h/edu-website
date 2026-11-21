"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Code2,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import { CORE_API_URL } from "@/lib/api";

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tier: string;
  current_grade?: number;
  school_name?: string;
  is_active: boolean;
  auth_provider: string;
  totp_enabled: boolean;
  coding_passed_count?: number;
  created_at?: string;
}

interface OAuthState {
  google_configured: boolean;
  facebook_configured: boolean;
  google_callback: string;
  facebook_callback: string;
}

interface Props {
  accessToken: string | null;
  currentUserId: string;
  onNotify: (type: "ok" | "err", msg: string) => void;
}

export function UserManagementPanel({ accessToken, currentUserId, onNotify }: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [oauth, setOauth] = useState<OAuthState | null>(null);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState("student");
  const [newGrade, setNewGrade] = useState(12);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    const [uRes, oRes] = await Promise.all([
      fetch(`${CORE_API_URL}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${CORE_API_URL}/api/v1/auth/oauth/providers`),
    ]);
    if (uRes.ok) {
      const d = await uRes.json();
      setUsers(d.users || []);
    }
    if (oRes.ok) {
      setOauth(await oRes.json());
    }
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        full_name: newName,
        email: newEmail,
        password: newPass,
        role: newRole,
        current_grade: newRole === "student" ? newGrade : undefined,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      onNotify("err", d.error || "Không thể tạo tài khoản");
      return;
    }
    setNewName("");
    setNewEmail("");
    setNewPass("");
    setShowCreate(false);
    onNotify("ok", "Đã tạo tài khoản người dùng mới thành công!");
    void loadData();
  };

  const handleRoleChange = async (userId: string, role: string) => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      onNotify("ok", "Đã cập nhật phân quyền người dùng!");
      void loadData();
    }
  };

  const handleToggleLock = async (u: AdminUserRow) => {
    if (!accessToken) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/admin/users/${encodeURIComponent(u.id)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    const d = await res.json();
    if (!res.ok) {
      onNotify("err", d.error || "Không thể thay đổi trạng thái tài khoản");
      return;
    }
    onNotify("ok", !u.is_active ? `Đã mở khóa tài khoản ${u.email}` : `Đã tạm khóa tài khoản ${u.email}`);
    void loadData();
  };

  const handleReset2fa = async (u: AdminUserRow) => {
    if (!accessToken) return;
    const res = await fetch(
      `${CORE_API_URL}/api/v1/admin/users/${encodeURIComponent(u.id)}/reset-2fa`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok) {
      onNotify("ok", `Đã đặt lại (tắt) 2FA cho tài khoản ${u.email}!`);
      void loadData();
    }
  };

  const handleDeleteUser = async (u: AdminUserRow) => {
    if (!accessToken) return;
    if (!window.confirm(`Xác nhận xóa vĩnh viễn tài khoản ${u.email}?`)) return;
    const res = await fetch(`${CORE_API_URL}/api/v1/admin/users/${encodeURIComponent(u.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const d = await res.json();
    if (!res.ok) {
      onNotify("err", d.error || "Không thể xóa tài khoản");
      return;
    }
    onNotify("ok", `Đã xóa tài khoản ${u.email}.`);
    void loadData();
  };

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const twoFaCount = users.filter((u) => u.totp_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header + Search + Create Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Users className="h-5 w-5 text-indigo-600" />
            Quản lý Người dùng, Phân quyền &amp; Bảo mật 2FA ({users.length})
          </h2>
          <p className="text-xs text-slate-500">
            {twoFaCount}/{users.length} tài khoản đã bật 2FA • Hỗ trợ quản lý đăng nhập Email, Google &amp; Facebook OAuth.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, email, vai trò..."
              className="rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-8 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500"
          >
            <UserPlus className="h-3.5 w-3.5" /> Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Form thêm người dùng mới */}
      {showCreate && (
        <form
          onSubmit={handleCreateUser}
          className="grid gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 sm:grid-cols-6"
        >
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Họ và tên *"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
          />
          <input
            required
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email *"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
          />
          <input
            required
            type="password"
            minLength={6}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Mật khẩu (>= 6 ký tự) *"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold sm:col-span-2"
          >
            <option value="student">Học sinh / Thành viên</option>
            <option value="teacher">Giáo viên</option>
            <option value="content_admin">Biên tập viên</option>
            <option value="super_admin">Super Admin</option>
          </select>
          {newRole === "student" && (
            <select
              value={newGrade}
              onChange={(e) => setNewGrade(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold sm:col-span-2"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  Lớp {g}
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              Tạo ngay
            </button>
          </div>
        </form>
      )}

      {/* Bảng Danh sách Người dùng */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Nguồn đăng nhập</th>
                <th className="px-4 py-3">Bảo mật 2FA</th>
                <th className="px-4 py-3">Lập trình</th>
                <th className="px-4 py-3">Phân quyền</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className={!u.is_active ? "bg-rose-50/40" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {u.full_name}{" "}
                        {!u.is_active && (
                          <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            ĐÃ KHÓA
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${
                          u.auth_provider === "google"
                            ? "bg-blue-100 text-blue-700"
                            : u.auth_provider === "facebook"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.auth_provider || "email"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.totp_enabled ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <Smartphone className="h-3 w-3" /> Đã bật 2FA
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleReset2fa(u)}
                            className="text-[10px] font-bold text-rose-600 hover:underline"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Chưa bật</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
                        <Code2 className="h-3.5 w-3.5" /> {u.coding_passed_count || 0} bài
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => void handleRoleChange(u.id, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="student">Học sinh</option>
                        <option value="teacher">Giáo viên</option>
                        <option value="content_admin">Biên tập viên</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleToggleLock(u)}
                            title={u.is_active ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                              u.is_active
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {u.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(u)}
                            title="Xóa tài khoản"
                            className="rounded-lg border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Khối Cấu hình Kết nối Google & Facebook OAuth 2.0 */}
      {oauth && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              Trạng thái Đăng nhập Google &amp; Facebook OAuth 2.0
            </h3>
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  oauth.google_configured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {oauth.google_configured ? <CheckCircle2 className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                Google: {oauth.google_configured ? "Đang hoạt động" : "Chưa gắn Secret"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  oauth.facebook_configured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {oauth.facebook_configured ? <CheckCircle2 className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                Facebook: {oauth.facebook_configured ? "Đang hoạt động" : "Chưa gắn Secret"}
              </span>
            </div>
          </div>

          <div className="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="font-bold text-slate-800">Google Authorized Redirect URI:</p>
              <code className="mt-1 block break-all font-mono text-indigo-700">{oauth.google_callback}</code>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="font-bold text-slate-800">Facebook Valid OAuth Redirect URI:</p>
              <code className="mt-1 block break-all font-mono text-indigo-700">{oauth.facebook_callback}</code>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Sau khi tạo ứng dụng trên Google Cloud Console / Meta for Developers, gắn 4 bí mật{" "}
            <code className="rounded bg-slate-200 px-1 font-mono">GOOGLE_CLIENT_ID</code>,{" "}
            <code className="rounded bg-slate-200 px-1 font-mono">GOOGLE_CLIENT_SECRET</code>,{" "}
            <code className="rounded bg-slate-200 px-1 font-mono">FACEBOOK_APP_ID</code>,{" "}
            <code className="rounded bg-slate-200 px-1 font-mono">FACEBOOK_APP_SECRET</code> vào Cloudflare Worker là nút đăng nhập Google &amp; Facebook chạy ngay lập tức!
          </p>
        </div>
      )}
    </div>
  );
}
