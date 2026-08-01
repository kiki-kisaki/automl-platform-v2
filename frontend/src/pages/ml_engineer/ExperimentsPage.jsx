import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getExperiments } from "../../api/experimentsApi";
import { getPreprocessings } from "../../api/preprocessingApi";
import { getDatasetById } from "../../api/datasetsApi";
import {
    RiFlaskLine, RiAddLine, RiCheckboxCircleLine,
    RiErrorWarningLine, RiTimeLine, RiPulseLine,
    RiArrowRightLine, RiRefreshLine,
} from "react-icons/ri";

const STATUS_CONFIG = {
    queued: { color: "var(--text-muted)", bg: "var(--bg-elevated)", icon: RiTimeLine, label: "Menunggu" },
    running: { color: "var(--info)", bg: "var(--info-dim)", icon: RiPulseLine, label: "Berjalan" },
    completed: { color: "var(--success)", bg: "var(--success-dim)", icon: RiCheckboxCircleLine, label: "Selesai" },
    failed: { color: "var(--danger)", bg: "var(--danger-dim)", icon: RiErrorWarningLine, label: "Gagal" },
};

const ALG_LABELS = {
    decision_tree: "Decision Tree",
    random_forest: "Random Forest",
    svm: "Support Vector Machine",
    knn: "K-Nearest Neighbors",
    logistic_regression: "Logistic Regression",
    linear_regression: "Linear Regression",
    svr: "Support Vector Regression",
    naive_bayes: "Naive Bayes",
};

const TYPE_COLORS = {
    tabular: "var(--role-data_engineer)",
    image: "var(--role-data_scientist)",
    text: "var(--role-ml_engineer)",
};

export default function ExperimentsPage() {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const fetchExperiments = () => {
        setLoading(true);
        getExperiments()
            .then((res) => setExperiments(res.data.data))
            .catch(() => setError("Gagal memuat eksperimen"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchExperiments(); }, []);

    const filtered = experiments.filter((e) => {
        const matchStatus = filter === "all" || e.status === filter;
        const matchSearch = search === "" ||
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.algorithm?.toLowerCase().includes(search.toLowerCase()) ||
            e.data_type?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const stats = {
        total: experiments.length,
        completed: experiments.filter((e) => e.status === "completed").length,
        running: experiments.filter((e) => e.status === "running").length,
        failed: experiments.filter((e) => e.status === "failed").length,
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Eksperimen</h1>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Kelola dan jalankan training model</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={fetchExperiments}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                        <RiRefreshLine size={15} /> Refresh
                    </button>
                    <button onClick={() => navigate("/ml/training/new")}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                        <RiAddLine size={15} /> Training Baru
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                    { label: "Total", value: stats.total, color: "var(--text-primary)" },
                    { label: "Selesai", value: stats.completed, color: "var(--success)" },
                    { label: "Berjalan", value: stats.running, color: "var(--info)" },
                    { label: "Gagal", value: stats.failed, color: "var(--danger)" },
                ].map((s, i) => (
                    <div key={i} style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{s.label}</p>
                        <p style={{ fontSize: "24px", fontWeight: "600", color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: "12px" }}>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Cari eksperimen, algoritma, atau tipe data..."
                    style={{ width: "100%", padding: "9px 14px", borderRadius: "var(--radius)", fontSize: "13px" }}
                />
            </div>

            {/* Filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {[
                    { value: "all", label: "Semua" },
                    { value: "queued", label: "Menunggu" },
                    { value: "running", label: "Berjalan" },
                    { value: "completed", label: "Selesai" },
                    { value: "failed", label: "Gagal" },
                ].map((f) => (
                    <button key={f.value} onClick={() => setFilter(f.value)}
                        style={{ padding: "6px 14px", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", border: `0.5px solid ${filter === f.value ? "var(--accent)" : "var(--border-strong)"}`, background: filter === f.value ? "var(--accent-dim)" : "var(--bg-elevated)", color: filter === f.value ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer" }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {error && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "12px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "13px" }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Memuat...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "48px", textAlign: "center" }}>
                    <RiFlaskLine size={32} style={{ color: "var(--text-muted)", marginBottom: "10px" }} />
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>Belum ada eksperimen</p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>Mulai training model dengan klik tombol Training Baru</p>
                    <button onClick={() => navigate("/ml/training/new")}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                        <RiAddLine size={15} /> Training Baru
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {filtered.map((exp) => {
                        const s = STATUS_CONFIG[exp.status] || STATUS_CONFIG.queued;
                        const StatusIcon = s.icon;
                        const typeColor = TYPE_COLORS[exp.data_type] || "var(--accent)";

                        return (
                            <div key={exp.experiment_id}
                                style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{ width: "38px", height: "38px", borderRadius: "var(--radius)", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <StatusIcon size={18} style={{ color: s.color }} />
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{exp.name}</p>
                                        <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: "500", background: `${typeColor}20`, color: typeColor, border: `0.5px solid ${typeColor}` }}>
                                            {exp.data_type}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                        ID #{exp.experiment_id} · {ALG_LABELS[exp.algorithm] || exp.algorithm} · {exp.task_type}
                                    </p>
                                    {exp.status === "running" && (
                                        <div style={{ marginTop: "8px" }}>
                                            <div style={{ background: "var(--bg-elevated)", borderRadius: "999px", height: "4px", overflow: "hidden" }}>
                                                <div style={{ width: `${exp.progress || 0}%`, height: "100%", background: "var(--info)", borderRadius: "999px", transition: "width 0.5s ease" }} />
                                            </div>
                                        </div>
                                    )}
                                    {exp.status === "completed" && exp.metrics && (
                                        <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                                            {exp.metrics.accuracy !== undefined && <span style={{ fontSize: "11px", color: "var(--success)" }}>Accuracy: {(exp.metrics.accuracy * 100).toFixed(1)}%</span>}
                                            {exp.metrics.r2_score !== undefined && <span style={{ fontSize: "11px", color: "var(--success)" }}>R²: {(exp.metrics.r2_score * 100).toFixed(1)}%</span>}
                                            {exp.metrics.f1_score !== undefined && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>F1: {(exp.metrics.f1_score * 100).toFixed(1)}%</span>}
                                        </div>
                                    )}
                                    {exp.status === "failed" && exp.error_message && (
                                        <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>⚠ {exp.error_message}</p>
                                    )}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                    <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", background: s.bg, color: s.color, border: `0.5px solid ${s.color}` }}>
                                        {s.label}
                                    </span>
                                    {exp.status === "running" && (
                                        <button onClick={fetchExperiments}
                                            style={{ padding: "7px 12px", background: "var(--info-dim)", color: "var(--info)", border: "0.5px solid var(--info)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}>
                                            Refresh Status
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}