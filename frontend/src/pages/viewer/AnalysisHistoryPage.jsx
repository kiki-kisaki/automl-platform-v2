import { useState, useEffect } from "react";
import { getAnalyses, getAnalysisById } from "../../api/analysisApi";
import {
    RiFlaskLine, RiRefreshLine, RiCheckboxCircleLine,
    RiErrorWarningLine, RiTimeLine, RiPulseLine,
    RiCloseLine, RiDownload2Line, RiInformationLine,
    RiEqualizerLine,
} from "react-icons/ri";

const STATUS_CONFIG = {
    pending: { color: "var(--text-muted)", bg: "var(--bg-elevated)", icon: RiTimeLine, label: "Menunggu" },
    running: { color: "var(--info)", bg: "var(--info-dim)", icon: RiPulseLine, label: "Berjalan" },
    completed: { color: "var(--success)", bg: "var(--success-dim)", icon: RiCheckboxCircleLine, label: "Selesai" },
    failed: { color: "var(--danger)", bg: "var(--danger-dim)", icon: RiErrorWarningLine, label: "Gagal" },
};

const COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--info)", "#a78bfa"];

// ── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ analysis, onClose }) {
    const handleExport = async () => {
        if (!analysis?.results?.length) return;
        const { Document, Packer, Paragraph, Table, TableRow, TableCell,
            TextRun, WidthType, ShadingType, AlignmentType } = await import("docx");
        const WHITE = "FFFFFF";
        const DARK = "1A1A2E";
        const headerRow = new TableRow({
            children: ["#", "Verbatim", "Coding", "Analisis"].map((h) =>
                new TableCell({
                    width: { size: h === "#" ? 400 : h === "Verbatim" ? 2500 : h === "Coding" ? 2000 : 4100, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: "2B2B2B" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20 })] })],
                })
            ),
        });
        const dataRows = analysis.results.map((row, i) =>
            new TableRow({
                children: [
                    new TableCell({ width: { size: 400, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i + 1), bold: true, color: DARK, size: 20 })] })] }),
                    new TableCell({ width: { size: 2500, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE }, children: [new Paragraph({ children: [new TextRun({ text: row.verbatim || "-", size: 20, color: DARK })] })] }),
                    new TableCell({ width: { size: 2000, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE }, children: [new Paragraph({ children: [new TextRun({ text: row.coding || "-", size: 20, color: DARK, bold: true })] })] }),
                    new TableCell({ width: { size: 4100, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE }, children: [new Paragraph({ children: [new TextRun({ text: row.analisis || "-", size: 20, color: DARK })] })] }),
                ],
            })
        );
        const doc = new Document({
            numbering: { config: [] },
            sections: [{
                properties: {},
                children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "Laporan Analisis LLM", bold: true, size: 36, color: DARK })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: `Dataset: ${analysis.dataset_new_name}  ·  Model: ${analysis.model_name}`, size: 22, color: "555570" })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [new TextRun({ text: `${analysis.results.length} segmen  ·  ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, size: 20, color: "888888" })] }),
                    new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: [400, 2500, 2000, 4100], rows: [headerRow, ...dataRows] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 100 }, children: [new TextRun({ text: "Dokumen ini digenerate otomatis oleh AutoML Platform", size: 18, color: "AAAAAA", italics: true })] }),
                ],
            }],
        });
        const buffer = await Packer.toBlob(doc);
        const url = URL.createObjectURL(buffer);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `analisis_${analysis.dataset_new_name}_${analysis.model_name}.docx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const rouge = analysis.rouge_scores || {};

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <RiInformationLine size={14} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detail Analisis</p>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                    <RiCloseLine size={16} />
                </button>
            </div>

            <div style={{ padding: "16px" }}>
                {/* Info */}
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px", marginBottom: "12px" }}>
                    <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Informasi</p>
                    {[
                        { label: "Dataset Baru", value: analysis.dataset_new_name },
                        { label: "Dataset Referensi", value: analysis.dataset_reference_name },
                        { label: "Model", value: analysis.model_name },
                        { label: "Total Segmen", value: `${analysis.results?.length || 0} segmen` },
                        { label: "Waktu Generate", value: `${analysis.generate_time || 0}s` },
                        { label: "Rata-rata Kata", value: `${analysis.avg_length || 0} kata` },
                        { label: "Dibuat", value: new Date(analysis.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>{item.value}</span>
                        </div>
                    ))}
                </div>

                {/* ROUGE Scores */}
                {Object.keys(rouge).length > 0 && (
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px", marginBottom: "12px" }}>
                        <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>ROUGE Score</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                            {[
                                { label: "ROUGE-1", value: rouge.rouge1 },
                                { label: "ROUGE-2", value: rouge.rouge2 },
                                { label: "ROUGE-L", value: rouge.rougeL },
                            ].map((m, i) => (
                                <div key={i} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
                                    <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "3px" }}>{m.label}</p>
                                    <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--accent)" }}>
                                        {m.value !== undefined ? `${(m.value * 100).toFixed(1)}%` : "-"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Preview */}
                {analysis.results?.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                        <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                            Preview (2 dari {analysis.results.length} segmen)
                        </p>
                        {analysis.results.slice(0, 2).map((row, i) => (
                            <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "10px 12px", marginBottom: "8px", borderLeft: "2px solid var(--accent)" }}>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Verbatim</p>
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", lineHeight: "1.4" }}>{row.verbatim}</p>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Coding</p>
                                <p style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "500", marginBottom: "6px" }}>{row.coding}</p>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Analisis</p>
                                <p style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: "1.5" }}>{row.analisis}</p>
                            </div>
                        ))}
                    </div>
                )}

                {analysis.results?.length > 0 && (
                    <button onClick={handleExport}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "10px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                        <RiDownload2Line size={15} /> Export Word (.docx)
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Comparison Panel ──────────────────────────────────────────────────────────
function ComparisonPanel({ analyses, onClose }) {
    const METRICS = [
        { key: "rouge1", label: "ROUGE-1", format: (v) => v !== undefined ? `${(v * 100).toFixed(1)}%` : "-", higherBetter: true },
        { key: "rouge2", label: "ROUGE-2", format: (v) => v !== undefined ? `${(v * 100).toFixed(1)}%` : "-", higherBetter: true },
        { key: "rougeL", label: "ROUGE-L", format: (v) => v !== undefined ? `${(v * 100).toFixed(1)}%` : "-", higherBetter: true },
        { key: "generate_time", label: "Waktu Generate", format: (v) => `${v}s`, higherBetter: false },
        { key: "avg_length", label: "Rata-rata Kata", format: (v) => `${v} kata`, higherBetter: true },
        { key: "total_results", label: "Total Segmen", format: (v) => `${v} segmen`, higherBetter: false },
    ];

    const getValue = (analysis, key) => {
        if (key === "rouge1") return analysis.rouge_scores?.rouge1;
        if (key === "rouge2") return analysis.rouge_scores?.rouge2;
        if (key === "rougeL") return analysis.rouge_scores?.rougeL;
        if (key === "generate_time") return analysis.generate_time;
        if (key === "avg_length") return analysis.avg_length;
        if (key === "total_results") return analysis.total_results;
        return undefined;
    };

    const getBest = (metric) => {
        let bestId = null;
        let bestVal = metric.higherBetter ? -Infinity : Infinity;
        analyses.forEach((a) => {
            const val = getValue(a, metric.key);
            if (val === undefined || val === null) return;
            if (metric.higherBetter ? val > bestVal : val < bestVal) {
                bestVal = val;
                bestId = a.analysis_id;
            }
        });
        return bestId;
    };

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginTop: "16px" }}>
            <div style={{ padding: "12px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--accent-dim)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <RiEqualizerLine size={15} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Perbandingan {analyses.length} Model LLM
                    </p>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", display: "flex" }}>
                    <RiCloseLine size={16} />
                </button>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                        <tr>
                            <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500", background: "var(--bg-elevated)", borderBottom: "0.5px solid var(--border)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", minWidth: "140px" }}>
                                Metrik
                            </th>
                            {analyses.map((a, i) => (
                                <th key={a.analysis_id} style={{ padding: "12px 16px", textAlign: "center", background: "var(--bg-elevated)", borderBottom: "0.5px solid var(--border)", minWidth: "160px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                                        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{a.model_name}</span>
                                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{a.dataset_new_name}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {METRICS.map((metric, mi) => {
                            const bestId = getBest(metric);
                            return (
                                <tr key={metric.key} style={{ borderBottom: "0.5px solid var(--border)" }}>
                                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px", background: "var(--bg-elevated)", fontWeight: "500" }}>
                                        {metric.label}
                                        {metric.higherBetter
                                            ? <span style={{ fontSize: "10px", color: "var(--success)", marginLeft: "4px" }}>↑</span>
                                            : <span style={{ fontSize: "10px", color: "var(--warning)", marginLeft: "4px" }}>↓</span>}
                                    </td>
                                    {analyses.map((a, i) => {
                                        const val = getValue(a, metric.key);
                                        const isBest = a.analysis_id === bestId;
                                        const expColor = COLORS[i % COLORS.length];
                                        return (
                                            <td key={a.analysis_id} style={{ padding: "12px 16px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                                    <span style={{ fontSize: "18px", fontWeight: "700", color: isBest ? expColor : "var(--text-primary)" }}>
                                                        {val !== undefined && val !== null ? metric.format(val) : "-"}
                                                    </span>
                                                    {isBest && val !== undefined && (
                                                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", background: `${expColor}20`, color: expColor, border: `0.5px solid ${expColor}`, fontWeight: "500" }}>
                                                            🏆 Terbaik
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--border)", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                {analyses.map((a, i) => (
                    <div key={a.analysis_id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{a.model_name}</span>
                    </div>
                ))}
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>
                    ↑ = lebih tinggi lebih baik · ↓ = lebih rendah lebih baik · 🏆 = terbaik
                </span>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AnalysisHistoryPage() {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [compareList, setCompareList] = useState([]);
    const [showCompare, setShowCompare] = useState(false);
    const [error, setError] = useState("");

    const fetchAnalyses = () => {
        setLoading(true);
        getAnalyses()
            .then((res) => setAnalyses(res.data.data || []))
            .catch(() => setError("Gagal memuat history analisis"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchAnalyses(); }, []);

    const handleSelect = async (analysis) => {
        if (selected?.analysis_id === analysis.analysis_id) {
            setSelected(null);
            return;
        }
        setShowCompare(false);
        if (analysis.status !== "completed") {
            setSelected({ ...analysis, results: [] });
            return;
        }
        setLoadingDetail(true);
        try {
            const res = await getAnalysisById(analysis.analysis_id);
            setSelected(res.data.data);
        } catch {
            setError("Gagal memuat detail analisis");
        } finally {
            setLoadingDetail(false);
        }
    };

    const toggleCompare = (analysis) => {
        if (analysis.status !== "completed") return;
        setCompareList((prev) => {
            const exists = prev.find((a) => a.analysis_id === analysis.analysis_id);
            if (exists) return prev.filter((a) => a.analysis_id !== analysis.analysis_id);
            if (prev.length >= 5) return prev;
            return [...prev, analysis];
        });
        setShowCompare(false);
        setSelected(null);
    };

    const isInCompare = (a) => compareList.some((c) => c.analysis_id === a.analysis_id);
    const completedAns = analyses.filter((a) => a.status === "completed");

    const stats = {
        total: analyses.length,
        completed: analyses.filter((a) => a.status === "completed").length,
        running: analyses.filter((a) => a.status === "running" || a.status === "pending").length,
        failed: analyses.filter((a) => a.status === "failed").length,
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>History Analisis LLM</h1>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Riwayat dan perbandingan hasil analisis antar model</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    {compareList.length >= 2 && (
                        <button onClick={() => { setShowCompare(true); setSelected(null); }}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                            <RiEqualizerLine size={15} /> Bandingkan ({compareList.length})
                        </button>
                    )}
                    <button onClick={fetchAnalyses}
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
                        {compareList.length} analisis dipilih:
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
                        {compareList.map((a) => (
                            <span key={a.analysis_id} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "999px", background: "var(--accent)", color: "#fff", fontSize: "11px", fontWeight: "500" }}>
                                {a.model_name}
                                <button onClick={() => toggleCompare(a)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 0, marginLeft: "2px" }}>
                                    <RiCloseLine size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                    {compareList.length >= 2 && (
                        <button onClick={() => { setShowCompare(true); setSelected(null); }}
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

            {/* Info */}
            {completedAns.length >= 2 && compareList.length === 0 && (
                <div style={{ background: "var(--info-dim)", border: "0.5px solid var(--info)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "var(--info)" }}>
                    💡 Klik tombol <strong>+ Bandingkan</strong> di analisis yang selesai untuk membandingkan performa antar model LLM
                </div>
            )}

            {error && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "12px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "13px" }}>
                    {error}
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: selected && !showCompare ? "1fr 340px" : "1fr", gap: "20px", alignItems: "start" }}>
                {/* Kiri — list */}
                <div>
                    {loading ? (
                        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px", textAlign: "center" }}>
                            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Memuat...</p>
                        </div>
                    ) : analyses.length === 0 ? (
                        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "48px", textAlign: "center" }}>
                            <RiFlaskLine size={32} style={{ color: "var(--text-muted)", marginBottom: "10px" }} />
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>Belum ada history analisis</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Minta Data Scientist untuk menjalankan analisis LLM</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {analyses.map((a) => {
                                    const s = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
                                    const StatusIcon = s.icon;
                                    const isSelected = selected?.analysis_id === a.analysis_id;
                                    const inCompare = isInCompare(a);
                                    const rouge = a.rouge_scores || {};

                                    return (
                                        <div key={a.analysis_id}
                                            style={{ background: isSelected ? "var(--accent-dim)" : inCompare ? "var(--success-dim)" : "var(--bg-surface)", border: `0.5px solid ${isSelected ? "var(--accent)" : inCompare ? "var(--success)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.15s" }}>

                                            <div onClick={() => handleSelect(a)}
                                                style={{ width: "38px", height: "38px", borderRadius: "var(--radius)", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                                                <StatusIcon size={18} style={{ color: s.color }} />
                                            </div>

                                            <div onClick={() => handleSelect(a)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                    <p style={{ fontSize: "14px", fontWeight: "500", color: isSelected ? "var(--accent)" : inCompare ? "var(--success)" : "var(--text-primary)" }}>
                                                        {a.dataset_new_name}
                                                    </p>
                                                    <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: "500", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)" }}>
                                                        {a.model_name}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                                                    Referensi: {a.dataset_reference_name}
                                                </p>
                                                {a.status === "completed" && (
                                                    <div style={{ display: "flex", gap: "12px" }}>
                                                        {rouge.rougeL !== undefined && <span style={{ fontSize: "11px", color: "var(--accent)" }}>ROUGE-L: {(rouge.rougeL * 100).toFixed(1)}%</span>}
                                                        {a.generate_time > 0 && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>⏱ {a.generate_time}s</span>}
                                                        {a.avg_length > 0 && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>📝 {a.avg_length} kata</span>}
                                                    </div>
                                                )}
                                                {a.status === "failed" && a.error_message && (
                                                    <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>⚠ {a.error_message}</p>
                                                )}
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                                <div style={{ background: s.bg, border: `0.5px solid ${s.color}`, borderRadius: "999px", padding: "4px 12px" }}>
                                                    <span style={{ fontSize: "11px", color: s.color, fontWeight: "500" }}>{s.label}</span>
                                                </div>
                                                {a.status === "completed" && (
                                                    <button onClick={() => toggleCompare(a)}
                                                        style={{ padding: "6px 12px", background: inCompare ? "var(--success-dim)" : "var(--bg-elevated)", color: inCompare ? "var(--success)" : "var(--text-secondary)", border: `0.5px solid ${inCompare ? "var(--success)" : "var(--border-strong)"}`, borderRadius: "var(--radius)", fontSize: "11px", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap" }}>
                                                        {inCompare ? "✓ Dipilih" : "+ Bandingkan"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Comparison panel */}
                            {showCompare && compareList.length >= 2 && (
                                <ComparisonPanel
                                    analyses={compareList}
                                    onClose={() => setShowCompare(false)}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Kanan — detail */}
                {selected && !showCompare && (
                    <div style={{ position: "sticky", top: "24px" }}>
                        {loadingDetail ? (
                            <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "40px", textAlign: "center" }}>
                                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Memuat detail...</p>
                            </div>
                        ) : (
                            <DetailPanel analysis={selected} onClose={() => setSelected(null)} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}