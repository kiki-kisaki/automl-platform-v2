import { useState, useEffect } from "react";
import { getAnalyses, getAnalysisById } from "../../api/analysisApi";
import {
    RiFlaskLine, RiRefreshLine, RiCheckboxCircleLine,
    RiErrorWarningLine, RiTimeLine, RiPulseLine,
    RiCloseLine, RiDownload2Line, RiInformationLine,
} from "react-icons/ri";

const STATUS_CONFIG = {
    pending: { color: "var(--text-muted)", bg: "var(--bg-elevated)", icon: RiTimeLine, label: "Menunggu" },
    running: { color: "var(--info)", bg: "var(--info-dim)", icon: RiPulseLine, label: "Berjalan" },
    completed: { color: "var(--success)", bg: "var(--success-dim)", icon: RiCheckboxCircleLine, label: "Selesai" },
    failed: { color: "var(--danger)", bg: "var(--danger-dim)", icon: RiErrorWarningLine, label: "Gagal" },
};

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
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20 })],
                    })],
                })
            ),
        });

        const dataRows = analysis.results.map((row, i) =>
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 400, type: WidthType.DXA },
                        shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE },
                        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i + 1), bold: true, color: DARK, size: 20 })] })],
                    }),
                    new TableCell({
                        width: { size: 2500, type: WidthType.DXA },
                        shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE },
                        children: [new Paragraph({ children: [new TextRun({ text: row.verbatim || "-", size: 20, color: DARK })] })],
                    }),
                    new TableCell({
                        width: { size: 2000, type: WidthType.DXA },
                        shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE },
                        children: [new Paragraph({ children: [new TextRun({ text: row.coding || "-", size: 20, color: DARK, bold: true })] })],
                    }),
                    new TableCell({
                        width: { size: 4100, type: WidthType.DXA },
                        shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "F5F5F5" : WHITE },
                        children: [new Paragraph({ children: [new TextRun({ text: row.analisis || "-", size: 20, color: DARK })] })],
                    }),
                ],
            })
        );

        const doc = new Document({
            numbering: { config: [] },
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 100 },
                        children: [new TextRun({ text: "Laporan Analisis LLM", bold: true, size: 36, color: DARK })],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 100 },
                        children: [new TextRun({ text: `Dataset: ${analysis.dataset_new_name}`, size: 24, color: "555570" })],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 200 },
                        children: [new TextRun({ text: `Referensi: ${analysis.dataset_reference_name}  ·  ${analysis.results.length} segmen  ·  ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, size: 20, color: "888888" })],
                    }),
                    new Table({
                        width: { size: 9000, type: WidthType.DXA },
                        columnWidths: [400, 2500, 2000, 4100],
                        rows: [headerRow, ...dataRows],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 300, after: 100 },
                        children: [new TextRun({ text: "Dokumen ini digenerate otomatis oleh AutoML Platform", size: 18, color: "AAAAAA", italics: true })],
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBlob(doc);
        const url = URL.createObjectURL(buffer);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `analisis_${analysis.dataset_new_name}.docx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {/* Header */}
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
                        { label: "Total Segmen", value: `${analysis.results?.length || 0} segmen` },
                        { label: "Dibuat", value: new Date(analysis.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.label}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>{item.value}</span>
                        </div>
                    ))}
                </div>

                {/* Preview hasil */}
                {analysis.results?.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                        <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                            Preview ({Math.min(2, analysis.results.length)} dari {analysis.results.length} segmen)
                        </p>
                        {analysis.results.slice(0, 2).map((row, i) => (
                            <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "10px 12px", marginBottom: "8px", borderLeft: "2px solid var(--accent)" }}>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>Verbatim</p>
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", lineHeight: "1.4" }}>{row.verbatim}</p>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>Coding</p>
                                <p style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "500", marginBottom: "6px" }}>{row.coding}</p>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px" }}>Analisis</p>
                                <p style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: "1.5" }}>{row.analisis}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Export */}
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AnalysisHistoryPage() {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
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
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Riwayat semua hasil analisis psikologi yang sudah dibuat</p>
                </div>
                <button onClick={fetchAnalyses}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px", cursor: "pointer" }}>
                    <RiRefreshLine size={15} /> Refresh
                </button>
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

            {error && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "12px", borderRadius: "var(--radius)", marginBottom: "16px", fontSize: "13px" }}>
                    {error}
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: "20px", alignItems: "start" }}>
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {analyses.map((a) => {
                                const s = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
                                const StatusIcon = s.icon;
                                const isSelected = selected?.analysis_id === a.analysis_id;

                                return (
                                    <div key={a.analysis_id}
                                        onClick={() => handleSelect(a)}
                                        style={{ background: isSelected ? "var(--accent-dim)" : "var(--bg-surface)", border: `0.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", transition: "all 0.15s" }}>

                                        <div style={{ width: "38px", height: "38px", borderRadius: "var(--radius)", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <StatusIcon size={18} style={{ color: s.color }} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: "14px", fontWeight: "500", color: isSelected ? "var(--accent)" : "var(--text-primary)", marginBottom: "4px" }}>
                                                {a.dataset_new_name}
                                            </p>
                                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "3px" }}>
                                                Referensi: {a.dataset_reference_name}
                                            </p>
                                            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                                {new Date(a.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                {a.total_results > 0 && ` · ${a.total_results} segmen`}
                                            </p>
                                            {a.status === "failed" && a.error_message && (
                                                <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>⚠ {a.error_message}</p>
                                            )}
                                        </div>

                                        <div style={{ background: s.bg, border: `0.5px solid ${s.color}`, borderRadius: "999px", padding: "4px 12px", flexShrink: 0 }}>
                                            <span style={{ fontSize: "11px", color: s.color, fontWeight: "500" }}>{s.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Kanan — detail */}
                {selected && (
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