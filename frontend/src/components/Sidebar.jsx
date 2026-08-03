import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RiLogoutBoxLine } from "react-icons/ri";

const ROLE_CONFIG = {
    admin: {
        label: "Administrator",
        color: "var(--role-admin)",
        navItems: [
            { to: "/admin", label: "Kelola User", icon: "👥" },
        ],
    },
    data_engineer: {
        label: "Data Engineer",
        color: "var(--role-data_engineer)",
        navItems: [
            { to: "/engineer/upload", label: "Upload Dataset", icon: "📤" },
        ],
    },
    data_scientist: {
        label: "Data Scientist",
        color: "var(--role-data_scientist)",
        navItems: [
            { to: "/scientist/datasets", label: "Dataset", icon: "📂" },
            { to: "/scientist/analysis", label: "Analisis LLM", icon: "🧠" },
        ],
    },
    ml_engineer: {
        label: "ML Engineer",
        color: "var(--role-ml_engineer)",
        navItems: [
            { to: "/ml/experiments", label: "Eksperimen", icon: "🧪" },
            { to: "/ml/training/new", label: "Training Baru", icon: "🚀" },
        ],
    },
    viewer: {
        label: "Viewer",
        color: "var(--role-viewer)",
        navItems: [
            { to: "/viewer/results", label: "Hasil Training", icon: "📊" },
            { to: "/viewer/analysis", label: "History Analisis", icon: "🧠" },
        ],
    },
};

export default function Sidebar() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const roleConfig = ROLE_CONFIG[user.role] || {};
    const roleColor = roleConfig.color || "var(--accent)";

    const handleLogout = () => {
        logoutUser();
        navigate("/login");
    };

    return (
        <aside style={{
            width: "220px", minHeight: "100vh",
            background: "var(--bg-surface)",
            borderRight: "0.5px solid var(--border)",
            display: "flex", flexDirection: "column",
            position: "fixed", top: 0, left: 0, bottom: 0,
            zIndex: 100,
        }}>
            {/* Logo */}
            <div style={{ padding: "20px", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>AutoML v2</span>
                </div>

                {/* Role badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "999px", background: `${roleColor}20`, border: `0.5px solid ${roleColor}` }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: roleColor }} />
                    <span style={{ fontSize: "11px", fontWeight: "500", color: roleColor }}>{roleConfig.label}</span>
                </div>
            </div>

            {/* User info */}
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--border)" }}>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)", marginBottom: "2px" }}>{user.username}</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email || ""}</p>
            </div>

            {/* Nav */}
            <nav style={{ padding: "8px 0", flex: 1 }}>
                {roleConfig.navItems?.map(({ to, label, icon }) => (
                    <NavLink key={to} to={to} end
                        style={({ isActive }) => ({
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "10px 20px", fontSize: "13px",
                            color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                            background: isActive ? "var(--bg-elevated)" : "transparent",
                            borderRight: isActive ? `2px solid ${roleColor}` : "2px solid transparent",
                            textDecoration: "none", transition: "all 0.15s",
                        })}
                    >
                        <span style={{ fontSize: "16px" }}>{icon}</span>
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <button onClick={handleLogout}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 20px", fontSize: "13px", color: "var(--danger)", background: "none", border: "none", borderTop: "0.5px solid var(--border)", width: "100%", cursor: "pointer" }}>
                <RiLogoutBoxLine size={16} />
                Logout
            </button>
        </aside>
    );
}