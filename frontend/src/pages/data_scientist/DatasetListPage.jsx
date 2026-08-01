import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDatasets, toggleDatasetStatus, deleteDatasetApi } from "../../api/datasetsApi";
import {
    RiFileLine, RiImageLine, RiFileTextLine,
    RiArrowRightLine, RiRefreshLine, RiDatabase2Line,
    RiDeleteBinLine, RiErrorWarningLine,
} from "react-icons/ri";

const TYPE_CONFIG = {
    tabular: { icon: RiFileLine, color: "var(--role-data_engineer)", label: "Tabular" },
    image: { icon: RiImageLine, color: "var(--role-data_scientist)", label: "Gambar" },
    text: { icon: RiFileTextLine, color: "var(--role-ml_engineer)", label: "Teks" },
};

const STATUS_CONFIG = {
    uploaded: { color: "var(--warning)", bg: "var(--warning-dim)", label: "Belum Diproses" },
    preprocessed: { color: "var(--success)", bg: "var(--success-dim)", label: "Sudah Diproses" },
};

// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteModal({ dataset, onConfirm, onCancel }) {
    const type = TYPE_CONFIG[dataset.data_type] || TYPE_CONFIG.tabular;
    const Icon = type.icon;

    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 300,
            backdropFilter: "blur(4px)",
        }}>
            <div style={{
                background: "var(--bg-surface)",
                border: "0.5px solid var(--danger)",
                borderRadius: "var(--radius-lg)",
                padding: "28px",
                width: "420px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}>
                {/* Icon warning */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--danger-dim)", border: "0.5px solid var(--danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <RiErrorWarningLine size={28} style={{ color: "var(--danger)" }} />
                    </div>
                </div>

                {/* Title */}
                <h2 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", textAlign: "center", marginBottom: "8px" }}>
                    Hapus Dataset?
                </h2>

                {/* Dataset info */}
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", background: `${type.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={16} style={{ color: type.color }} />
                    </div>
                    <div>
                        <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)", marginBottom: "2px" }}>{dataset.name}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{type.label} · {dataset.original_filename}</p>
                    </div>
                </div>

                {/* Warning text */}
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: "24px" }}>
                    <p style={{ fontSize: "12px", color: "var(--danger)", marginBottom: "6px", fontWeight: "500" }}>⚠ Tindakan ini tidak dapat dibatalkan</p>
                    <p style={{ fontSize: "12px", color: "var(--danger)", opacity: 0.8 }}>
                        File dataset asli akan dihapus permanen dari server. Hasil preprocessing yang sudah ada tidak ikut dihapus.
                    </p>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={onCancel}
                        style={{ flex: 1, padding: "11px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                        Batal
                    </button>
                    <button onClick={onConfirm}
                        style={{ flex: 1, padding: "11px", background: "var(--danger)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                        Ya, Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Dataset Card ───────────────────────────────────────────────────────────────
function DatasetCard({ dataset, onProcess, onToggleStatus, onDelete }) {
    const type = TYPE_CONFIG[dataset.data_type] || TYPE_CONFIG.tabular;
    const status = STATUS_CONFIG[dataset.status] || STATUS_CONFIG.uploaded;
    const Icon = type.icon;

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "var(--radius)", background: `${type.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} style={{ color: type.color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{dataset.name}</p>
                        <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: "500", background: `${type.color}20`, color: type.color, border: `0.5px solid ${type.color}`, flexShrink: 0 }}>
                            {type.label}
                        </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                        {dataset.original_filename} · ID #{dataset.dataset_id}
                    </p>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        {dataset.meta?.rows && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>📊 {dataset.meta.rows.toLocaleString("id-ID")} baris</span>}
                        {dataset.meta?.columns && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>🔢 {dataset.meta.columns.length} kolom</span>}
                        {dataset.meta?.classes && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>🏷 {dataset.meta.classes.length} kelas: {dataset.meta.classes.join(", ")}</span>}
                        {dataset.meta?.total_images && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>🖼 {dataset.meta.total_images} gambar</span>}
                        {dataset.meta?.total_documents && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>📄 {dataset.meta.total_documents} dokumen</span>}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", background: status.bg, color: status.color, border: `0.5px solid ${status.color}` }}>
                        {status.label}
                    </span>

                    {dataset.status === "uploaded" && (
                        <button onClick={() => onProcess(dataset)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", cursor: "pointer" }}>
                            Proses <RiArrowRightLine size={13} />
                        </button>
                    )}

                    <button onClick={() => onToggleStatus(dataset)}
                        title={dataset.status === "uploaded" ? "Tandai sebagai sudah diproses" : "Tandai sebagai belum diproses"}
                        style={{ padding: "7px 12px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}>
                        {dataset.status === "uploaded" ? "✓ Tandai Selesai" : "↩ Tandai Belum"}
                    </button>

                    <button onClick={() => onDelete(dataset)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "var(--danger-dim)", color: "var(--danger)", border: "0.5px solid var(--danger)", borderRadius: "var(--radius)", cursor: "pointer", flexShrink: 0 }}>
                        <RiDeleteBinLine size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DatasetListPage() {
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [error, setError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const navigate = useNavigate();

    const fetchDatasets = () => {
        setLoading(true);
        const status = statusFilter === "all" ? undefined : statusFilter;
        getDatasets(status)
            .then((res) => setDatasets(res.data.data))
            .catch(() => setError("Gagal memuat dataset"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchDatasets(); }, [statusFilter]);

    const filtered = typeFilter === "all"
        ? datasets
        : datasets.filter((d) => d.data_type === typeFilter);

    const handleProcess = (dataset) => navigate(`/scientist/preprocess/${dataset.dataset_id}`);

    const handleToggleStatus = async (dataset) => {
        try {
            await toggleDatasetStatus(dataset.dataset_id);
            fetchDatasets();
        } catch {
            setError("Gagal mengubah status dataset");
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDatasetApi(deleteTarget.dataset_id);
            setDeleteTarget(null);
            fetchDatasets();
        } catch {
            setError("Gagal menghapus dataset");
            setDeleteTarget(null);
        }
    };

    const stats = {
        total: datasets.length,
        uploaded: datasets.filter((d) => d.status === "uploaded").length,
        preprocessed: datasets.filter((d) => d.status === "preprocessed").length,
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Dataset</h1>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Kelola dan preprocessing dataset yang sudah diupload</p>
                </div>
                <button onClick={fetchDatasets}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                    <RiRefreshLine size={15} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                    { label: "Total Dataset", value: stats.total, color: "var(--text-primary)" },
                    { label: "Belum Diproses", value: stats.uploaded, color: "var(--warning)" },
                    { label: "Sudah Diproses", value: stats.preprocessed, color: "var(--success)" },
                ].map((s, i) => (
                    <div key={i} style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{s.label}</p>
                        <p style={{ fontSize: "24px", fontWeight: "600", color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter baris 1 — Status */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>Status:</span>
                {[
                    { value: "all", label: "Semua" },
                    { value: "uploaded", label: "Belum Diproses" },
                    { value: "preprocessed", label: "Sudah Diproses" },
                ].map((f) => (
                    <button key={f.value} onClick={() => setStatusFilter(f.value)}
                        style={{ padding: "5px 12px", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", border: `0.5px solid ${statusFilter === f.value ? "var(--accent)" : "var(--border-strong)"}`, background: statusFilter === f.value ? "var(--accent-dim)" : "var(--bg-elevated)", color: statusFilter === f.value ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s" }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Filter baris 2 — Tipe data */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center", marginRight: "4px" }}>Tipe:</span>
                {[
                    { value: "all", label: "Semua", color: "var(--text-secondary)" },
                    { value: "tabular", label: "Tabular", color: "var(--role-data_engineer)" },
                    { value: "image", label: "Gambar", color: "var(--role-data_scientist)" },
                    { value: "text", label: "Teks", color: "var(--role-ml_engineer)" },
                ].map((f) => (
                    <button key={f.value} onClick={() => setTypeFilter(f.value)}
                        style={{ padding: "5px 12px", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", border: `0.5px solid ${typeFilter === f.value ? f.color : "var(--border-strong)"}`, background: typeFilter === f.value ? `${f.color}20` : "var(--bg-elevated)", color: typeFilter === f.value ? f.color : "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s" }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {error && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "13px" }}>
                    {error}
                </div>
            )}

            {/* Info hasil filter */}
            {(statusFilter !== "all" || typeFilter !== "all") && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                    Menampilkan {filtered.length} dari {datasets.length} dataset
                </p>
            )}

            {loading ? (
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Memuat dataset...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "48px", textAlign: "center" }}>
                    <RiDatabase2Line size={32} style={{ color: "var(--text-muted)", marginBottom: "10px" }} />
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>Tidak ada dataset</p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {datasets.length > 0 ? "Coba ubah filter di atas" : "Minta Data Engineer untuk mengupload dataset"}
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {filtered.map((d) => (
                        <DatasetCard
                            key={d.dataset_id}
                            dataset={d}
                            onProcess={handleProcess}
                            onToggleStatus={handleToggleStatus}
                            onDelete={(dataset) => setDeleteTarget(dataset)}
                        />
                    ))}
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <DeleteModal
                    dataset={deleteTarget}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}