import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatasetById, getDatasets, getImagePreview, getDocuments } from "../../api/datasetsApi";
import { startPreprocessing, getPreprocessings, getPreprocessingById } from "../../api/preprocessingApi";
import api from "../../api/axiosConfig";
import {
    RiArrowLeftLine, RiFileLine, RiImageLine, RiFileTextLine,
    RiCheckboxCircleLine, RiErrorWarningLine, RiAddLine, RiCloseLine,
    RiTableLine, RiBarChartLine, RiShieldCheckLine,
} from "react-icons/ri";

const TYPE_CONFIG = {
    tabular: { icon: RiFileLine, color: "var(--role-data_engineer)", label: "Tabular" },
    image: { icon: RiImageLine, color: "var(--role-data_scientist)", label: "Gambar" },
    text: { icon: RiFileTextLine, color: "var(--role-ml_engineer)", label: "Teks" },
};

// ── Quality Panel (kanan) ──────────────────────────────────────────────────────
function QualityPanel({ datasetId }) {
    const [quality, setQuality] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/datasets/${datasetId}/quality`)
            .then((res) => setQuality(res.data.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [datasetId]);

    if (loading) return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Menganalisis dataset...</p>
        </div>
    );

    if (!quality) return null;

    const overall = {
        ok: { color: "var(--success)", bg: "var(--success-dim)", label: "Dataset Bersih" },
        warning: { color: "var(--warning)", bg: "var(--warning-dim)", label: "Ada Masalah Minor" },
        error: { color: "var(--danger)", bg: "var(--danger-dim)", label: "Perlu Perhatian" },
    }[quality.overall_status] || {};

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Overall status */}
            <div style={{ background: overall.bg, border: `0.5px solid ${overall.color}`, borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: overall.color, marginBottom: "4px" }}>{overall.label}</p>
                <p style={{ fontSize: "11px", color: overall.color, opacity: 0.8 }}>{quality.overall_message}</p>
            </div>

            {/* Stats */}
            <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <RiBarChartLine size={14} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ringkasan</p>
                </div>
                {[
                    { label: "Total Baris", value: quality.total_rows?.toLocaleString("id-ID"), color: "var(--text-primary)" },
                    { label: "Total Kolom", value: quality.total_cols, color: "var(--text-primary)" },
                    { label: "Missing Values", value: quality.total_missing?.toLocaleString("id-ID"), color: quality.total_missing > 0 ? "var(--warning)" : "var(--success)" },
                    { label: "Baris Duplikat", value: quality.duplicate_rows, color: quality.duplicate_rows > 0 ? "var(--warning)" : "var(--success)" },
                ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: item.color }}>{item.value}</span>
                    </div>
                ))}
            </div>

            {/* Per kolom */}
            <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <RiTableLine size={14} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Per Kolom</p>
                </div>
                <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    {quality.columns?.map((col, i) => {
                        const s = { ok: "var(--success)", warning: "var(--warning)", error: "var(--danger)" }[col.status] || "var(--text-muted)";
                        return (
                            <div key={i} style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-primary)", marginBottom: "2px" }}>{col.name}</p>
                                    <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{col.type} · {col.unique_values} unik</p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <span style={{ fontSize: "11px", color: s, fontWeight: "500" }}>
                                        {col.missing_pct > 0 ? `${col.missing_pct}% missing` : "✓ OK"}
                                    </span>
                                    {col.missing_pct > 0 && (
                                        <div style={{ width: "60px", background: "var(--bg-elevated)", borderRadius: "999px", height: "3px", marginTop: "4px", overflow: "hidden" }}>
                                            <div style={{ width: `${Math.min(col.missing_pct, 100)}%`, height: "100%", background: s, borderRadius: "999px" }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}

// ── Tabular Config Form ────────────────────────────────────────────────────────
// ── Tabular Config Form ────────────────────────────────────────────────────────
function TabularForm({ dataset, onSubmit, loading }) {
    const columns = dataset.meta?.columns || [];
    const [target, setTarget] = useState("");
    const [features, setFeatures] = useState([]);
    const [missing, setMissing] = useState("median");
    const [scaling, setScaling] = useState("standard");
    const [encoding, setEncoding] = useState("onehot");
    const [duplicate, setDuplicate] = useState("drop");
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(true);

    useEffect(() => {
        api.get(`/datasets/${dataset.dataset_id}`)
            .then((res) => setPreview(res.data.data.preview || []))
            .catch(() => { })
            .finally(() => setLoadingPreview(false));
    }, [dataset.dataset_id]);

    const toggleFeature = (col) => {
        setFeatures((prev) =>
            prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
        );
    };

    const handleSubmit = () => {
        if (!target || features.length === 0) return;
        onSubmit({
            config_type: "tabular",
            config: {
                target_column: target,
                feature_columns: features,
                missing_strategy: missing,
                scaling,
                encoding,
                duplicate_strategy: duplicate,
            },
        });
    };

    return (
        <div>
            {/* Preview tabel */}
            <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <RiTableLine size={14} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Preview Data (5 Baris Pertama)</p>
                </div>
                {loadingPreview ? (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Memuat preview...</p>
                ) : preview && preview.length > 0 ? (
                    <div style={{ overflowX: "auto", borderRadius: "var(--radius)", border: "0.5px solid var(--border)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                            <thead>
                                <tr>
                                    {columns.map((col) => (
                                        <th key={col} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500", background: "var(--bg-elevated)", borderBottom: "0.5px solid var(--border)", whiteSpace: "nowrap" }}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: "0.5px solid var(--border)" }}>
                                        {columns.map((col) => (
                                            <td key={col} style={{ padding: "7px 12px", color: "var(--text-secondary)", whiteSpace: "nowrap", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {row[col] !== undefined && row[col] !== null
                                                    ? String(row[col])
                                                    : <span style={{ color: "var(--danger)", fontStyle: "italic" }}>null</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

            {/* Target column */}
            <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Target Column</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {columns.map((col) => (
                        <button key={col}
                            onClick={() => { setTarget(col); setFeatures((f) => f.filter((c) => c !== col)); }}
                            style={{
                                padding: "5px 12px", borderRadius: "var(--radius)", fontSize: "12px",
                                border: `0.5px solid ${target === col ? "var(--accent)" : "var(--border-strong)"}`,
                                background: target === col ? "var(--accent-dim)" : "var(--bg-elevated)",
                                color: target === col ? "var(--accent)" : "var(--text-secondary)",
                                cursor: "pointer", transition: "all 0.15s",
                                display: "flex", alignItems: "center", gap: "4px",
                            }}>
                            {target === col && <RiCheckboxCircleLine size={12} />}
                            {col}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feature columns */}
            <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                    Feature Columns {features.length > 0 && `(${features.length} dipilih)`}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {columns.filter((c) => c !== target).map((col) => {
                        const selected = features.includes(col);
                        return (
                            <button key={col} onClick={() => toggleFeature(col)}
                                style={{
                                    padding: "5px 12px", borderRadius: "var(--radius)", fontSize: "12px",
                                    border: `0.5px solid ${selected ? "var(--accent)" : "var(--border-strong)"}`,
                                    background: selected ? "var(--accent-dim)" : "var(--bg-elevated)",
                                    color: selected ? "var(--accent)" : "var(--text-secondary)",
                                    cursor: "pointer", transition: "all 0.15s",
                                    display: "flex", alignItems: "center", gap: "4px",
                                }}>
                                {selected && <RiCheckboxCircleLine size={12} />}
                                {col}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Options */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {[
                    {
                        label: "Missing Values", value: missing, onChange: setMissing,
                        options: [
                            { v: "median", l: "Median" },
                            { v: "most_frequent", l: "Modus" },
                            { v: "drop", l: "Hapus Baris" },
                        ],
                    },
                    {
                        label: "Baris Duplikat", value: duplicate, onChange: setDuplicate,
                        options: [
                            { v: "drop", l: "Hapus Duplikat" },
                            { v: "keep", l: "Pertahankan" },
                        ],
                    },
                    {
                        label: "Scaling", value: scaling, onChange: setScaling,
                        options: [
                            { v: "standard", l: "Standard Scaler" },
                            { v: "minmax", l: "MinMax Scaler" },
                            { v: "none", l: "Tidak" },
                        ],
                    },
                    {
                        label: "Encoding", value: encoding, onChange: setEncoding,
                        options: [
                            { v: "onehot", l: "OneHot Encoding" },
                            { v: "label", l: "Label Encoding" },
                            { v: "none", l: "Tidak" },
                        ],
                    },
                ].map(({ label, value, onChange, options }) => (
                    <div key={label}>
                        <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "6px" }}>{label}</p>
                        <select value={value} onChange={(e) => onChange(e.target.value)}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)" }}>
                            {options.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            <button onClick={handleSubmit} disabled={!target || features.length === 0 || loading}
                style={{
                    width: "100%", padding: "11px",
                    background: !target || features.length === 0 || loading ? "var(--bg-elevated)" : "var(--accent)",
                    color: !target || features.length === 0 || loading ? "var(--text-muted)" : "#fff",
                    border: "none", borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "500",
                    cursor: !target || features.length === 0 || loading ? "not-allowed" : "pointer",
                }}>
                {loading ? "Memproses..." : "Jalankan Preprocessing →"}
            </button>
        </div>
    );
}

// ── Image Config Form ──────────────────────────────────────────────────────────
// ── Image Config Form ──────────────────────────────────────────────────────────
function ImageForm({ dataset, allDatasets, onSubmit, loading }) {
    const [selectedDatasetIds, setSelectedDatasetIds] = useState([dataset.dataset_id]);
    const [allFolders, setAllFolders] = useState([]);
    const [labelGroups, setLabelGroups] = useState({});
    const [newLabelName, setNewLabelName] = useState("");
    const [imageSize, setImageSize] = useState(64);
    const [grayscale, setGrayscale] = useState(false);
    const [previews, setPreviews] = useState({});
    const [loadingPreviews, setLoadingPreviews] = useState(false);

    // Fetch preview saat dataset dipilih berubah
    useEffect(() => {
        if (selectedDatasetIds.length === 0) return;
        setLoadingPreviews(true);

        Promise.all(
            selectedDatasetIds.map((id) =>
                getImagePreview(id).then((res) => ({ id, data: res.data.data }))
            )
        ).then((results) => {
            // Gabungkan semua folder dari semua dataset
            const folderMap = {};
            const previewMap = {};

            results.forEach(({ id, data }) => {
                data.forEach(({ folder, total_images, samples }) => {
                    if (!folderMap[folder]) {
                        folderMap[folder] = { total_images: 0, dataset_ids: [] };
                    }
                    folderMap[folder].total_images += total_images;
                    folderMap[folder].dataset_ids.push(id);

                    if (!previewMap[folder]) previewMap[folder] = [];
                    previewMap[folder] = [...previewMap[folder], ...samples].slice(0, 4);
                });
            });

            setAllFolders(Object.entries(folderMap).map(([name, info]) => ({ name, ...info })));
            setPreviews(previewMap);
        }).catch(() => { })
            .finally(() => setLoadingPreviews(false));
    }, [selectedDatasetIds]);

    const toggleDataset = (id) => {
        setSelectedDatasetIds((prev) =>
            prev.includes(id)
                ? prev.length > 1 ? prev.filter((d) => d !== id) : prev
                : [...prev, id]
        );
    };

    const addLabel = () => {
        if (!newLabelName.trim()) return;
        if (labelGroups[newLabelName.trim()]) return;
        setLabelGroups((p) => ({ ...p, [newLabelName.trim()]: [] }));
        setNewLabelName("");
    };

    const removeLabel = (label) => {
        setLabelGroups((p) => {
            const next = { ...p };
            delete next[label];
            return next;
        });
    };

    const assignFolder = (folder, label) => {
        setLabelGroups((prev) => {
            const next = {};
            Object.entries(prev).forEach(([l, folders]) => {
                next[l] = folders.filter((f) => f !== folder);
            });
            if (label) next[label] = [...(next[label] || []), folder];
            return next;
        });
    };

    const getFolderLabel = (folder) => {
        for (const [label, folders] of Object.entries(labelGroups)) {
            if (folders.includes(folder)) return label;
        }
        return null;
    };

    const unassignedFolders = allFolders.filter((f) => !getFolderLabel(f.name));
    const canSubmit = Object.keys(labelGroups).length >= 2 &&
        Object.values(labelGroups).every((f) => f.length > 0);

    const handleSubmit = () => {
        onSubmit({
            config_type: "image",
            config: {
                image_size: imageSize,
                grayscale,
                label_groups: labelGroups,
                extra_dataset_ids: selectedDatasetIds.filter((id) => id !== dataset.dataset_id),
            },
        });
    };

    const imageDatasets = allDatasets.filter((d) => d.data_type === "image");

    return (
        <div>
            {/* Pilih dataset yang digabung */}
            <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                    Dataset yang Digabung
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {imageDatasets.map((d) => {
                        const selected = selectedDatasetIds.includes(d.dataset_id);
                        const isMain = d.dataset_id === dataset.dataset_id;
                        return (
                            <button key={d.dataset_id}
                                onClick={() => !isMain && toggleDataset(d.dataset_id)}
                                style={{
                                    padding: "6px 14px", borderRadius: "var(--radius)", fontSize: "12px",
                                    border: `0.5px solid ${selected ? "var(--accent)" : "var(--border-strong)"}`,
                                    background: selected ? "var(--accent-dim)" : "var(--bg-elevated)",
                                    color: selected ? "var(--accent)" : "var(--text-secondary)",
                                    cursor: isMain ? "default" : "pointer",
                                    display: "flex", alignItems: "center", gap: "6px",
                                    opacity: isMain ? 0.8 : 1,
                                }}>
                                {selected && <RiCheckboxCircleLine size={12} />}
                                {d.name}
                                {isMain && <span style={{ fontSize: "10px", opacity: 0.7 }}>(utama)</span>}
                                {d.meta?.total_images && <span style={{ fontSize: "10px", opacity: 0.6 }}>· {d.meta.total_images} gambar</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Folder yang tersedia */}
            {loadingPreviews ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    Memuat folder dan preview gambar...
                </div>
            ) : allFolders.length > 0 && (
                <>
                    {/* Folder belum di-assign */}
                    {unassignedFolders.length > 0 && (
                        <div style={{ marginBottom: "20px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                                Folder Tersedia ({unassignedFolders.length} belum di-assign)
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {unassignedFolders.map((f) => (
                                    <div key={f.name} style={{ background: "var(--bg-elevated)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                            <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>📁 {f.name}</span>
                                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>({f.total_images} gambar)</span>
                                        </div>
                                        {/* Preview thumbnail */}
                                        {previews[f.name] && previews[f.name].length > 0 && (
                                            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                                                {previews[f.name].map((src, i) => (
                                                    <img key={i} src={src} alt={f.name}
                                                        style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "0.5px solid var(--border)" }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                                Assign folder ke label di bawah, atau biarkan jika tidak ingin dipakai
                            </p>
                        </div>
                    )}

                    {/* Label groups */}
                    <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Pengelompokan Label
                            </p>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input type="text" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addLabel()}
                                    placeholder="Nama label baru..."
                                    style={{ padding: "6px 12px", borderRadius: "var(--radius)", fontSize: "12px", width: "160px" }}
                                />
                                <button onClick={addLabel}
                                    style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}>
                                    <RiAddLine size={13} /> Tambah Label
                                </button>
                            </div>
                        </div>

                        {Object.keys(labelGroups).length === 0 && (
                            <div style={{ background: "var(--warning-dim)", border: "0.5px solid var(--warning)", borderRadius: "var(--radius)", padding: "12px 16px", fontSize: "12px", color: "var(--warning)" }}>
                                ⚠ Belum ada label. Tambahkan minimal 2 label untuk training klasifikasi.
                            </div>
                        )}

                        {Object.entries(labelGroups).map(([label, folders]) => (
                            <div key={label} style={{ background: "var(--bg-elevated)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px", marginBottom: "10px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent)" }}>🏷 {label}</span>
                                    <button onClick={() => removeLabel(label)}
                                        style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex" }}>
                                        <RiCloseLine size={16} />
                                    </button>
                                </div>

                                {/* Folder yang sudah di-assign ke label ini */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {folders.map((folder) => (
                                        <button key={folder} onClick={() => assignFolder(folder, null)}
                                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius-sm)", fontSize: "12px", cursor: "pointer" }}>
                                            📁 {folder}
                                            <RiCloseLine size={11} />
                                        </button>
                                    ))}
                                    {folders.length === 0 && (
                                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>Belum ada folder</span>
                                    )}
                                </div>

                                {/* Tombol assign folder yang belum ter-assign */}
                                {allFolders.filter((f) => !getFolderLabel(f.name)).length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>+ tambahkan:</span>
                                        {allFolders.filter((f) => !getFolderLabel(f.name)).map((f) => (
                                            <button key={f.name} onClick={() => assignFolder(f.name, label)}
                                                style={{ padding: "3px 8px", background: "var(--bg-surface)", color: "var(--text-secondary)", border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius-sm)", fontSize: "11px", cursor: "pointer" }}>
                                                📁 {f.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Preview gambar per label */}
                    {Object.keys(labelGroups).some((l) => labelGroups[l].length > 0) && (
                        <div style={{ marginBottom: "20px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                                Preview Gambar per Label
                            </p>
                            {Object.entries(labelGroups).map(([label, folders]) => {
                                const allSamples = folders.flatMap((f) => previews[f] || []).slice(0, 4);
                                if (allSamples.length === 0) return null;
                                return (
                                    <div key={label} style={{ marginBottom: "12px" }}>
                                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                                            🏷 <strong>{label}</strong> — {folders.reduce((sum, f) => {
                                                const info = allFolders.find((af) => af.name === f);
                                                return sum + (info?.total_images || 0);
                                            }, 0)} gambar total
                                        </p>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            {allSamples.map((src, i) => (
                                                <img key={i} src={src} alt={label}
                                                    style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "var(--radius)", border: "0.5px solid var(--border)" }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Options */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "6px" }}>Ukuran Gambar</p>
                    <select value={imageSize} onChange={(e) => setImageSize(Number(e.target.value))}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)" }}>
                        {[32, 64, 128].map((s) => <option key={s} value={s}>{s}×{s} px</option>)}
                    </select>
                </div>
                <div>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "6px" }}>Mode Warna</p>
                    <select value={grayscale ? "gray" : "rgb"} onChange={(e) => setGrayscale(e.target.value === "gray")}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)" }}>
                        <option value="rgb">RGB (berwarna)</option>
                        <option value="gray">Grayscale</option>
                    </select>
                </div>
            </div>

            {!canSubmit && Object.keys(labelGroups).length > 0 && (
                <div style={{ background: "var(--warning-dim)", border: "0.5px solid var(--warning)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "var(--warning)" }}>
                    ⚠ Minimal 2 label dan setiap label harus memiliki minimal 1 folder
                </div>
            )}

            <button onClick={handleSubmit} disabled={!canSubmit || loading}
                style={{ width: "100%", padding: "11px", background: !canSubmit || loading ? "var(--bg-elevated)" : "var(--accent)", color: !canSubmit || loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "500", cursor: !canSubmit || loading ? "not-allowed" : "pointer" }}>
                {loading ? "Memproses..." : "Jalankan Preprocessing →"}
            </button>
        </div>
    );
}

// ── Text Config Form ───────────────────────────────────────────────────────────
// ── Text Config Form ───────────────────────────────────────────────────────────
function TextForm({ dataset, onSubmit, loading }) {
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [labels, setLabels] = useState([]);
    const [newLabel, setNewLabel] = useState("");
    const [docLabels, setDocLabels] = useState({});   // { index: label }
    const [docTexts, setDocTexts] = useState({});   // { index: edited_text }
    const [editingIdx, setEditingIdx] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [bulkLabel, setBulkLabel] = useState("");
    const [search, setSearch] = useState("");
    const [filterLabel, setFilterLabel] = useState("all");
    const [language, setLanguage] = useState("indonesian");
    const [maxFeatures, setMaxFeatures] = useState(5000);
    const [removeStop, setRemoveStop] = useState(true);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    useEffect(() => {
        getDocuments(dataset.dataset_id)
            .then((res) => {
                const docs = res.data.data.documents.filter((d) => !d.is_empty);
                setDocuments(docs);
            })
            .catch(() => { })
            .finally(() => setLoadingDocs(false));
    }, [dataset.dataset_id]);

    const addLabel = () => {
        const trimmed = newLabel.trim();
        if (!trimmed || labels.includes(trimmed)) return;
        setLabels((p) => [...p, trimmed]);
        setNewLabel("");
    };

    const removeLabel = (label) => {
        setLabels((p) => p.filter((l) => l !== label));
        setDocLabels((p) => {
            const next = { ...p };
            Object.keys(next).forEach((k) => { if (next[k] === label) delete next[k]; });
            return next;
        });
    };

    const assignLabel = (index, label) => {
        setDocLabels((p) => {
            const next = { ...p };
            if (label === "") delete next[index];
            else next[index] = label;
            return next;
        });
    };

    const assignBulk = () => {
        if (!bulkLabel || selected.size === 0) return;
        setDocLabels((p) => {
            const next = { ...p };
            selected.forEach((idx) => { next[idx] = bulkLabel; });
            return next;
        });
        setSelected(new Set());
        setBulkLabel("");
    };

    const toggleSelect = (index) => {
        setSelected((p) => {
            const next = new Set(p);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const selectAllVisible = () => {
        const visibleIndices = filteredDocs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((d) => d.index);
        setSelected((p) => {
            const next = new Set(p);
            visibleIndices.forEach((i) => next.add(i));
            return next;
        });
    };

    const clearSelection = () => setSelected(new Set());

    // Filter dokumen
    const filteredDocs = documents.filter((d) => {
        const text = docTexts[d.index] ?? d.text;
        const matchSearch = search === "" || text.toLowerCase().includes(search.toLowerCase());
        const matchLabel = filterLabel === "all"
            ? true
            : filterLabel === "unlabeled"
                ? !docLabels[d.index]
                : docLabels[d.index] === filterLabel;
        return matchSearch && matchLabel;
    });

    const totalPages = Math.ceil(filteredDocs.length / PAGE_SIZE);
    const visibleDocs = filteredDocs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const labeledCount = Object.keys(docLabels).length;
    const totalNonEmpty = documents.length;

    const LABEL_COLORS = [
        "var(--accent)", "var(--success)", "var(--warning)",
        "var(--info)", "var(--danger)", "#a78bfa", "#f472b6",
    ];

    const getLabelColor = (label) => {
        const idx = labels.indexOf(label);
        return LABEL_COLORS[idx % LABEL_COLORS.length] || "var(--text-muted)";
    };

    const handleSubmit = () => {
        // Bangun format labels untuk backend: { index: label }
        const labelsPayload = {};
        Object.entries(docLabels).forEach(([idx, label]) => {
            labelsPayload[idx] = label;
        });

        // Bangun teks yang sudah diedit
        const editedTexts = { ...docTexts };

        onSubmit({
            config_type: "text",
            config: {
                labels: labelsPayload,
                edited_texts: editedTexts,
                remove_stopwords: removeStop,
                language,
                max_features: maxFeatures,
            },
        });
    };

    const canSubmit = labels.length >= 2 && labeledCount > 0;

    return (
        <div>
            {/* Step 1 — Definisi label */}
            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                    Langkah 1 — Definisikan Label (minimal 2)
                </p>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input type="text" value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addLabel()}
                        placeholder="Nama label (contoh: positif, negatif)"
                        style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius)", fontSize: "13px" }}
                    />
                    <button onClick={addLabel}
                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                        <RiAddLine size={14} /> Tambah
                    </button>
                </div>
                {labels.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {labels.map((label) => {
                            const c = getLabelColor(label);
                            const count = Object.values(docLabels).filter((l) => l === label).length;
                            return (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "999px", background: `${c}20`, border: `0.5px solid ${c}` }}>
                                    <span style={{ fontSize: "12px", fontWeight: "500", color: c }}>{label}</span>
                                    <span style={{ fontSize: "10px", color: c, opacity: 0.7 }}>({count} dok)</span>
                                    <button onClick={() => removeLabel(label)}
                                        style={{ background: "none", border: "none", color: c, cursor: "pointer", display: "flex", padding: "0", marginLeft: "2px" }}>
                                        <RiCloseLine size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                        Belum ada label. Tambahkan minimal 2 label sebelum melanjutkan.
                    </p>
                )}
            </div>

            {/* Step 2 — Labeling dokumen */}
            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Langkah 2 — Labeling Dokumen
                        <span style={{ marginLeft: "8px", fontWeight: "400", color: labeledCount > 0 ? "var(--success)" : "var(--warning)" }}>
                            ({labeledCount}/{totalNonEmpty} diberi label)
                        </span>
                    </p>

                    {/* Bulk assign */}
                    {selected.size > 0 && labels.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "var(--accent)" }}>{selected.size} dipilih</span>
                            <select value={bulkLabel} onChange={(e) => setBulkLabel(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: "var(--radius)", fontSize: "12px", minWidth: "120px" }}>
                                <option value="">Pilih label...</option>
                                {labels.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <button onClick={assignBulk} disabled={!bulkLabel}
                                style={{ padding: "6px 12px", background: bulkLabel ? "var(--accent)" : "var(--bg-surface)", color: bulkLabel ? "#fff" : "var(--text-muted)", border: "none", borderRadius: "var(--radius)", fontSize: "12px", cursor: bulkLabel ? "pointer" : "not-allowed" }}>
                                Assign
                            </button>
                            <button onClick={clearSelection}
                                style={{ padding: "6px 10px", background: "var(--bg-surface)", color: "var(--text-muted)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}>
                                Batal
                            </button>
                        </div>
                    )}
                </div>

                {/* Search + Filter */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                    <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        placeholder="🔍 Cari dokumen..."
                        style={{ flex: 1, minWidth: "200px", padding: "7px 12px", borderRadius: "var(--radius)", fontSize: "12px" }}
                    />
                    <select value={filterLabel} onChange={(e) => { setFilterLabel(e.target.value); setPage(0); }}
                        style={{ padding: "7px 12px", borderRadius: "var(--radius)", fontSize: "12px" }}>
                        <option value="all">Semua dokumen</option>
                        <option value="unlabeled">Belum dilabeli</option>
                        {labels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button onClick={selectAllVisible}
                        style={{ padding: "7px 12px", background: "var(--bg-surface)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}>
                        Pilih Semua di Halaman
                    </button>
                </div>

                {/* Tabel dokumen */}
                {loadingDocs ? (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>Memuat dokumen...</p>
                ) : (
                    <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius)", overflow: "hidden", border: "0.5px solid var(--border)" }}>
                        {/* Header */}
                        <div style={{ display: "grid", gridTemplateColumns: "36px 48px 1fr 140px", gap: "0", background: "var(--bg-elevated)", borderBottom: "0.5px solid var(--border)", padding: "8px 12px" }}>
                            {["", "#", "Dokumen", "Label"].map((h, i) => (
                                <span key={i} style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</span>
                            ))}
                        </div>

                        {/* Rows */}
                        {visibleDocs.length === 0 ? (
                            <div style={{ padding: "24px", textAlign: "center" }}>
                                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Tidak ada dokumen yang cocok</p>
                            </div>
                        ) : visibleDocs.map((doc) => {
                            const currentText = docTexts[doc.index] ?? doc.text;
                            const currentLabel = docLabels[doc.index];
                            const isEditing = editingIdx === doc.index;
                            const isSelected = selected.has(doc.index);
                            const labelColor = currentLabel ? getLabelColor(currentLabel) : null;

                            return (
                                <div key={doc.index} style={{
                                    display: "grid", gridTemplateColumns: "36px 48px 1fr 140px",
                                    gap: "0", padding: "8px 12px",
                                    borderBottom: "0.5px solid var(--border)",
                                    background: isSelected ? "var(--accent-dim)" : "transparent",
                                    transition: "background 0.1s",
                                }}>
                                    {/* Checkbox */}
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <input type="checkbox" checked={isSelected}
                                            onChange={() => toggleSelect(doc.index)}
                                            style={{ cursor: "pointer", width: "14px", height: "14px", accentColor: "var(--accent)" }}
                                        />
                                    </div>

                                    {/* Index */}
                                    <span style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>{doc.index}</span>

                                    {/* Teks — klik untuk edit */}
                                    <div style={{ alignSelf: "center", paddingRight: "8px" }}>
                                        {isEditing ? (
                                            <textarea
                                                autoFocus
                                                defaultValue={currentText}
                                                onBlur={(e) => {
                                                    const val = e.target.value.trim();
                                                    setDocTexts((p) => ({ ...p, [doc.index]: val }));
                                                    setEditingIdx(null);
                                                }}
                                                style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", fontSize: "12px", resize: "vertical", minHeight: "48px", background: "var(--bg-elevated)", color: "var(--text-primary)", border: "0.5px solid var(--accent)" }}
                                            />
                                        ) : (
                                            <p
                                                onClick={() => setEditingIdx(doc.index)}
                                                title="Klik untuk edit"
                                                style={{ fontSize: "12px", color: "var(--text-secondary)", cursor: "text", lineHeight: "1.5", wordBreak: "break-word", padding: "4px 0" }}>
                                                {currentText || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>— kosong —</span>}
                                                {docTexts[doc.index] && docTexts[doc.index] !== doc.text && (
                                                    <span style={{ fontSize: "10px", color: "var(--accent)", marginLeft: "6px" }}>✏ diedit</span>
                                                )}
                                            </p>
                                        )}
                                    </div>

                                    {/* Label dropdown */}
                                    <div style={{ alignSelf: "center" }}>
                                        {labels.length === 0 ? (
                                            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Buat label dulu</span>
                                        ) : (
                                            <select
                                                value={currentLabel || ""}
                                                onChange={(e) => assignLabel(doc.index, e.target.value)}
                                                style={{
                                                    width: "100%", padding: "5px 8px",
                                                    borderRadius: "var(--radius-sm)", fontSize: "12px",
                                                    border: `0.5px solid ${labelColor || "var(--border-strong)"}`,
                                                    background: labelColor ? `${labelColor}15` : "var(--bg-elevated)",
                                                    color: labelColor || "var(--text-muted)",
                                                }}>
                                                <option value="">— belum dilabeli —</option>
                                                {labels.map((l) => (
                                                    <option key={l} value={l} style={{ color: "var(--text-primary)", background: "var(--bg-elevated)" }}>{l}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                            style={{ padding: "5px 12px", background: "var(--bg-elevated)", color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", cursor: page === 0 ? "not-allowed" : "pointer" }}>
                            ← Prev
                        </button>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Halaman {page + 1} dari {totalPages} · {filteredDocs.length} dokumen
                        </span>
                        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                            style={{ padding: "5px 12px", background: "var(--bg-elevated)", color: page === totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", cursor: page === totalPages - 1 ? "not-allowed" : "pointer" }}>
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {/* Step 3 — Opsi preprocessing */}
            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                    Langkah 3 — Opsi Preprocessing Teks
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <div>
                        <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "6px" }}>Bahasa Stopwords</p>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)" }}>
                            <option value="indonesian">Indonesia</option>
                            <option value="english">Inggris</option>
                        </select>
                    </div>
                    <div>
                        <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "6px" }}>Hapus Stopwords</p>
                        <select value={removeStop ? "yes" : "no"} onChange={(e) => setRemoveStop(e.target.value === "yes")}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)" }}>
                            <option value="yes">Ya</option>
                            <option value="no">Tidak</option>
                        </select>
                    </div>
                    <div>
                        <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "6px" }}>Max Fitur TF-IDF</p>
                        <select value={maxFeatures} onChange={(e) => setMaxFeatures(Number(e.target.value))}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)" }}>
                            {[1000, 3000, 5000, 10000].map((v) => <option key={v} value={v}>{v.toLocaleString()}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Validasi & Submit */}
            {!canSubmit && (
                <div style={{ background: "var(--warning-dim)", border: "0.5px solid var(--warning)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "var(--warning)" }}>
                    {labels.length < 2
                        ? "⚠ Tambahkan minimal 2 label di Langkah 1"
                        : "⚠ Minimal 1 dokumen harus diberi label"}
                </div>
            )}

            <button onClick={handleSubmit} disabled={!canSubmit || loading}
                style={{ width: "100%", padding: "11px", background: !canSubmit || loading ? "var(--bg-elevated)" : "var(--accent)", color: !canSubmit || loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "500", cursor: !canSubmit || loading ? "not-allowed" : "pointer" }}>
                {loading ? "Memproses..." : `Jalankan Preprocessing → (${labeledCount} dokumen berlabel)`}
            </button>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PreprocessPage() {
    const { datasetId } = useParams();
    const navigate = useNavigate();
    const [dataset, setDataset] = useState(null);
    const [history, setHistory] = useState([]);
    const [allDatasets, setAllDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [prepName, setPrepName] = useState("");

    useEffect(() => {
        Promise.all([
            getDatasetById(datasetId),
            getPreprocessings(datasetId),
            getDatasets(),
        ]).then(([dsRes, prepRes, allDs]) => {
            setDataset(dsRes.data.data);
            setHistory(prepRes.data.data);
            setAllDatasets(allDs.data.data || []);
        }).catch(() => setError("Gagal memuat data"))
            .finally(() => setLoading(false));
    }, [datasetId]);

    const handleSubmit = async (payload) => {
        if (!prepName.trim()) {
            setError("Nama preprocessing wajib diisi");
            return;
        }
        setSubmitting(true);
        setError("");
        setResult(null);
        try {
            const res = await startPreprocessing({
                dataset_id: Number(datasetId),
                name: prepName.trim(),
                ...payload,
            });
            setResult(res.data.data);

            const interval = setInterval(async () => {
                try {
                    const statusRes = await getPreprocessingById(res.data.data.preprocessing_id);
                    const data = statusRes.data.data;
                    if (data.status === "completed") {
                        clearInterval(interval);
                        setResult(data);
                        setSubmitting(false);
                    } else if (data.status === "failed") {
                        clearInterval(interval);
                        setError(data.error_message || "Preprocessing gagal");
                        setSubmitting(false);
                    }
                } catch {
                    clearInterval(interval);
                    setSubmitting(false);
                }
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Gagal memulai preprocessing");
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Memuat...</div>;
    if (!dataset) return <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>Dataset tidak ditemukan</div>;

    const typeConfig = TYPE_CONFIG[dataset.data_type] || TYPE_CONFIG.tabular;
    const TypeIcon = typeConfig.icon;
    const isTabular = dataset.data_type === "tabular";

    return (
        <div style={{ display: "grid", gridTemplateColumns: isTabular ? "1fr 280px" : "1fr", gap: "20px", alignItems: "start" }}>
            {/* Kiri — form */}
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                    <button onClick={() => navigate("/scientist/datasets")}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                        <RiArrowLeftLine size={14} /> Kembali
                    </button>
                    <div>
                        <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>Preprocessing</h1>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Konfigurasi preprocessing dataset</p>
                    </div>
                </div>

                {/* Dataset info */}
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "var(--radius)", background: `${typeConfig.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <TypeIcon size={18} style={{ color: typeConfig.color }} />
                    </div>
                    <div>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>{dataset.name}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {typeConfig.label} · {dataset.original_filename} · ID #{dataset.dataset_id}
                            {dataset.meta?.rows && ` · ${dataset.meta.rows.toLocaleString("id-ID")} baris`}
                            {dataset.meta?.total_images && ` · ${dataset.meta.total_images} gambar`}
                        </p>
                    </div>
                </div>
                {/* Nama preprocessing */}
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "8px" }}>Nama Preprocessing</p>
                    <input
                        type="text"
                        value={prepName}
                        onChange={(e) => setPrepName(e.target.value)}
                        placeholder="contoh: Adult Income - OneHot - StandardScaler"
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)", fontSize: "13px" }}
                    />
                </div>

                {/* Form */}
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
                        Konfigurasi Preprocessing — {typeConfig.label}
                    </p>
                    {dataset.data_type === "tabular" && <TabularForm dataset={dataset} onSubmit={handleSubmit} loading={submitting} />}
                    {dataset.data_type === "image" && (
                        <ImageForm
                            dataset={dataset}
                            allDatasets={allDatasets}
                            onSubmit={handleSubmit}
                            loading={submitting}
                        />
                    )}
                    {dataset.data_type === "text" && <TextForm dataset={dataset} onSubmit={handleSubmit} loading={submitting} />}
                </div>

                {error && (
                    <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "13px", display: "flex", gap: "8px" }}>
                        <RiErrorWarningLine size={15} style={{ flexShrink: 0 }} /> {error}
                    </div>
                )}

                {result?.status === "completed" && (
                    <div style={{ background: "var(--success-dim)", border: "0.5px solid var(--success)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <RiCheckboxCircleLine size={16} style={{ color: "var(--success)" }} />
                            <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--success)" }}>Preprocessing selesai!</p>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--success)", opacity: 0.8, marginBottom: "12px" }}>Dataset siap untuk ditraining oleh ML Engineer.</p>
                        <button onClick={() => navigate("/scientist/datasets")}
                            style={{ padding: "8px 16px", background: "var(--success)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                            Kembali ke Daftar Dataset
                        </button>
                    </div>
                )}

                {/* Riwayat */}
                {history.length > 0 && (
                    <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginTop: "16px" }}>
                        <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Riwayat ({history.length})</p>
                        </div>
                        {history.map((p) => (
                            <div key={p.preprocessing_id} style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "2px" }}>Preprocessing #{p.preprocessing_id}</p>
                                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                        {p.config?.config_type}{p.config?.target_column && ` · Target: ${p.config.target_column}`}
                                    </p>
                                </div>
                                <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", background: p.status === "completed" ? "var(--success-dim)" : p.status === "failed" ? "var(--danger-dim)" : "var(--warning-dim)", color: p.status === "completed" ? "var(--success)" : p.status === "failed" ? "var(--danger)" : "var(--warning)" }}>
                                    {p.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Kanan — quality panel (hanya tabular) */}
            {isTabular && (
                <div style={{ position: "sticky", top: "24px" }}>
                    <QualityPanel datasetId={datasetId} />
                </div>
            )}
        </div>
    );
}