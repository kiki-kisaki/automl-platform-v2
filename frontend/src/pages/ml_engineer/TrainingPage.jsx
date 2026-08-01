import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPreprocessings } from "../../api/preprocessingApi";
import { togglePreprocessingTrained } from "../../api/preprocessingApi";
import { getDatasetById } from "../../api/datasetsApi";
import { startExperiment } from "../../api/experimentsApi";
import {
    RiArrowLeftLine, RiCheckboxCircleLine, RiFileLine,
    RiImageLine, RiFileTextLine, RiFlaskLine, RiRefreshLine,
} from "react-icons/ri";
import MonitoringPage from "./MonitoringPage";


const ALGORITHMS = {
    tabular: {
        classification: ["decision_tree", "random_forest", "svm", "knn", "logistic_regression"],
        regression: ["linear_regression", "decision_tree", "random_forest", "svr"],
    },
    image: { classification: ["svm", "random_forest", "knn"] },
    text: { classification: ["naive_bayes", "logistic_regression", "svm", "random_forest"] },
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

const TYPE_CONFIG = {
    tabular: { icon: RiFileLine, color: "var(--role-data_engineer)", label: "Tabular" },
    image: { icon: RiImageLine, color: "var(--role-data_scientist)", label: "Gambar" },
    text: { icon: RiFileTextLine, color: "var(--role-ml_engineer)", label: "Teks" },
};

function PrepCard({ prep, dataset, selected, onClick, onToggleTrained, showToggle }) {
    const typeConfig = TYPE_CONFIG[dataset?.data_type] || TYPE_CONFIG.tabular;
    const TypeIcon = typeConfig.icon;
    const config = prep.config || {};
    const isTrained = prep.is_trained === 1;

    // Ambil info label berdasarkan tipe data
    const getLabelInfo = () => {
        if (dataset?.data_type === "image") {
            const groups = config.label_groups || {};
            const labels = Object.keys(groups);
            return labels.length > 0
                ? `Label: ${labels.join(", ")}`
                : `${config.classes?.join(", ") || "—"}`;
        }
        if (dataset?.data_type === "text") {
            const labels = config.labels || {};
            const uniqueLabels = [...new Set(Object.values(labels))];
            return uniqueLabels.length > 0
                ? `Label: ${uniqueLabels.join(", ")}`
                : "Belum ada label";
        }
        if (dataset?.data_type === "tabular") {
            return config.target_column ? `Target: ${config.target_column}` : "—";
        }
        return "—";
    };

    return (
        <div style={{
            background: selected ? "var(--accent-dim)" : "var(--bg-surface)",
            border: `0.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)", padding: "14px 16px",
            transition: "all 0.15s",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Icon — klik untuk select */}
                <div onClick={onClick} style={{ width: "36px", height: "36px", borderRadius: "var(--radius)", background: `${typeConfig.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                    <TypeIcon size={18} style={{ color: typeConfig.color }} />
                </div>

                {/* Info — klik untuk select */}
                <div onClick={onClick} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: selected ? "var(--accent)" : "var(--text-primary)", marginBottom: "3px" }}>
                        {prep.name || dataset?.name || `Preprocessing #${prep.preprocessing_id}`}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>
                        Preprocessing #{prep.preprocessing_id} · {typeConfig.label}
                    </p>
                    <p style={{ fontSize: "11px", color: typeConfig.color, fontWeight: "500" }}>
                        {getLabelInfo()}
                    </p>
                    {dataset?.data_type === "image" && config.label_groups && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                            {Object.entries(config.label_groups).map(([label, folders]) => (
                                <span key={label} style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", background: `${typeConfig.color}20`, color: typeConfig.color, border: `0.5px solid ${typeConfig.color}` }}>
                                    {label} ({folders.length} folder)
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {selected && <RiCheckboxCircleLine size={18} style={{ color: "var(--accent)" }} />}
                    {showToggle && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleTrained(prep); }}
                            title={isTrained ? "Tandai belum di-training" : "Tandai sudah di-training"}
                            style={{ padding: "5px 10px", background: isTrained ? "var(--success-dim)" : "var(--bg-elevated)", color: isTrained ? "var(--success)" : "var(--text-muted)", border: `0.5px solid ${isTrained ? "var(--success)" : "var(--border-strong)"}`, borderRadius: "var(--radius-sm)", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>
                            {isTrained ? "✓ Sudah Di-training" : "Tandai Selesai"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TrainingPage() {
    const navigate = useNavigate();
    const [preps, setPreps] = useState([]);
    const [datasets, setDatasets] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedPrep, setSelectedPrep] = useState(null);
    const [name, setName] = useState("");
    const [taskType, setTaskType] = useState("");
    const [algorithm, setAlgorithm] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("belum");  // "belum" | "sudah"
    const [monitoringExp, setMonitoringExp] = useState(null);

    const fetchData = () => {
        setLoading(true);
        getPreprocessings()
            .then(async (res) => {
                const completedPreps = res.data.data.filter((p) => p.status === "completed");
                setPreps(completedPreps);

                const dsMap = {};
                await Promise.all(
                    [...new Set(completedPreps.map((p) => p.dataset_id))].map(async (dsId) => {
                        try {
                            const dsRes = await getDatasetById(dsId);
                            dsMap[dsId] = dsRes.data.data;
                        } catch { }
                    })
                );
                setDatasets(dsMap);
            })
            .catch(() => setError("Gagal memuat daftar preprocessing"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const belumTrained = preps.filter((p) => !p.is_trained);
    const sudahTrained = preps.filter((p) => p.is_trained);
    const displayedPreps = activeTab === "belum" ? belumTrained : sudahTrained;

    const handleSelectPrep = (prep) => {
        if (prep.is_trained) return; // tidak bisa pilih yang sudah di-training
        setSelectedPrep(prep);
        setTaskType("");
        setAlgorithm("");
        setError("");
    };

    const handleToggleTrained = async (prep) => {
        try {
            await togglePreprocessingTrained(prep.preprocessing_id);
            if (selectedPrep?.preprocessing_id === prep.preprocessing_id) {
                setSelectedPrep(null);
                setTaskType("");
                setAlgorithm("");
            }
            fetchData();
        } catch {
            setError("Gagal mengubah status preprocessing");
        }
    };

    const selectedDataset = selectedPrep ? datasets[selectedPrep.dataset_id] : null;
    const dataType = selectedDataset?.data_type;
    const availableTaskTypes = dataType ? Object.keys(ALGORITHMS[dataType] || {}) : [];
    const availableAlgs = dataType && taskType ? (ALGORITHMS[dataType]?.[taskType] || []) :
        dataType && dataType !== "tabular" ? ALGORITHMS[dataType]?.classification || [] : [];

    const handleSubmit = async () => {
        if (!selectedPrep || !name.trim() || !algorithm) {
            setError("Lengkapi semua konfigurasi");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const res = await startExperiment({
                preprocessing_id: selectedPrep.preprocessing_id,
                name: name.trim(),
                task_type: taskType || null,
                algorithm,
                hyperparameters: {},
            });
            setMonitoringExp({
                id: res.data.data.experiment_id,
                name: name.trim(),
            });
        } catch (err) {
            setError(err.response?.data?.message || "Gagal memulai training");
        } finally {
            setSubmitting(false);
        }
    };

    if (monitoringExp) {
        return (
            <MonitoringPage
                experimentId={monitoringExp.id}
                experimentName={monitoringExp.name}
                onBack={() => {
                    setMonitoringExp(null);
                    setName("");
                    setAlgorithm("");
                    setTaskType("");
                    setSelectedPrep(null);
                    fetchData();
                }}
            />
        );
    }


    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
                <button onClick={() => navigate("/ml/experiments")}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                    <RiArrowLeftLine size={14} /> Kembali
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>Training Baru</h1>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Pilih preprocessing dan konfigurasi algoritma</p>
                </div>
                <button onClick={fetchData}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                    <RiRefreshLine size={14} /> Refresh
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 280px", gap: "16px", alignItems: "start" }}>

                {/* Kolom 1 — Pilih preprocessing */}
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
                        Langkah 1 — Pilih Hasil Preprocessing
                    </p>

                    {/* Tab */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                        {[
                            { value: "belum", label: `Belum Di-training (${belumTrained.length})` },
                            { value: "sudah", label: `Sudah Di-training (${sudahTrained.length})` },
                        ].map((t) => (
                            <button key={t.value} onClick={() => setActiveTab(t.value)}
                                style={{ flex: 1, padding: "6px 10px", borderRadius: "var(--radius)", fontSize: "11px", fontWeight: "500", border: `0.5px solid ${activeTab === t.value ? "var(--accent)" : "var(--border-strong)"}`, background: activeTab === t.value ? "var(--accent-dim)" : "var(--bg-elevated)", color: activeTab === t.value ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer" }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Memuat...</p>
                    ) : displayedPreps.length === 0 ? (
                        <div style={{ background: activeTab === "belum" ? "var(--warning-dim)" : "var(--bg-elevated)", border: `0.5px solid ${activeTab === "belum" ? "var(--warning)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "14px", fontSize: "12px", color: activeTab === "belum" ? "var(--warning)" : "var(--text-muted)", textAlign: "center" }}>
                            {activeTab === "belum"
                                ? "⚠ Belum ada preprocessing yang siap di-training"
                                : "Belum ada preprocessing yang ditandai sudah di-training"}
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
                            {displayedPreps.map((prep) => (
                                <PrepCard
                                    key={prep.preprocessing_id}
                                    prep={prep}
                                    dataset={datasets[prep.dataset_id]}
                                    selected={selectedPrep?.preprocessing_id === prep.preprocessing_id}
                                    onClick={() => handleSelectPrep(prep)}
                                    onToggleTrained={handleToggleTrained}
                                    showToggle={true}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Kolom 2 — Konfigurasi training */}
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
                        Langkah 2 — Konfigurasi Training
                    </p>

                    {!selectedPrep ? (
                        <div style={{ padding: "40px 20px", textAlign: "center" }}>
                            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>Pilih preprocessing di sebelah kiri</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", opacity: 0.7 }}>Konfigurasi training akan muncul setelah preprocessing dipilih</p>
                        </div>
                    ) : (
                        <>
                            {/* Info preprocessing terpilih */}
                            {selectedDataset && (
                                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "16px", fontSize: "12px" }}>
                                    <p style={{ color: "var(--text-muted)", marginBottom: "2px" }}>Preprocessing terpilih:</p>
                                    <p style={{ color: "var(--text-primary)", fontWeight: "500" }}>
                                        {selectedPrep.name || `Preprocessing #${selectedPrep.preprocessing_id}`}
                                    </p>
                                    <p style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                                        {selectedDataset.name} · {TYPE_CONFIG[dataType]?.label}
                                    </p>
                                </div>
                            )}

                            {/* Nama eksperimen */}
                            <div style={{ marginBottom: "14px" }}>
                                <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "6px" }}>Nama Eksperimen</p>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                    placeholder="contoh: Adult Classification RF v1"
                                    style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)", fontSize: "13px" }}
                                />
                            </div>

                            {/* Task type — hanya tabular */}
                            {dataType === "tabular" && (
                                <div style={{ marginBottom: "14px" }}>
                                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "8px" }}>Task Type</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                        {availableTaskTypes.map((t) => (
                                            <button key={t} onClick={() => { setTaskType(t); setAlgorithm(""); }}
                                                style={{ padding: "12px", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", border: `0.5px solid ${taskType === t ? "var(--accent)" : "var(--border-strong)"}`, background: taskType === t ? "var(--accent-dim)" : "var(--bg-elevated)", color: taskType === t ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", textAlign: "center" }}>
                                                <div style={{ fontSize: "16px", marginBottom: "4px" }}>{t === "classification" ? "🏷" : "📈"}</div>
                                                {t === "classification" ? "Classification" : "Regression"}
                                                <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "2px", fontWeight: "400" }}>
                                                    {t === "classification" ? "Prediksi kategori" : "Prediksi nilai numerik"}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Info auto task type */}
                            {dataType && dataType !== "tabular" && (
                                <div style={{ background: "var(--info-dim)", border: "0.5px solid var(--info)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "14px", fontSize: "12px", color: "var(--info)" }}>
                                    ℹ Dataset {dataType === "image" ? "gambar" : "teks"} otomatis menggunakan <strong>Classification</strong>
                                </div>
                            )}

                            {/* Algoritma */}
                            {(taskType || dataType !== "tabular") && availableAlgs.length > 0 && (
                                <div style={{ marginBottom: "14px" }}>
                                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "8px" }}>Algoritma</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {availableAlgs.map((alg) => (
                                            <button key={alg} onClick={() => setAlgorithm(alg)}
                                                style={{ padding: "10px 14px", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", border: `0.5px solid ${algorithm === alg ? "var(--accent)" : "var(--border-strong)"}`, background: algorithm === alg ? "var(--accent-dim)" : "var(--bg-elevated)", color: algorithm === alg ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                {ALG_LABELS[alg] || alg}
                                                {algorithm === alg && <RiCheckboxCircleLine size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "14px", fontSize: "12px" }}>
                                    {error}
                                </div>
                            )}

                            <button onClick={handleSubmit}
                                disabled={!name.trim() || !algorithm || submitting}
                                style={{ width: "100%", padding: "12px", background: !name.trim() || !algorithm || submitting ? "var(--bg-elevated)" : "var(--accent)", color: !name.trim() || !algorithm || submitting ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "500", cursor: !name.trim() || !algorithm || submitting ? "not-allowed" : "pointer" }}>
                                {submitting ? "Memulai Training..." : "🚀 Mulai Training"}
                            </button>
                        </>
                    )}
                </div>

                {/* Kolom 3 — Ringkasan */}
                <div style={{ position: "sticky", top: "24px" }}>
                    <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                            <RiFlaskLine size={14} style={{ color: "var(--accent)" }} />
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ringkasan</p>
                        </div>
                        {[
                            { label: "Dataset", value: selectedDataset?.name || "-" },
                            { label: "Tipe Data", value: dataType || "-" },
                            { label: "Nama", value: name || "-" },
                            { label: "Task Type", value: taskType || (dataType && dataType !== "tabular" ? "classification" : "-") },
                            { label: "Algoritma", value: ALG_LABELS[algorithm] || algorithm || "-" },
                        ].map((item, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
                                <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0 }}>{item.label}</span>
                                <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "500", textAlign: "right", wordBreak: "break-word" }}>{item.value}</span>
                            </div>
                        ))}

                        {/* Info label untuk gambar */}
                        {selectedPrep && dataType === "image" && selectedPrep.config?.label_groups && (
                            <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>Label yang ditraining:</p>
                                {Object.entries(selectedPrep.config.label_groups).map(([label, folders]) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "11px", color: "var(--role-data_scientist)" }}>🏷 {label}</span>
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{folders.join(", ")}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Status siap */}
                        <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: "12px", marginTop: "8px" }}>
                            <div style={{ background: selectedPrep && name.trim() && algorithm ? "var(--success-dim)" : "var(--bg-elevated)", border: `0.5px solid ${selectedPrep && name.trim() && algorithm ? "var(--success)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "8px 12px", textAlign: "center" }}>
                                <span style={{ fontSize: "12px", color: selectedPrep && name.trim() && algorithm ? "var(--success)" : "var(--text-muted)", fontWeight: "500" }}>
                                    {selectedPrep && name.trim() && algorithm ? "✓ Siap untuk training" : "Lengkapi semua konfigurasi"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}