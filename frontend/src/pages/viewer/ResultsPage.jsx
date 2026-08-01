import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useState, useEffect } from "react";
import { getExperiments, getExperimentResult, downloadModel } from "../../api/experimentsApi";
import {
    RiCheckboxCircleLine, RiErrorWarningLine, RiTimeLine, RiPulseLine,
    RiDownload2Line, RiBarChartLine, RiRefreshLine, RiFileLine,
    RiImageLine, RiFileTextLine, RiInformationLine, RiCloseLine,
    RiEqualizerLine,
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

const TYPE_CONFIG = {
    tabular: { icon: RiFileLine, color: "var(--role-data_engineer)", label: "Tabular" },
    image: { icon: RiImageLine, color: "var(--role-data_scientist)", label: "Gambar" },
    text: { icon: RiFileTextLine, color: "var(--role-ml_engineer)", label: "Teks" },
};

const METRIC_LABELS = {
    accuracy: "Accuracy",
    precision: "Precision",
    recall: "Recall",
    f1_score: "F1 Score",
    r2_score: "R² Score",
    mse: "MSE",
    rmse: "RMSE",
    mae: "MAE",
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ exp, onClose }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!exp || exp.status !== "completed") { setLoading(false); return; }
        getExperimentResult(exp.experiment_id)
            .then((res) => setResult(res.data.data))
            .catch(() => setError("Gagal memuat hasil"))
            .finally(() => setLoading(false));
    }, [exp]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await downloadModel(exp.experiment_id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${exp.name}.pkl`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            setError("Gagal mengunduh model");
        } finally {
            setDownloading(false);
        }
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const { default: jsPDF } = await import("jspdf");
            const metrics = result?.metrics || {};
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const W = 210;
            const margin = 20;
            let y = margin;

            // Header background
            pdf.setFillColor(30, 30, 46);
            pdf.rect(0, 0, W, 40, "F");

            // Judul
            pdf.setTextColor(124, 106, 247);
            pdf.setFontSize(20);
            pdf.setFont("helvetica", "bold");
            pdf.text("AutoML Platform", margin, 18);

            pdf.setTextColor(194, 192, 182);
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "normal");
            pdf.text("Laporan Hasil Training", margin, 28);

            pdf.setTextColor(85, 85, 112);
            pdf.setFontSize(9);
            pdf.text(
                `Digenerate: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
                W - margin - 65, 28
            );

            y = 55;

            // Nama eksperimen
            pdf.setTextColor(226, 224, 255);
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            pdf.text(exp.name, margin, y);
            y += 8;

            // Garis
            pdf.setDrawColor(42, 42, 56);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, W - margin, y);
            y += 10;

            const writeRow = (label, value) => {
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(133, 133, 160);
                pdf.text(label, margin, y);
                pdf.setTextColor(226, 224, 255);
                pdf.setFont("helvetica", "bold");
                pdf.text(String(value), margin + 50, y);
                y += 7;
            };

            // Konfigurasi
            pdf.setTextColor(124, 106, 247);
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.text("KONFIGURASI", margin, y);
            y += 8;

            writeRow("Tipe Data", TYPE_CONFIG[exp.data_type]?.label || exp.data_type);
            writeRow("Task Type", exp.task_type || "-");
            writeRow("Algoritma", ALG_LABELS[exp.algorithm] || exp.algorithm || "-");
            writeRow("Status", STATUS_CONFIG[exp.status]?.label || exp.status);

            y += 4;
            pdf.setDrawColor(42, 42, 56);
            pdf.line(margin, y, W - margin, y);
            y += 10;

            // Metrik
            const metricEntries = Object.entries(metrics).filter(
                ([k, v]) => typeof v === "number" && k !== "confusion_matrix"
            );

            if (metricEntries.length > 0) {
                pdf.setTextColor(124, 106, 247);
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                pdf.text("METRIK EVALUASI", margin, y);
                y += 8;

                const colW = (W - margin * 2 - 10) / 2;
                let col = 0;
                let rowY = y;

                metricEntries.forEach(([key, val], idx) => {
                    const formatted = val <= 1 ? `${(val * 100).toFixed(2)}%` : val.toFixed(4);
                    const label = METRIC_LABELS[key] || key;
                    const x = margin + col * (colW + 10);

                    pdf.setFillColor(22, 22, 30);
                    pdf.roundedRect(x, rowY - 4, colW, 16, 2, 2, "F");

                    pdf.setTextColor(133, 133, 160);
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "normal");
                    pdf.text(label.toUpperCase(), x + 4, rowY + 2);

                    pdf.setTextColor(78, 203, 113);
                    pdf.setFontSize(13);
                    pdf.setFont("helvetica", "bold");
                    pdf.text(formatted, x + 4, rowY + 11);

                    col++;
                    if (col >= 2) { col = 0; rowY += 20; }
                });

                y = rowY + (col > 0 ? 20 : 0) + 6;
            }

            // Confusion matrix
            if (metrics.confusion_matrix) {
                pdf.setDrawColor(42, 42, 56);
                pdf.line(margin, y, W - margin, y);
                y += 10;

                pdf.setTextColor(124, 106, 247);
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                pdf.text("CONFUSION MATRIX", margin, y);
                y += 6;

                pdf.setTextColor(133, 133, 160);
                pdf.setFontSize(8);
                pdf.setFont("helvetica", "normal");
                pdf.text("Diagonal = prediksi benar · Luar diagonal = prediksi salah", margin, y);
                y += 8;

                const cm = metrics.confusion_matrix;
                const cellSize = 20;

                cm.forEach((row, i) => {
                    row.forEach((cell, j) => {
                        const cellX = margin + j * cellSize;
                        const cellY = y + i * cellSize;

                        pdf.setFillColor(i === j ? 42 : 22, i === j ? 37 : 22, i === j ? 69 : 30);
                        pdf.roundedRect(cellX, cellY - 4, cellSize - 2, cellSize - 2, 1, 1, "F");

                        pdf.setTextColor(i === j ? 124 : 136, i === j ? 106 : 136, i === j ? 247 : 160);
                        pdf.setFontSize(12);
                        pdf.setFont("helvetica", "bold");
                        const cellStr = String(cell);
                        pdf.text(cellStr, cellX + (cellSize - 2) / 2 - (cellStr.length * 1.8), cellY + 6);
                    });
                });

                y += cm.length * cellSize + 10;
            }

            // Footer
            const pageH = 297;
            pdf.setFillColor(22, 22, 30);
            pdf.rect(0, pageH - 18, W, 18, "F");
            pdf.setTextColor(85, 85, 112);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.text("AutoML Platform  ·  Laporan ini digenerate secara otomatis", margin, pageH - 7);
            pdf.text(`ID Eksperimen: #${exp.experiment_id}`, W - margin - 42, pageH - 7);

            pdf.save(`laporan_${exp.name.replace(/\s+/g, "_")}.pdf`);
        } catch (err) {
            setError("Gagal export PDF: " + err.message);
        } finally {
            setExporting(false);
        }
    };

    const metrics = result?.metrics || {};
    const metricEntries = Object.entries(metrics).filter(([k, v]) => typeof v === "number" && k !== "confusion_matrix");
    const typeConfig = TYPE_CONFIG[exp.data_type] || TYPE_CONFIG.tabular;
    const s = STATUS_CONFIG[exp.status] || STATUS_CONFIG.queued;

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <RiInformationLine size={14} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detail Hasil</p>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                    <RiCloseLine size={16} />
                </button>
            </div>

            <div style={{ padding: "16px" }}>
                <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>{exp.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ background: s.bg, border: `0.5px solid ${s.color}`, borderRadius: "999px", padding: "3px 10px" }}>
                            <span style={{ fontSize: "11px", color: s.color, fontWeight: "500" }}>{s.label}</span>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>ID #{exp.experiment_id}</span>
                    </div>
                </div>

                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px", marginBottom: "12px" }}>
                    <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Konfigurasi</p>
                    {[
                        { label: "Tipe Data", value: typeConfig.label },
                        { label: "Task Type", value: exp.task_type || "-" },
                        { label: "Algoritma", value: ALG_LABELS[exp.algorithm] || exp.algorithm || "-" },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "500" }}>{item.value}</span>
                        </div>
                    ))}
                </div>

                {exp.status === "completed" && (
                    <>
                        {loading && <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "12px" }}>Memuat hasil...</p>}

                        {!loading && error && (
                            <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "10px", borderRadius: "var(--radius)", fontSize: "12px", marginBottom: "12px" }}>
                                {error}
                            </div>
                        )}

                        {!loading && metricEntries.length > 0 && (
                            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px", marginBottom: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                                    <RiBarChartLine size={13} style={{ color: "var(--accent)" }} />
                                    <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Metrik Evaluasi</p>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                    {metricEntries.map(([key, val]) => (
                                        <div key={key} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", padding: "10px" }}>
                                            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>{key}</p>
                                            <p style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
                                                {val <= 1 ? `${(val * 100).toFixed(1)}%` : val.toFixed(4)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!loading && metrics.confusion_matrix && (
                            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px", marginBottom: "12px" }}>
                                <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Confusion Matrix</p>
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ borderCollapse: "collapse", fontSize: "12px" }}>
                                        <tbody>
                                            {metrics.confusion_matrix.map((row, i) => (
                                                <tr key={i}>
                                                    {row.map((cell, j) => (
                                                        <td key={j} style={{ width: "44px", height: "44px", textAlign: "center", fontWeight: "500", borderRadius: "4px", background: i === j ? "var(--accent-dim)" : "var(--bg-surface)", color: i === j ? "var(--accent)" : "var(--text-secondary)", border: "2px solid var(--bg-base)" }}>
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>Diagonal = prediksi benar · Luar diagonal = prediksi salah</p>
                            </div>
                        )}

                        {!loading && result && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {/* Export PDF */}
                                <button onClick={handleExportPDF} disabled={exporting}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "10px", background: exporting ? "var(--bg-elevated)" : "var(--bg-elevated)", color: exporting ? "var(--text-muted)" : "var(--text-secondary)", border: "0.5px solid var(--border-strong)", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: exporting ? "not-allowed" : "pointer" }}>
                                    📄 {exporting ? "Mengexport..." : "Export Laporan PDF"}
                                </button>

                                {/* Download model */}
                                <button onClick={handleDownload} disabled={downloading}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "10px", background: downloading ? "var(--bg-elevated)" : "var(--accent)", color: downloading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: downloading ? "not-allowed" : "pointer" }}>
                                    <RiDownload2Line size={15} />
                                    {downloading ? "Mengunduh..." : "Download Model (.pkl)"}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {exp.status === "failed" && (
                    <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", borderRadius: "var(--radius)", padding: "12px", fontSize: "12px", color: "var(--danger)" }}>
                        <p style={{ fontWeight: "500", marginBottom: "4px" }}>Training Gagal</p>
                        <p style={{ opacity: 0.8 }}>{exp.error_message || "Tidak ada pesan error"}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Comparison Panel ──────────────────────────────────────────────────────────
function ComparisonPanel({ experiments, onClose }) {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const completed = experiments.filter((e) => e.status === "completed");
        Promise.all(
            completed.map((e) =>
                getExperimentResult(e.experiment_id)
                    .then((res) => ({ id: e.experiment_id, data: res.data.data }))
                    .catch(() => ({ id: e.experiment_id, data: null }))
            )
        ).then((all) => {
            const map = {};
            all.forEach(({ id, data }) => { map[id] = data; });
            setResults(map);
        }).finally(() => setLoading(false));
    }, [experiments]);

    // Kumpulkan semua metrik yang ada
    const allMetricKeys = [...new Set(
        Object.values(results)
            .filter(Boolean)
            .flatMap((r) => Object.keys(r.metrics || {}).filter((k) => k !== "confusion_matrix" && typeof r.metrics[k] === "number"))
    )];

    // Cari eksperimen dengan nilai terbaik per metrik
    const getBest = (key) => {
        const higherIsBetter = ["accuracy", "precision", "recall", "f1_score", "r2_score"];
        let bestId = null;
        let bestVal = higherIsBetter.includes(key) ? -Infinity : Infinity;

        experiments.forEach((e) => {
            const val = results[e.experiment_id]?.metrics?.[key];
            if (val === undefined) return;
            if (higherIsBetter.includes(key) ? val > bestVal : val < bestVal) {
                bestVal = val;
                bestId = e.experiment_id;
            }
        });
        return bestId;
    };

    const COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--info)", "#a78bfa", "#f472b6"];

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginTop: "16px" }}>
            <div style={{ padding: "12px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--accent-dim)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <RiEqualizerLine size={15} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Perbandingan {experiments.length} Eksperimen
                    </p>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", display: "flex" }}>
                    <RiCloseLine size={16} />
                </button>
            </div>

            {loading ? (
                <div style={{ padding: "32px", textAlign: "center" }}>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Memuat data perbandingan...</p>
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr>
                                <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500", background: "var(--bg-elevated)", borderBottom: "0.5px solid var(--border)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", minWidth: "120px" }}>
                                    Metrik
                                </th>
                                {experiments.map((exp, i) => (
                                    <th key={exp.experiment_id} style={{ padding: "12px 16px", textAlign: "center", background: "var(--bg-elevated)", borderBottom: "0.5px solid var(--border)", minWidth: "160px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                                            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>{exp.name}</span>
                                            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                                {ALG_LABELS[exp.algorithm] || exp.algorithm}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Baris info */}
                            {[
                                { label: "Tipe Data", key: "data_type", format: (e) => TYPE_CONFIG[e.data_type]?.label || e.data_type },
                                { label: "Task Type", key: "task_type", format: (e) => e.task_type || "-" },
                                { label: "Status", key: "status", format: (e) => STATUS_CONFIG[e.status]?.label || e.status },
                            ].map((row, ri) => (
                                <tr key={ri} style={{ borderBottom: "0.5px solid var(--border)" }}>
                                    <td style={{ padding: "10px 16px", color: "var(--text-muted)", fontSize: "12px", background: "var(--bg-elevated)", fontWeight: "500" }}>
                                        {row.label}
                                    </td>
                                    {experiments.map((exp) => (
                                        <td key={exp.experiment_id} style={{ padding: "10px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "12px" }}>
                                            {row.format(exp)}
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {/* Divider */}
                            <tr>
                                <td colSpan={experiments.length + 1} style={{ padding: "6px 16px", background: "var(--bg-elevated)", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: "500" }}>
                                    Metrik Evaluasi
                                </td>
                            </tr>

                            {/* Baris metrik */}
                            {allMetricKeys.map((key) => {
                                const bestId = getBest(key);
                                return (
                                    <tr key={key} style={{ borderBottom: "0.5px solid var(--border)" }}>
                                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px", background: "var(--bg-elevated)", fontWeight: "500" }}>
                                            {METRIC_LABELS[key] || key}
                                        </td>
                                        {experiments.map((exp, i) => {
                                            const val = results[exp.experiment_id]?.metrics?.[key];
                                            const isBest = exp.experiment_id === bestId;
                                            const expColor = COLORS[i % COLORS.length];

                                            return (
                                                <td key={exp.experiment_id} style={{ padding: "12px 16px", textAlign: "center" }}>
                                                    {val !== undefined ? (
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                                            <span style={{ fontSize: "18px", fontWeight: "700", color: isBest ? expColor : "var(--text-primary)" }}>
                                                                {val <= 1 ? `${(val * 100).toFixed(1)}%` : val.toFixed(4)}
                                                            </span>
                                                            {isBest && (
                                                                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", background: `${expColor}20`, color: expColor, border: `0.5px solid ${expColor}`, fontWeight: "500" }}>
                                                                    🏆 Terbaik
                                                                </span>
                                                            )}
                                                            {/* Bar visual */}
                                                            <div style={{ width: "80px", background: "var(--bg-elevated)", borderRadius: "999px", height: "4px", overflow: "hidden" }}>
                                                                <div style={{ width: `${Math.min(Math.abs(val) * 100, 100)}%`, height: "100%", background: isBest ? expColor : "var(--border-strong)", borderRadius: "999px" }} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend */}
            <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--border)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                {experiments.map((exp, i) => (
                    <div key={exp.experiment_id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{exp.name}</span>
                    </div>
                ))}
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>🏆 = nilai terbaik per metrik</span>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ResultsPage() {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [selectedExp, setSelectedExp] = useState(null);
    const [compareList, setCompareList] = useState([]);
    const [showCompare, setShowCompare] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    const fetchExperiments = () => {
        setLoading(true);
        getExperiments()
            .then((res) => setExperiments(res.data.data))
            .catch(() => setError("Gagal memuat hasil training"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchExperiments(); }, []);

    const filtered = experiments.filter((e) => {
        const matchStatus = filter === "all" || e.status === filter;
        const matchType = typeFilter === "all" || e.data_type === typeFilter;
        const matchSearch = search === "" ||
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.algorithm?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchType && matchSearch;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginatedExp = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const completedExps = experiments.filter((e) => e.status === "completed");

    const toggleCompare = (exp) => {
        if (exp.status !== "completed") return;
        setCompareList((prev) => {
            const exists = prev.find((e) => e.experiment_id === exp.experiment_id);
            if (exists) return prev.filter((e) => e.experiment_id !== exp.experiment_id);
            if (prev.length >= 5) return prev;
            return [...prev, exp];
        });
        setShowCompare(false);
        setSelectedExp(null);
    };

    const isInCompare = (exp) => compareList.some((e) => e.experiment_id === exp.experiment_id);

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
                    <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Hasil Training</h1>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Lihat hasil evaluasi dan download model</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    {compareList.length >= 2 && (
                        <button onClick={() => { setShowCompare(true); setSelectedExp(null); }}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                            <RiEqualizerLine size={15} /> Bandingkan ({compareList.length})
                        </button>
                    )}
                    <button onClick={fetchExperiments}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                        <RiRefreshLine size={15} /> Refresh
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

            {/* Compare bar */}
            {compareList.length > 0 && (
                <div style={{ background: "var(--accent-dim)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius-lg)", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <RiEqualizerLine size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "500" }}>
                        {compareList.length} eksperimen dipilih:
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
                        {compareList.map((exp) => (
                            <span key={exp.experiment_id} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "999px", background: "var(--accent)", color: "#fff", fontSize: "11px", fontWeight: "500" }}>
                                {exp.name}
                                <button onClick={() => toggleCompare(exp)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 0, marginLeft: "2px" }}>
                                    <RiCloseLine size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                    {compareList.length >= 2 && (
                        <button onClick={() => { setShowCompare(true); setSelectedExp(null); }}
                            style={{ padding: "6px 14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", cursor: "pointer", flexShrink: 0 }}>
                            Tampilkan Perbandingan
                        </button>
                    )}
                    <button onClick={() => { setCompareList([]); setShowCompare(false); }}
                        style={{ padding: "6px 12px", background: "none", color: "var(--accent)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer", flexShrink: 0 }}>
                        Reset
                    </button>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: selectedExp && !showCompare ? "1fr 360px" : "1fr", gap: "20px", alignItems: "start" }}>
                {/* Kiri — list */}
                <div>
                    {/* Search */}
                    <div style={{ marginBottom: "12px" }}>
                        <input type="text" value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="🔍 Cari nama eksperimen atau algoritma..."
                            style={{ width: "100%", padding: "9px 14px", borderRadius: "var(--radius)", fontSize: "13px" }}
                        />
                    </div>

                    {/* Filter status */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>Status:</span>
                        {[
                            { value: "all", label: "Semua" },
                            { value: "completed", label: "Selesai" },
                            { value: "running", label: "Berjalan" },
                            { value: "failed", label: "Gagal" },
                        ].map((f) => (
                            <button key={f.value} onClick={() => { setFilter(f.value); setCurrentPage(1); }}
                                style={{ padding: "5px 12px", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", border: `0.5px solid ${filter === f.value ? "var(--accent)" : "var(--border-strong)"}`, background: filter === f.value ? "var(--accent-dim)" : "var(--bg-elevated)", color: filter === f.value ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer" }}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter tipe */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>Tipe:</span>
                        {[
                            { value: "all", label: "Semua", color: "var(--text-secondary)" },
                            { value: "tabular", label: "Tabular", color: "var(--role-data_engineer)" },
                            { value: "image", label: "Gambar", color: "var(--role-data_scientist)" },
                            { value: "text", label: "Teks", color: "var(--role-ml_engineer)" },
                        ].map((f) => (
                            <button key={f.value} onClick={() => { setTypeFilter(f.value); setCurrentPage(1); }}
                                style={{ padding: "5px 12px", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", border: `0.5px solid ${typeFilter === f.value ? f.color : "var(--border-strong)"}`, background: typeFilter === f.value ? `${f.color}20` : "var(--bg-elevated)", color: typeFilter === f.value ? f.color : "var(--text-secondary)", cursor: "pointer" }}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Info compare */}
                    {completedExps.length >= 2 && compareList.length === 0 && (
                        <div style={{ background: "var(--info-dim)", border: "0.5px solid var(--info)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "var(--info)" }}>
                            💡 Klik tombol <strong>+ Bandingkan</strong> di eksperimen yang selesai untuk membandingkan hasil antar model
                        </div>
                    )}

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
                            <RiBarChartLine size={32} style={{ color: "var(--text-muted)", marginBottom: "10px" }} />
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>Belum ada hasil training</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {experiments.length > 0 ? "Coba ubah filter" : "Tunggu ML Engineer menyelesaikan training"}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {paginatedExp.map((exp) => {
                                    const s = STATUS_CONFIG[exp.status] || STATUS_CONFIG.queued;
                                    const StatusIcon = s.icon;
                                    const typeConfig = TYPE_CONFIG[exp.data_type] || TYPE_CONFIG.tabular;
                                    const isSelected = selectedExp?.experiment_id === exp.experiment_id;
                                    const inCompare = isInCompare(exp);

                                    return (
                                        <div key={exp.experiment_id}
                                            style={{ background: isSelected ? "var(--accent-dim)" : inCompare ? "var(--success-dim)" : "var(--bg-surface)", border: `0.5px solid ${isSelected ? "var(--accent)" : inCompare ? "var(--success)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.15s" }}>

                                            <div onClick={() => { setSelectedExp(isSelected ? null : exp); setShowCompare(false); }}
                                                style={{ width: "38px", height: "38px", borderRadius: "var(--radius)", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                                                <StatusIcon size={18} style={{ color: s.color }} />
                                            </div>

                                            <div onClick={() => { setSelectedExp(isSelected ? null : exp); setShowCompare(false); }}
                                                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                    <p style={{ fontSize: "14px", fontWeight: "500", color: isSelected ? "var(--accent)" : inCompare ? "var(--success)" : "var(--text-primary)" }}>{exp.name}</p>
                                                    <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: "500", background: `${typeConfig.color}20`, color: typeConfig.color, border: `0.5px solid ${typeConfig.color}` }}>
                                                        {typeConfig.label}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                                    {ALG_LABELS[exp.algorithm] || exp.algorithm} · {exp.task_type}
                                                </p>
                                                {exp.status === "completed" && exp.metrics && (
                                                    <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                                                        {exp.metrics.accuracy !== undefined && <span style={{ fontSize: "11px", color: "var(--success)" }}>Accuracy: {(exp.metrics.accuracy * 100).toFixed(1)}%</span>}
                                                        {exp.metrics.r2_score !== undefined && <span style={{ fontSize: "11px", color: "var(--success)" }}>R²: {(exp.metrics.r2_score * 100).toFixed(1)}%</span>}
                                                        {exp.metrics.f1_score !== undefined && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>F1: {(exp.metrics.f1_score * 100).toFixed(1)}%</span>}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                                <div style={{ background: s.bg, border: `0.5px solid ${s.color}`, borderRadius: "999px", padding: "4px 12px" }}>
                                                    <span style={{ fontSize: "11px", color: s.color, fontWeight: "500" }}>{s.label}</span>
                                                </div>
                                                {exp.status === "completed" && (
                                                    <button onClick={() => toggleCompare(exp)}
                                                        style={{ padding: "6px 12px", background: inCompare ? "var(--success-dim)" : "var(--bg-elevated)", color: inCompare ? "var(--success)" : "var(--text-secondary)", border: `0.5px solid ${inCompare ? "var(--success)" : "var(--border-strong)"}`, borderRadius: "var(--radius)", fontSize: "11px", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap" }}>
                                                        {inCompare ? "✓ Dipilih" : "+ Bandingkan"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
                                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        style={{ padding: "6px 14px", background: "var(--bg-elevated)", color: currentPage === 1 ? "var(--text-muted)" : "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>
                                        ← Prev
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button key={page} onClick={() => setCurrentPage(page)}
                                            style={{ width: "32px", height: "32px", background: currentPage === page ? "var(--accent)" : "var(--bg-elevated)", color: currentPage === page ? "#fff" : "var(--text-secondary)", border: `0.5px solid ${currentPage === page ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", fontSize: "12px", cursor: "pointer" }}>
                                            {page}
                                        </button>
                                    ))}
                                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                        style={{ padding: "6px 14px", background: "var(--bg-elevated)", color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>
                                        Next →
                                    </button>
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                        {filtered.length} eksperimen · Halaman {currentPage} dari {totalPages}
                                    </span>
                                </div>
                            )}

                            {/* Comparison panel */}
                            {showCompare && compareList.length >= 2 && (
                                <ComparisonPanel
                                    experiments={compareList}
                                    onClose={() => setShowCompare(false)}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Kanan — detail panel */}
                {selectedExp && !showCompare && (
                    <div style={{ position: "sticky", top: "24px" }}>
                        <DetailPanel exp={selectedExp} onClose={() => setSelectedExp(null)} />
                    </div>
                )}

                {/* Placeholder kanan saat tidak ada yang dipilih */}
                {!selectedExp && !showCompare && (
                    <div style={{ position: "sticky", top: "24px" }}>
                        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", textAlign: "center" }}>
                            <RiInformationLine size={28} style={{ color: "var(--text-muted)", marginBottom: "10px" }} />
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>Pilih eksperimen</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                Klik eksperimen untuk melihat detail atau klik "+ Bandingkan" untuk membandingkan hasil
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}