import { useState, useEffect, useRef } from "react";
import { getExperimentStatus } from "../../api/experimentsApi";
import {
    RiCheckboxCircleLine, RiErrorWarningLine, RiPulseLine,
    RiTimeLine, RiArrowLeftLine, RiFlaskLine,
} from "react-icons/ri";

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

const LOG_MESSAGES = {
    10: "🔄 Menginisialisasi training job...",
    25: "📂 Membaca hasil preprocessing...",
    40: "⚙️ Menyiapkan konfigurasi model...",
    55: "🧠 Melatih model dengan data training...",
    90: "📊 Menghitung metrik evaluasi...",
    100: "✅ Training selesai!",
};

export default function MonitoringPage({ experimentId, experimentName, onBack }) {
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef(null);
    const timerRef = useRef(null);
    const lastProgress = useRef(0);
    const logEndRef = useRef(null);


    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const addLog = (message) => {
        const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLogs((prev) => [...prev, { time, message }]);
    };

    useEffect(() => {
        if (!experimentId) return;

        addLog("🚀 Training dimulai, menunggu server...");

        // Timer elapsed
        timerRef.current = setInterval(() => {
            setElapsed((p) => p + 1);
        }, 1000);

        // Polling setiap 2 detik
        intervalRef.current = setInterval(async () => {
            try {
                const res = await getExperimentStatus(experimentId);
                const data = res.data.data;
                setStatus(data);

                // Tambah log berdasarkan progress
                const progress = data.progress || 0;
                if (progress > lastProgress.current) {
                    const message = LOG_MESSAGES[progress];
                    if (message) addLog(message);
                    lastProgress.current = progress;
                }

                if (data.status === "completed") {
                    clearInterval(intervalRef.current);
                    clearInterval(timerRef.current);
                    addLog("🎉 Model berhasil disimpan dan siap digunakan");
                } else if (data.status === "failed") {
                    clearInterval(intervalRef.current);
                    clearInterval(timerRef.current);
                    addLog(`❌ Training gagal: ${data.error_message || "Unknown error"}`);
                }
            } catch {
                addLog("⚠️ Gagal mengambil status, mencoba lagi...");
            }
        }, 2000);

        return () => {
            clearInterval(intervalRef.current);
            clearInterval(timerRef.current);
        };
    }, [experimentId]);

    // Auto scroll log ke bawah
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const isCompleted = status?.status === "completed";
    const isFailed = status?.status === "failed";
    const isRunning = status?.status === "running" || status?.status === "queued";
    const progress = status?.progress || 0;

    const progressColor = isCompleted ? "var(--success)" : isFailed ? "var(--danger)" : "var(--info)";

    const metrics = status?.metrics || {};
    const metricEntries = Object.entries(metrics).filter(
        ([k, v]) => typeof v === "number" && k !== "confusion_matrix"
    );

    return (
        <div style={{ maxWidth: "800px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <button onClick={onBack}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                    <RiArrowLeftLine size={14} /> Kembali
                </button>
                <div>
                    <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>Monitoring Training</h1>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{experimentName}</p>
                </div>
            </div>

            {/* Status card */}
            <div style={{ background: "var(--bg-surface)", border: `0.5px solid ${progressColor}`, borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {isCompleted && <RiCheckboxCircleLine size={20} style={{ color: "var(--success)" }} />}
                        {isFailed && <RiErrorWarningLine size={20} style={{ color: "var(--danger)" }} />}
                        {isRunning && <RiPulseLine size={20} style={{ color: "var(--info)" }} />}
                        {!status && <RiTimeLine size={20} style={{ color: "var(--text-muted)" }} />}
                        <span style={{ fontSize: "16px", fontWeight: "600", color: progressColor }}>
                            {isCompleted ? "Training Selesai!" : isFailed ? "Training Gagal" : isRunning ? "Sedang Berjalan..." : "Menunggu..."}
                        </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "28px", fontWeight: "700", color: progressColor }}>{progress}%</span>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Waktu: {formatTime(elapsed)}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: "var(--bg-elevated)", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "12px" }}>
                    <div style={{
                        width: `${progress}%`, height: "100%",
                        background: progressColor,
                        borderRadius: "999px",
                        transition: "width 0.6s ease",
                    }} />
                </div>

                {/* Info eksperimen */}
                {status && (
                    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                        {[
                            { label: "Tipe Data", value: status.data_type || "-" },
                            { label: "Task Type", value: status.task_type || "-" },
                            { label: "Algoritma", value: ALG_LABELS[status.algorithm] || status.algorithm || "-" },
                        ].map((item, i) => (
                            <div key={i}>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>{item.label}</p>
                                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Hasil metrik — muncul setelah selesai */}
            {isCompleted && metricEntries.length > 0 && (
                <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--success)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>Metrik Evaluasi</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "14px" }}>
                        {metricEntries.map(([key, val]) => (
                            <div key={key} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "14px" }}>
                                <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.3px" }}>{key}</p>
                                <p style={{ fontSize: "22px", fontWeight: "700", color: "var(--success)" }}>
                                    {val <= 1 ? `${(val * 100).toFixed(1)}%` : val.toFixed(4)}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Confusion matrix */}
                    {metrics.confusion_matrix && (
                        <div>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>Confusion Matrix</p>
                            <table style={{ borderCollapse: "collapse", fontSize: "12px" }}>
                                <tbody>
                                    {metrics.confusion_matrix.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => (
                                                <td key={j} style={{ width: "44px", height: "44px", textAlign: "center", fontWeight: "500", borderRadius: "4px", background: i === j ? "var(--success-dim)" : "var(--bg-elevated)", color: i === j ? "var(--success)" : "var(--text-secondary)", border: "2px solid var(--bg-base)" }}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button onClick={onBack}
                        style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "var(--success)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                        <RiFlaskLine size={15} /> Lihat Semua Eksperimen
                    </button>
                </div>
            )}

            {/* Error detail */}
            {isFailed && status?.error_message && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: "16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--danger)", marginBottom: "6px" }}>Detail Error</p>
                    <p style={{ fontSize: "12px", color: "var(--danger)", opacity: 0.8, fontFamily: "monospace" }}>{status.error_message}</p>
                </div>
            )}

            {/* Log aktivitas */}
            <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", background: "var(--bg-elevated)" }}>
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Log Aktivitas
                    </p>
                </div>
                <div style={{ padding: "12px 16px", maxHeight: "200px", overflowY: "auto", fontFamily: "monospace" }}>
                    {logs.map((log, i) => (
                        <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "6px", fontSize: "12px" }}>
                            <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{log.time}</span>
                            <span style={{ color: log.message.includes("❌") ? "var(--danger)" : log.message.includes("✅") || log.message.includes("🎉") ? "var(--success)" : "var(--text-secondary)" }}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>
        </div>
    );
}