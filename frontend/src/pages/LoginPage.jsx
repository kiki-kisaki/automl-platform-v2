import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { RiMailLine, RiLockLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";

const ROLE_HOME = {
    admin: "/admin",
    data_engineer: "/engineer/upload",
    data_scientist: "/scientist/datasets",
    ml_engineer: "/ml/experiments",
    viewer: "/viewer/results",
};

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

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await login(email, password);
            const data = res.data.data;
            loginUser({ user_id: data.user_id, username: data.username, role: data.role }, data.access_token);
            navigate(ROLE_HOME[data.role] || "/");
        } catch (err) {
            setError(err.response?.data?.message || "Login gagal, coba lagi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
            <div style={{ width: "100%", maxWidth: "420px", padding: "0 24px" }}>

                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "36px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--accent)" }} />
                        <span style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)" }}>AutoML Platform</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Masuk ke akun Anda</p>
                </div>

                {/* Card */}
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px" }}>
                    {error && (
                        <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "20px", fontSize: "13px" }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "500" }}>Email</label>
                            <div style={{ position: "relative" }}>
                                <RiMailLine size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                <input
                                    type="email" value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@email.com" required
                                    style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: "var(--radius)" }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "500" }}>Password</label>
                            <div style={{ position: "relative" }}>
                                <RiLockLine size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                <input
                                    type={showPass ? "text" : "password"} value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••" required
                                    style={{ width: "100%", padding: "10px 36px 10px 36px", borderRadius: "var(--radius)" }}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", padding: 0, display: "flex" }}>
                                    {showPass ? <RiEyeOffLine size={15} /> : <RiEyeLine size={15} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            style={{ width: "100%", padding: "11px", background: loading ? "var(--bg-elevated)" : "var(--accent)", color: loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "500", transition: "background 0.15s" }}>
                            {loading ? "Memproses..." : "Masuk"}
                        </button>
                    </form>
                </div>

                {/* Role info */}
                <div style={{ marginTop: "20px", background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Role yang tersedia</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {Object.entries(ROLE_LABELS).map(([role, label]) => (
                            <span key={role} style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", background: `${ROLE_COLORS[role]}20`, color: ROLE_COLORS[role], border: `0.5px solid ${ROLE_COLORS[role]}` }}>
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}