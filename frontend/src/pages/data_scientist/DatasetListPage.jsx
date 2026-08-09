import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDatasets, toggleDatasetStatus, deleteDatasetApi } from "../../api/datasetsApi";
import {
    RiFileLine, RiImageLine, RiFileTextLine,
    RiArrowRightLine, RiRefreshLine, RiDatabase2Line,
    RiDeleteBinLine, RiErrorWarningLine, RiCloseLine,
    RiDownload2Line,
} from "react-icons/ri";
import api from "../../api/axiosConfig";
import { getConsent, downloadConsentPdf } from "../../api/consentApi";

const TYPE_CONFIG = {
    tabular: { icon: RiFileLine, color: "var(--role-data_engineer)", label: "Tabular" },
    image: { icon: RiImageLine, color: "var(--role-data_scientist)", label: "Gambar" },
    text: { icon: RiFileTextLine, color: "var(--role-ml_engineer)", label: "Teks" },
};

const STATUS_CONFIG = {
    uploaded: { color: "var(--warning)", bg: "var(--warning-dim)", label: "Belum Diproses" },
    preprocessed: { color: "var(--success)", bg: "var(--success-dim)", label: "Sudah Diproses" },
    locked: { color: "var(--danger)", bg: "var(--danger-dim)", label: "Terkunci" },
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
function DatasetCard({ dataset, onProcess, onToggleStatus, onDelete, isSelected }) {
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

                    {dataset.status === "preprocessed" && (
                        <span style={{ fontSize: "12px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                            ✓ Siap ditraining
                        </span>
                    )}

                    {dataset.status === "locked" && (
                        <span style={{ fontSize: "12px", color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px" }}>
                            🔒 Tidak dapat diproses
                        </span>
                    )}

                    {/* Tombol tandai — sembunyikan kalau locked */}
                    {dataset.status !== "locked" && (
                        <button onClick={() => onToggleStatus(dataset)}
                            title={dataset.status === "uploaded" ? "Tandai sebagai sudah diproses" : "Tandai sebagai belum diproses"}
                            style={{ padding: "7px 12px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}>
                            {dataset.status === "uploaded" ? "✓ Tandai Selesai" : "↩ Tandai Belum"}
                        </button>
                    )}

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
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [lineage, setLineage] = useState(null);
    const [loadingLineage, setLoadingLineage] = useState(false);
    const [consentDetail, setConsentDetail] = useState(null);
    const [showConsent, setShowConsent] = useState(false);
    const [loadingConsent, setLoadingConsent] = useState(false);

    const handleViewConsent = async (dataset) => {
        setShowConsent(true);
        setConsentDetail(null);
        setLoadingConsent(true);
        try {
            const res = await getConsent(dataset.dataset_id);
            setConsentDetail({ ...res.data.data, dataset_id: dataset.dataset_id });
        } catch {
            setConsentDetail(null);
        } finally {
            setLoadingConsent(false);
        }
    };

    const handleDownloadPdf = async (datasetId, subjectIndex, subjectName) => {
        try {
            const res = await downloadConsentPdf(datasetId, subjectIndex);
            const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `consent_${subjectName}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            alert("Gagal download PDF");
        }
    };

    const fetchDatasets = () => {
        setLoading(true);
        const status = statusFilter === "all" ? undefined : statusFilter;
        getDatasets(status)
            .then((res) => setDatasets(res.data.data))
            .catch(() => setError("Gagal memuat dataset"))
            .finally(() => setLoading(false));
    };

    const handleSelectDataset = async (dataset) => {
        if (selectedDataset?.dataset_id === dataset.dataset_id) {
            setSelectedDataset(null);
            setLineage(null);
            return;
        }
        setSelectedDataset(dataset);
        setLineage(null);
        setLoadingLineage(true);
        try {
            const res = await api.get(`/metadata/dataset/${dataset.dataset_id}`);
            setLineage(res.data.data);
        } catch {
            setLineage(null);
        } finally {
            setLoadingLineage(false);
        }
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
        locked: datasets.filter((d) => d.status === "locked").length,
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                    { label: "Total Dataset", value: stats.total, color: "var(--text-primary)" },
                    { label: "Belum Diproses", value: stats.uploaded, color: "var(--warning)" },
                    { label: "Sudah Diproses", value: stats.preprocessed, color: "var(--success)" },
                    { label: "Terkunci", value: stats.locked, color: "var(--danger)" },
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
                    { value: "locked", label: "Terkunci" },
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

            <div style={{ display: "grid", gridTemplateColumns: selectedDataset ? "1fr 300px" : "1fr", gap: "20px", alignItems: "start" }}>
                {/* Kiri — list dataset */}
                <div>
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
                                <div key={d.dataset_id} onClick={() => handleSelectDataset(d)} style={{ cursor: "pointer" }}>
                                    <DatasetCard
                                        dataset={d}
                                        onProcess={handleProcess}
                                        onToggleStatus={handleToggleStatus}
                                        onDelete={(dataset) => setDeleteTarget(dataset)}
                                        isSelected={selectedDataset?.dataset_id === d.dataset_id}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Kanan — Lineage Panel */}
                {selectedDataset && (
                    <div style={{ position: "sticky", top: "24px" }}>
                        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <RiDatabase2Line size={14} style={{ color: "var(--accent)" }} />
                                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        Metadata & Lineage
                                    </p>
                                </div>
                                <button onClick={() => { setSelectedDataset(null); setLineage(null); }}
                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                                    <RiCloseLine size={16} />
                                </button>
                            </div>

                            <div style={{ padding: "16px" }}>
                                {loadingLineage ? (
                                    <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Memuat lineage...</p>
                                ) : !lineage ? (
                                    <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Metadata tidak tersedia</p>
                                ) : (
                                    <>
                                        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px", marginBottom: "12px" }}>
                                            <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                                                Informasi Dataset
                                            </p>
                                            {[
                                                { label: "Nama", value: lineage.name },
                                                { label: "Tipe Data", value: lineage.data_type },
                                                { label: "Dibuat", value: new Date(lineage.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) },
                                                { label: "Baris", value: lineage.properties?.rows ? `${lineage.properties.rows.toLocaleString("id-ID")} baris` : "-" },
                                                { label: "Kolom", value: lineage.properties?.columns?.length ? `${lineage.properties.columns.length} kolom` : "-" },
                                                { label: "File Asli", value: lineage.properties?.original_filename || "-" },
                                                { label: "Dataset Role", value: lineage.properties?.dataset_role || "general" },
                                            ].map((item, i) => (
                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                                                    <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0 }}>{item.label}</span>
                                                    <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "500", textAlign: "right", wordBreak: "break-all" }}>{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px" }}>
                                            <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                                                Data Lineage
                                            </p>
                                            <div style={{ position: "relative", paddingLeft: "20px" }}>
                                                {/* Upload */}
                                                <div style={{ position: "relative", marginBottom: "14px" }}>
                                                    <div style={{ position: "absolute", left: "-20px", top: "3px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--role-data_engineer)", border: "2px solid var(--bg-elevated)" }} />
                                                    <div style={{ position: "absolute", left: "-15px", top: "13px", width: "1px", height: "calc(100% + 4px)", background: "var(--border)" }} />
                                                    <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--role-data_engineer)", marginBottom: "2px" }}>Upload</p>
                                                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>oleh {lineage.lineage?.uploaded_by || "-"}</p>
                                                    <p style={{ fontSize: "10px", color: "var(--text-muted)", opacity: 0.7 }}>
                                                        {lineage.lineage?.upload_time ? new Date(lineage.lineage.upload_time).toLocaleDateString("id-ID") : "-"}
                                                    </p>
                                                </div>

                                                {/* Preprocessing */}
                                                {lineage.lineage?.preprocessings?.length > 0 ? (
                                                    lineage.lineage.preprocessings.map((prep, i) => (
                                                        <div key={i} style={{ position: "relative", marginBottom: "14px" }}>
                                                            <div style={{ position: "absolute", left: "-20px", top: "3px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--role-data_scientist)", border: "2px solid var(--bg-elevated)" }} />
                                                            <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--role-data_scientist)", marginBottom: "2px" }}>Preprocessing</p>
                                                            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{prep.name || `#${prep.preprocessing_id}`}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ position: "relative", marginBottom: "14px" }}>
                                                        <div style={{ position: "absolute", left: "-20px", top: "3px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--border)", border: "2px solid var(--bg-elevated)" }} />
                                                        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Belum diproses</p>
                                                    </div>
                                                )}

                                                {/* Experiments */}
                                                {lineage.lineage?.experiments?.length > 0 ? (
                                                    lineage.lineage.experiments.map((exp, i) => (
                                                        <div key={i} style={{ position: "relative", marginBottom: "14px" }}>
                                                            <div style={{ position: "absolute", left: "-20px", top: "3px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--role-ml_engineer)", border: "2px solid var(--bg-elevated)" }} />
                                                            <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--role-ml_engineer)", marginBottom: "2px" }}>Training</p>
                                                            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{exp.name} — {exp.algorithm}</p>
                                                            <p style={{ fontSize: "10px", color: "var(--text-muted)", opacity: 0.7 }}>oleh {exp.trained_by || "-"}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ position: "relative" }}>
                                                        <div style={{ position: "absolute", left: "-20px", top: "3px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--border)", border: "2px solid var(--bg-elevated)" }} />
                                                        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Belum di-training</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Tombol Lihat Consent */}
                                        <button
                                            onClick={() => handleViewConsent(selectedDataset)}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "9px", background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", cursor: "pointer", marginTop: "12px" }}>
                                            🛡 Lihat Detail Consent
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <DeleteModal
                    dataset={deleteTarget}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {/* Consent Detail Modal */}
            {showConsent && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", width: "520px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "16px" }}>🛡</span>
                                <div>
                                    <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>Detail Privacy Consent</p>
                                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selectedDataset?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowConsent(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                                <RiCloseLine size={18} />
                            </button>
                        </div>

                        {loadingConsent ? (
                            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Memuat...</p>
                        ) : !consentDetail ? (
                            <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Consent belum disubmit untuk dataset ini</p>
                        ) : (
                            <>
                                {/* Status */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                                    {[
                                        { label: "Status Simpan", value: consentDetail.status_store, color: consentDetail.status_store === "approved" ? "var(--success)" : "var(--danger)" },
                                        { label: "Status Proses", value: consentDetail.status_process, color: consentDetail.status_process === "approved" ? "var(--success)" : "var(--warning)" },
                                    ].map((item, i) => (
                                        <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "10px 12px" }}>
                                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>{item.label}</p>
                                            <p style={{ fontSize: "13px", fontWeight: "600", color: item.color, textTransform: "capitalize" }}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Tabel subjek */}
                                <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>
                                    Daftar Subjek ({consentDetail.total_subjects} orang)
                                </p>
                                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", overflow: "hidden", border: "0.5px solid var(--border)" }}>
                                    {/* Header */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px", gap: "0", padding: "8px 12px", background: "var(--bg-surface)", borderBottom: "0.5px solid var(--border)" }}>
                                        {["Nama", "Simpan", "Proses", "Bukti PDF"].map((h, i) => (
                                            <span key={i} style={{ fontSize: "10px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.3px" }}>{h}</span>
                                        ))}
                                    </div>
                                    {/* Rows */}
                                    {consentDetail.subjects.map((s, i) => (
                                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px", gap: "0", padding: "10px 12px", borderBottom: i < consentDetail.subjects.length - 1 ? "0.5px solid var(--border)" : "none", alignItems: "center" }}>
                                            <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>{s.name}</span>
                                            <span style={{ fontSize: "12px", color: s.agree_store ? "var(--success)" : "var(--danger)" }}>{s.agree_store ? "✓ Ya" : "✗ Tidak"}</span>
                                            <span style={{ fontSize: "12px", color: s.agree_process ? "var(--success)" : "var(--warning)" }}>{s.agree_process ? "✓ Ya" : "✗ Tidak"}</span>
                                            <div>
                                                {s.has_pdf ? (
                                                    <button
                                                        onClick={() => handleDownloadPdf(consentDetail.dataset_id, s.index, s.name)}
                                                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius-sm)", fontSize: "11px", cursor: "pointer" }}>
                                                        <RiDownload2Line size={12} /> Download
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Tidak ada</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}