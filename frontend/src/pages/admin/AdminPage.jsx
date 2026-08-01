import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../../api/adminApi";
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiUserLine } from "react-icons/ri";

const ROLES = ["admin", "data_engineer", "data_scientist", "ml_engineer", "viewer"];

const ROLE_LABELS = {
    admin: "Administrator",
    data_engineer: "Data Engineer",
    data_scientist: "Data Scientist",
    ml_engineer: "ML Engineer",
    viewer: "Viewer",
};

const ROLE_COLORS = {
    admin: "var(--role-admin)",
    data_engineer: "var(--role-data_engineer)",
    data_scientist: "var(--role-data_scientist)",
    ml_engineer: "var(--role-ml_engineer)",
    viewer: "var(--role-viewer)",
};

function UserModal({ user, onClose, onSave }) {
    const [form, setForm] = useState({
        username: user?.username || "",
        email: user?.email || "",
        password: "",
        role: user?.role || "viewer",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (user) {
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                await updateUser(user.user_id, payload);
            } else {
                await createUser(form);
            }
            onSave();
        } catch (err) {
            setError(err.response?.data?.message || "Gagal menyimpan user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
            <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px", width: "400px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", color: "var(--text-primary)" }}>
                    {user ? "Edit User" : "Buat User Baru"}
                </h2>

                {error && (
                    <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "10px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "13px" }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {[
                        { label: "Username", key: "username", type: "text", placeholder: "username" },
                        { label: "Email", key: "email", type: "email", placeholder: "email@example.com" },
                        { label: user ? "Password Baru (kosongkan jika tidak diubah)" : "Password", key: "password", type: "password", placeholder: "••••••••" },
                    ].map(({ label, key, type, placeholder }) => (
                        <div key={key} style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "500" }}>{label}</label>
                            <input type={type} value={form[key]} placeholder={placeholder}
                                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                                required={key !== "password" || !user}
                                style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius)" }}
                            />
                        </div>
                    ))}

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "500" }}>Role</label>
                        <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius)" }}>
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                        <button type="button" onClick={onClose}
                            style={{ flex: 1, padding: "10px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px" }}>
                            Batal
                        </button>
                        <button type="submit" disabled={loading}
                            style={{ flex: 1, padding: "10px", background: loading ? "var(--bg-elevated)" : "var(--accent)", color: loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500" }}>
                            {loading ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | "create" | user_object
    const [error, setError] = useState("");

    const fetchUsers = () => {
        setLoading(true);
        getUsers()
            .then((res) => setUsers(res.data.data))
            .catch(() => setError("Gagal memuat daftar user"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleDelete = async (userId) => {
        if (!confirm("Yakin ingin menghapus user ini?")) return;
        try {
            await deleteUser(userId);
            fetchUsers();
        } catch {
            setError("Gagal menghapus user");
        }
    };

    const handleSave = () => {
        setModal(null);
        fetchUsers();
    };

    const stats = {
        total: users.length,
        active: users.filter((u) => u.is_active).length,
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Kelola User</h1>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Buat dan kelola akun pengguna platform</p>
                </div>
                <button onClick={() => setModal("create")}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500" }}>
                    <RiAddLine size={16} /> Buat User
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                {[
                    { label: "Total User", value: stats.total, color: "var(--text-primary)" },
                    { label: "Aktif", value: stats.active, color: "var(--success)" },
                    ...ROLES.filter(r => r !== "admin").map((r) => ({
                        label: ROLE_LABELS[r],
                        value: users.filter((u) => u.role === r).length,
                        color: ROLE_COLORS[r],
                    })),
                ].slice(0, 4).map((s, i) => (
                    <div key={i} style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{s.label}</p>
                        <p style={{ fontSize: "24px", fontWeight: "600", color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {error && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "12px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "13px" }}>
                    {error}
                </div>
            )}

            {/* Tabel user */}
            <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <RiUserLine size={15} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Daftar User ({users.length})
                    </p>
                </div>

                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Memuat...</p>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr>
                                {["ID", "Username", "Email", "Role", "Status", "Aksi"].map((h) => (
                                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500", background: "var(--bg-elevated)", borderBottom: "0.5px solid var(--border)", fontSize: "12px" }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.user_id} style={{ borderBottom: "0.5px solid var(--border)" }}>
                                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>#{u.user_id}</td>
                                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "var(--text-primary)" }}>{u.username}</td>
                                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{u.email}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", background: `${ROLE_COLORS[u.role]}20`, color: ROLE_COLORS[u.role], border: `0.5px solid ${ROLE_COLORS[u.role]}` }}>
                                            {ROLE_LABELS[u.role] || u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", background: u.is_active ? "var(--success-dim)" : "var(--danger-dim)", color: u.is_active ? "var(--success)" : "var(--danger)" }}>
                                            {u.is_active ? "Aktif" : "Nonaktif"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button onClick={() => setModal(u)}
                                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "12px", cursor: "pointer" }}>
                                                <RiEditLine size={13} /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(u.user_id)}
                                                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", background: "var(--danger-dim)", color: "var(--danger)", border: "0.5px solid var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "12px", cursor: "pointer" }}>
                                                <RiDeleteBinLine size={13} /> Hapus
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modal && (
                <UserModal
                    user={modal === "create" ? null : modal}
                    onClose={() => setModal(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}