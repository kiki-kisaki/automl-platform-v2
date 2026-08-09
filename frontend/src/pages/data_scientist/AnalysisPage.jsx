import { useState, useEffect, useRef } from "react";
import { getDatasets } from "../../api/datasetsApi";
import { generateAnalysis, getAnalysisStatus, getAnalysisById, getAvailableModels } from "../../api/analysisApi";
import {
    RiFlaskLine, RiRefreshLine, RiCheckboxCircleLine,
    RiErrorWarningLine, RiPulseLine, RiDownload2Line,
    RiRobot2Line,
} from "react-icons/ri";

export default function AnalysisPage() {
    const [datasets, setDatasets] = useState([]);
    const [models, setModels] = useState([]);
    const [refDataset, setRefDataset] = useState("");
    const [newDataset, setNewDataset] = useState("");
    const [modelName, setModelName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [polling, setPolling] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        getDatasets()
            .then((res) => setDatasets(res.data.data || []))
            .catch(() => setError("Gagal memuat dataset"));

        getAvailableModels()
            .then((res) => {
                const m = res.data.data || [];
                setModels(m);
                if (m.length > 0) setModelName(m[0]);
            })
            .catch(() => setModels(["qwen2.5:7b"]));

        return () => clearInterval(intervalRef.current);
    }, []);

    const refDatasets = datasets.filter((d) => d.dataset_role === "llm_reference" && d.status !== "locked");
    const newDatasets = datasets.filter((d) => ["llm_new", "llm_raw"].includes(d.dataset_role) && d.status !== "locked");

    const getRoleLabel = (role) => ({
        llm_reference: "Referensi",
        llm_new: "Verbatim + Coding",
        llm_raw: "Verbatim saja",
    }[role] || role);

    const getRoleColor = (role) => ({
        llm_reference: "var(--accent)",
        llm_new: "var(--success)",
        llm_raw: "var(--warning)",
    }[role] || "var(--text-muted)");

    const startPolling = (analysisId) => {
        setPolling(true);
        intervalRef.current = setInterval(async () => {
            try {
                const res = await getAnalysisStatus(analysisId);
                const data = res.data.data;

                if (data.status === "completed") {
                    clearInterval(intervalRef.current);
                    setPolling(false);
                    const detail = await getAnalysisById(analysisId);
                    setAnalysis(detail.data.data);
                    setLoading(false);
                } else if (data.status === "failed") {
                    clearInterval(intervalRef.current);
                    setPolling(false);
                    setError(data.error_message || "Analisis gagal");
                    setLoading(false);
                }
            } catch {
                clearInterval(intervalRef.current);
                setPolling(false);
                setLoading(false);
            }
        }, 3000);
    };

    const handleGenerate = async () => {
        if (!refDataset || !newDataset || !modelName) {
            setError("Pilih dataset referensi, dataset baru, dan model");
            return;
        }
        if (refDataset === newDataset) {
            setError("Dataset referensi dan dataset baru tidak boleh sama");
            return;
        }
        setLoading(true);
        setError("");
        setAnalysis(null);

        try {
            const res = await generateAnalysis({
                dataset_reference_id: Number(refDataset),
                dataset_new_id: Number(newDataset),
                model_name: modelName,
            });
            startPolling(res.data.data.analysis_id);
        } catch (err) {
            setError(err.response?.data?.message || "Gagal memulai analisis");
            setLoading(false);
        }
    };

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
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: `Dataset: ${analysis.dataset_new_name}`, size: 24, color: "555570" })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: `Model: ${analysis.model_name}`, size: 22, color: "555570" })] }),
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

    return (
        <div>
            <div style={{ marginBottom: "28px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Analisis LLM</h1>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Generate analisis psikologis menggunakan Ollama</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px", alignItems: "start" }}>

                {/* Kiri — Konfigurasi */}
                <div>
                    <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "16px" }}>
                        <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
                            Konfigurasi Analisis
                        </p>

                        {/* Dataset referensi */}
                        <div style={{ marginBottom: "14px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "4px" }}>Dataset Referensi <span style={{ color: "var(--danger)" }}>*</span></p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontStyle: "italic" }}>Dataset dengan verbatim + coding + analisis</p>
                            {refDatasets.length === 0 ? (
                                <div style={{ background: "var(--warning-dim)", border: "0.5px solid var(--warning)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: "12px", color: "var(--warning)" }}>
                                    ⚠ Belum ada dataset referensi.
                                </div>
                            ) : (
                                <select value={refDataset} onChange={(e) => setRefDataset(e.target.value)}
                                    style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)", fontSize: "13px" }}>
                                    <option value="">Pilih dataset referensi...</option>
                                    {refDatasets.map((d) => (
                                        <option key={d.dataset_id} value={d.dataset_id}>{d.name} ({d.meta?.rows || "?"} baris)</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Dataset baru */}
                        <div style={{ marginBottom: "14px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "4px" }}>Dataset Baru <span style={{ color: "var(--danger)" }}>*</span></p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontStyle: "italic" }}>Dataset yang ingin di-generate analisisnya</p>
                            {newDatasets.length === 0 ? (
                                <div style={{ background: "var(--warning-dim)", border: "0.5px solid var(--warning)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: "12px", color: "var(--warning)" }}>
                                    ⚠ Belum ada dataset baru.
                                </div>
                            ) : (
                                <select value={newDataset} onChange={(e) => setNewDataset(e.target.value)}
                                    style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)", fontSize: "13px" }}>
                                    <option value="">Pilih dataset baru...</option>
                                    {newDatasets.map((d) => (
                                        <option key={d.dataset_id} value={d.dataset_id}>
                                            {d.name} — {getRoleLabel(d.dataset_role)} ({d.meta?.rows || "?"} baris)
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Info tipe dataset baru */}
                        {newDataset && (
                            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "10px 12px", marginBottom: "14px" }}>
                                {(() => {
                                    const ds = newDatasets.find((d) => String(d.dataset_id) === String(newDataset));
                                    const role = ds?.dataset_role;
                                    const color = getRoleColor(role);
                                    return (
                                        <div>
                                            <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: "500", background: `${color}20`, color, border: `0.5px solid ${color}` }}>
                                                {getRoleLabel(role)}
                                            </span>
                                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                                                {role === "llm_raw"
                                                    ? "Ollama akan generate coding + analisis"
                                                    : "Ollama akan generate analisis dari verbatim+coding"}
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Pilih model */}
                        <div style={{ marginBottom: "16px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "4px" }}>
                                Model Ollama <span style={{ color: "var(--danger)" }}>*</span>
                            </p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontStyle: "italic" }}>
                                Model yang terinstall di Ollama
                            </p>
                            {models.length === 0 ? (
                                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: "12px", color: "var(--danger)" }}>
                                    ⚠ Tidak ada model Ollama yang terdeteksi. Pastikan Ollama sudah berjalan.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {models.map((m) => (
                                        <button key={m} onClick={() => setModelName(m)}
                                            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", border: `0.5px solid ${modelName === m ? "var(--accent)" : "var(--border-strong)"}`, background: modelName === m ? "var(--accent-dim)" : "var(--bg-elevated)", color: modelName === m ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", textAlign: "left" }}>
                                            <RiRobot2Line size={15} />
                                            {m}
                                            {modelName === m && <span style={{ marginLeft: "auto", fontSize: "11px" }}>✓ Dipilih</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "10px 12px", borderRadius: "var(--radius)", marginBottom: "14px", fontSize: "12px", display: "flex", gap: "6px" }}>
                                <RiErrorWarningLine size={13} style={{ flexShrink: 0, marginTop: "1px" }} /> {error}
                            </div>
                        )}

                        <button onClick={handleGenerate}
                            disabled={!refDataset || !newDataset || !modelName || loading || polling}
                            style={{ width: "100%", padding: "11px", background: !refDataset || !newDataset || !modelName || loading || polling ? "var(--bg-elevated)" : "var(--accent)", color: !refDataset || !newDataset || !modelName || loading || polling ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: !refDataset || !newDataset || !modelName || loading || polling ? "not-allowed" : "pointer" }}>
                            {polling ? "⏳ Menganalisis..." : loading ? "Memulai..." : `🧠 Generate dengan ${modelName || "..."}`}
                        </button>
                    </div>

                    {/* Status card */}
                    {(loading || polling) && (
                        <div style={{ background: "var(--info-dim)", border: "0.5px solid var(--info)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <RiPulseLine size={16} style={{ color: "var(--info)" }} />
                                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--info)" }}>Sedang memproses dengan {modelName}...</p>
                            </div>
                            <p style={{ fontSize: "12px", color: "var(--info)", opacity: 0.8 }}>
                                Proses membutuhkan waktu 1-5 menit tergantung jumlah segmen dan model.
                            </p>
                        </div>
                    )}

                    {/* Sukses */}
                    {analysis && analysis.status === "completed" && (
                        <div style={{ background: "var(--success-dim)", border: "0.5px solid var(--success)", borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <RiCheckboxCircleLine size={16} style={{ color: "var(--success)" }} />
                                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--success)" }}>Analisis Selesai</p>
                            </div>

                            {/* Metrik */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                                {[
                                    { label: "Waktu", value: `${analysis.generate_time}s` },
                                    { label: "Rata-rata Kata", value: `${analysis.avg_length} kata` },
                                    { label: "ROUGE-L", value: analysis.rouge_scores?.rougeL ? `${(analysis.rouge_scores.rougeL * 100).toFixed(1)}%` : "-" },
                                ].map((m, i) => (
                                    <div key={i} style={{ background: "var(--success-dim)", borderRadius: "var(--radius-sm)", padding: "6px 10px", border: "0.5px solid var(--success)" }}>
                                        <p style={{ fontSize: "10px", color: "var(--success)", marginBottom: "2px" }}>{m.label}</p>
                                        <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--success)" }}>{m.value}</p>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleExport}
                                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--success)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "12px", fontWeight: "500", cursor: "pointer" }}>
                                <RiDownload2Line size={13} /> Export Word (.docx)
                            </button>
                        </div>
                    )}
                </div>

                {/* Kanan — Hasil */}
                <div>
                    {!analysis ? (
                        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "60px", textAlign: "center" }}>
                            <RiFlaskLine size={36} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "6px" }}>Belum ada hasil analisis</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Pilih dataset dan model lalu klik Generate</p>
                        </div>
                    ) : (
                        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--border)", background: "var(--bg-elevated)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                                        {analysis.dataset_new_name}
                                    </p>
                                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                        Model: {analysis.model_name} · {analysis.results.length} segmen
                                    </p>
                                </div>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                    <thead>
                                        <tr style={{ background: "var(--bg-elevated)" }}>
                                            {["#", "Verbatim", "Coding", "Analisis (Generated)"].map((h, i) => (
                                                <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "0.5px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysis.results.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: "0.5px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-elevated)" }}>
                                                <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: "500", verticalAlign: "top", whiteSpace: "nowrap" }}>{i + 1}</td>
                                                <td style={{ padding: "12px 14px", color: "var(--text-secondary)", verticalAlign: "top", maxWidth: "200px" }}>
                                                    <p style={{ lineHeight: "1.5", wordBreak: "break-word" }}>{row.verbatim || "-"}</p>
                                                </td>
                                                <td style={{ padding: "12px 14px", verticalAlign: "top", maxWidth: "150px" }}>
                                                    <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)", display: "inline-block" }}>
                                                        {row.coding || "-"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px", color: "var(--text-primary)", verticalAlign: "top", maxWidth: "300px" }}>
                                                    <p style={{ lineHeight: "1.6", wordBreak: "break-word" }}>{row.analisis || "-"}</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}