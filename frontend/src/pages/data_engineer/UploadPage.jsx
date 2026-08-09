import { useState } from "react";
import { uploadTabular, uploadImage, uploadText } from "../../api/datasetsApi";
import { uploadConsentPdf } from "../../api/consentApi";
import api from "../../api/axiosConfig";
import {
    RiUploadCloud2Line, RiFileLine, RiImageLine, RiFileTextLine,
    RiCloseLine, RiErrorWarningLine, RiAddLine, RiDeleteBinLine,
    RiShieldCheckLine,
} from "react-icons/ri";

const DATA_TYPES = [
    {
        key: "tabular", label: "Tabular", icon: RiFileLine,
        color: "var(--role-data_engineer)",
        description: "File CSV dengan baris dan kolom",
        accept: ".csv",
        hint: "Format: .csv · Separator otomatis (koma, titik koma, tab)",
    },
    {
        key: "image", label: "Gambar", icon: RiImageLine,
        color: "var(--role-data_scientist)",
        description: "ZIP berisi folder per kelas gambar",
        accept: ".zip",
        hint: "Format: .zip · Struktur: folder_kelas/gambar.jpg",
    },
    {
        key: "text", label: "Teks", icon: RiFileTextLine,
        color: "var(--role-ml_engineer)",
        description: "File teks, satu baris = satu dokumen",
        accept: ".txt",
        hint: "Format: .txt · Satu baris = satu dokumen",
    },
];

function UploadCard({ type }) {
    const [file, setFile] = useState(null);
    const [name, setName] = useState("");
    const [textRole, setTextRole] = useState("general");
    const [subjects, setSubjects] = useState([{ nik: "", name: "", agree_store: false, agree_process: false }]);
    const [pdfFiles, setPdfFiles] = useState({});  // { index: { pdf_filename, original_name } }
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [dragOver, setDragOver] = useState(false);

    const Icon = type.icon;

    // ── File dataset ────────────────────────────────────────────────────────────
    const processFile = (f) => {
        if (!f) return;
        const ext = f.name.split(".").pop().toLowerCase();
        const allowed = type.accept.replace(".", "");
        if (ext !== allowed) {
            setError(`Hanya file ${type.accept} yang diperbolehkan`);
            return;
        }
        setError("");
        setFile(f);
        if (!name) setName(f.name.replace(/\.[^/.]+$/, ""));
    };

    // ── Subject handlers ────────────────────────────────────────────────────────
    const addSubject = () => setSubjects((p) => [...p, { nik: "", name: "", agree_store: false, agree_process: false }]);
    const removeSubject = (i) => {
        if (subjects.length > 1) {
            setSubjects((p) => p.filter((_, idx) => idx !== i));
            setPdfFiles((p) => {
                const next = { ...p };
                delete next[i];
                // Re-index
                const reindexed = {};
                Object.keys(next).forEach((k) => {
                    const ki = parseInt(k);
                    if (ki > i) reindexed[ki - 1] = next[k];
                    else reindexed[ki] = next[k];
                });
                return reindexed;
            });
        }
    };
    const updateSubject = (i, key, value) => setSubjects((p) => p.map((s, idx) => idx === i ? { ...s, [key]: value } : s));

    // ── PDF upload per subjek ───────────────────────────────────────────────────
    const handlePdfUpload = async (i, file) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setError(`Subjek #${i + 1}: Hanya file PDF yang diperbolehkan`);
            return;
        }
        try {
            const res = await uploadConsentPdf(file);
            setPdfFiles((p) => ({ ...p, [i]: res.data.data }));
            setError("");
        } catch {
            setError(`Subjek #${i + 1}: Gagal upload PDF`);
        }
    };

    // ── Status preview ──────────────────────────────────────────────────────────
    const allAgreeStore = subjects.every((s) => s.agree_store);
    const allAgreeProcess = subjects.every((s) => s.agree_process);
    const allHavePdf = subjects.every((_, i) => pdfFiles[i]);

    const statusPreview = !allHavePdf
        ? { color: "var(--danger)", bg: "var(--danger-dim)", text: "⚠ Dataset akan dihapus — ada subjek yang belum upload bukti PDF" }
        : !allAgreeStore
            ? { color: "var(--danger)", bg: "var(--danger-dim)", text: "⚠ Dataset akan dihapus — ada subjek yang tidak setuju penyimpanan" }
            : !allAgreeProcess
                ? { color: "var(--warning)", bg: "var(--warning-dim)", text: "⚠ Dataset disimpan tapi tidak bisa diproses" }
                : { color: "var(--success)", bg: "var(--success-dim)", text: "✓ Dataset akan disimpan dan dapat diproses" };

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!file || !name.trim()) {
            setError("File dan nama dataset wajib diisi");
            return;
        }
        for (let i = 0; i < subjects.length; i++) {
            const s = subjects[i];
            if (!s.nik.trim() || !s.name.trim()) {
                setError(`Subjek #${i + 1}: NIK dan nama wajib diisi`);
                return;
            }
            if (!/^\d{16}$/.test(s.nik.trim())) {
                setError(`Subjek #${i + 1}: NIK harus 16 digit angka`);
                return;
            }
            if (!pdfFiles[i]) {
                setError(`Subjek #${i + 1}: Bukti PDF wajib diupload`);
                return;
            }
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            // Step 1 — Upload dataset
            let uploadRes;
            if (type.key === "tabular") uploadRes = await uploadTabular(file, name.trim());
            if (type.key === "image") uploadRes = await uploadImage(file, name.trim());
            if (type.key === "text") uploadRes = await uploadText(file, name.trim());

            const datasetId = uploadRes.data.data.dataset_id;

            // Step 2 — Update role kalau TXT
            if (type.key === "text" && textRole !== "general") {
                await api.patch(`/datasets/${datasetId}/role`, { dataset_role: textRole });
            }

            // Step 3 — Submit consent dengan pdf_filename
            const consentRes = await api.post(`/consent/${datasetId}`, {
                subjects: subjects.map((s, i) => ({
                    nik: s.nik.trim(),
                    name: s.name.trim(),
                    agree_store: s.agree_store,
                    agree_process: s.agree_process,
                    pdf_filename: pdfFiles[i]?.pdf_filename || null,
                })),
            });

            setResult(consentRes.data.data);

            // Reset form
            setFile(null);
            setName("");
            setTextRole("general");
            setSubjects([{ nik: "", name: "", agree_store: false, agree_process: false }]);
            setPdfFiles({});

        } catch (err) {
            setError(err.response?.data?.message || "Gagal memproses upload");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "16px" }}>

            {/* Header tipe data */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius)", background: `${type.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} style={{ color: type.color }} />
                </div>
                <div>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{type.label}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{type.description}</p>
                </div>
            </div>

            {/* ── BAGIAN ATAS: Upload Dataset ── */}
            <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                    Upload Dataset
                </p>

                {/* Nama dataset */}
                <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Nama Dataset</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="contoh: Dataset Kemiskinan 2024"
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)", fontSize: "13px" }}
                    />
                </div>

                {/* Dropdown tipe — hanya untuk TXT */}
                {type.key === "text" && (
                    <div style={{ marginBottom: "10px" }}>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Tipe Dataset</label>
                        <select value={textRole} onChange={(e) => setTextRole(e.target.value)}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)", fontSize: "13px" }}>
                            <option value="general">Umum — dataset teks biasa</option>
                            <option value="llm_reference">Referensi LLM — verbatim + coding + analisis</option>
                            <option value="llm_new">Data Baru LLM — verbatim + coding</option>
                            <option value="llm_raw">Data Mentah LLM — verbatim saja</option>
                        </select>
                        {textRole !== "general" && (
                            <div style={{ background: "var(--info-dim)", border: "0.5px solid var(--info)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginTop: "6px", fontSize: "11px", color: "var(--info)" }}>
                                {textRole === "llm_reference" && "Format per baris: verbatim | coding | analisis"}
                                {textRole === "llm_new" && "Format per baris: verbatim | coding"}
                                {textRole === "llm_raw" && "Format per baris: verbatim saja"}
                            </div>
                        )}
                    </div>
                )}

                {/* Drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
                    onClick={() => !file && document.getElementById(`file-${type.key}`).click()}
                    style={{
                        border: `1.5px dashed ${dragOver ? type.color : file ? "var(--border-strong)" : "var(--border)"}`,
                        borderRadius: "var(--radius)", padding: "16px", textAlign: "center",
                        background: dragOver ? `${type.color}10` : "var(--bg-elevated)",
                        cursor: file ? "default" : "pointer", transition: "all 0.15s",
                    }}
                >
                    <input id={`file-${type.key}`} type="file" accept={type.accept}
                        onChange={(e) => processFile(e.target.files[0])}
                        style={{ display: "none" }}
                    />
                    {!file ? (
                        <>
                            <RiUploadCloud2Line size={24} style={{ color: type.color, marginBottom: "6px" }} />
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Drag & drop atau klik untuk pilih</p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{type.hint}</p>
                        </>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                            <Icon size={18} style={{ color: type.color }} />
                            <div style={{ textAlign: "left" }}>
                                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>{file.name}</p>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", marginLeft: "8px" }}>
                                <RiCloseLine size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "0.5px solid var(--border)", margin: "16px 0" }} />

            {/* ── BAGIAN BAWAH: Privacy Consent ── */}
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <RiShieldCheckLine size={15} style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Persetujuan Privasi Data
                    </p>
                </div>

                {/* Status preview */}
                <div style={{ background: statusPreview.bg, border: `0.5px solid ${statusPreview.color}`, borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: statusPreview.color }}>
                    {statusPreview.text}
                </div>

                {/* Header tabel subjek */}
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 90px 90px 110px 28px", gap: "6px", marginBottom: "6px", padding: "0 4px" }}>
                    {["NIK (16 digit)", "Nama Subjek", "Setuju Simpan", "Setuju Proses", "Bukti PDF", ""].map((h, i) => (
                        <span key={i} style={{ fontSize: "10px", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.3px" }}>{h}</span>
                    ))}
                </div>

                {/* Baris subjek */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                    {subjects.map((s, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 90px 90px 110px 28px", gap: "6px", alignItems: "center" }}>

                            {/* NIK */}
                            <input type="text" value={s.nik} maxLength={16}
                                onChange={(e) => updateSubject(i, "nik", e.target.value.replace(/\D/g, ""))}
                                placeholder="3201xxxxxx"
                                style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", fontSize: "12px", fontFamily: "Courier New" }}
                            />

                            {/* Nama */}
                            <input type="text" value={s.name}
                                onChange={(e) => updateSubject(i, "name", e.target.value)}
                                placeholder="Nama lengkap"
                                style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", fontSize: "12px" }}
                            />

                            {/* Agree store */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                                <input type="checkbox" checked={s.agree_store}
                                    onChange={(e) => updateSubject(i, "agree_store", e.target.checked)}
                                    style={{ width: "15px", height: "15px", accentColor: "var(--success)", cursor: "pointer" }}
                                />
                                <span style={{ fontSize: "11px", color: s.agree_store ? "var(--success)" : "var(--text-muted)" }}>
                                    {s.agree_store ? "Ya" : "Tidak"}
                                </span>
                            </div>

                            {/* Agree process */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                                <input type="checkbox" checked={s.agree_process}
                                    onChange={(e) => updateSubject(i, "agree_process", e.target.checked)}
                                    style={{ width: "15px", height: "15px", accentColor: "var(--accent)", cursor: "pointer" }}
                                />
                                <span style={{ fontSize: "11px", color: s.agree_process ? "var(--accent)" : "var(--text-muted)" }}>
                                    {s.agree_process ? "Ya" : "Tidak"}
                                </span>
                            </div>

                            {/* Upload PDF */}
                            <div style={{ display: "flex", alignItems: "center" }}>
                                {pdfFiles[i] ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span style={{ fontSize: "10px", color: "var(--success)" }}>✅</span>
                                        <span style={{ fontSize: "10px", color: "var(--success)", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {pdfFiles[i].original_name}
                                        </span>
                                        <button onClick={() => setPdfFiles((p) => { const n = { ...p }; delete n[i]; return n; })}
                                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", padding: 0 }}>
                                            <RiCloseLine size={11} />
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{ display: "flex", alignItems: "center", gap: "3px", padding: "5px 8px", background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius-sm)", fontSize: "10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                                        📎 Upload PDF
                                        <input type="file" accept=".pdf"
                                            onChange={(e) => handlePdfUpload(i, e.target.files[0])}
                                            style={{ display: "none" }}
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Hapus subjek */}
                            <button onClick={() => removeSubject(i)} disabled={subjects.length === 1}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", background: subjects.length === 1 ? "transparent" : "var(--danger-dim)", color: subjects.length === 1 ? "var(--text-muted)" : "var(--danger)", border: `0.5px solid ${subjects.length === 1 ? "var(--border)" : "var(--danger)"}`, borderRadius: "var(--radius-sm)", cursor: subjects.length === 1 ? "not-allowed" : "pointer" }}>
                                <RiDeleteBinLine size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Tambah subjek */}
                <button onClick={addSubject}
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent)", borderRadius: "var(--radius-sm)", fontSize: "12px", cursor: "pointer", marginBottom: "12px" }}>
                    <RiAddLine size={13} /> Tambah Subjek
                </button>

                {/* Ringkasan */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                    {[
                        { label: "Total Subjek", value: subjects.length, color: "var(--text-primary)" },
                        { label: "Upload PDF", value: `${Object.keys(pdfFiles).length}/${subjects.length}`, color: allHavePdf ? "var(--success)" : "var(--danger)" },
                        { label: "Setuju Simpan", value: `${subjects.filter((s) => s.agree_store).length}/${subjects.length}`, color: allAgreeStore ? "var(--success)" : "var(--danger)" },
                        { label: "Setuju Proses", value: `${subjects.filter((s) => s.agree_process).length}/${subjects.length}`, color: allAgreeProcess ? "var(--success)" : "var(--warning)" },
                    ].map((item, i) => (
                        <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
                            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "3px" }}>{item.label}</p>
                            <p style={{ fontSize: "16px", fontWeight: "600", color: item.color }}>{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "8px 12px", borderRadius: "var(--radius)", marginBottom: "12px", fontSize: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
                    <RiErrorWarningLine size={13} /> {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{
                    background: result.result === "approved" ? "var(--success-dim)" : result.result === "locked" ? "var(--warning-dim)" : "var(--danger-dim)",
                    border: `0.5px solid ${result.result === "approved" ? "var(--success)" : result.result === "locked" ? "var(--warning)" : "var(--danger)"}`,
                    borderRadius: "var(--radius)", padding: "10px 12px", marginBottom: "12px", fontSize: "12px",
                    color: result.result === "approved" ? "var(--success)" : result.result === "locked" ? "var(--warning)" : "var(--danger)",
                }}>
                    <p style={{ fontWeight: "500", marginBottom: "2px" }}>
                        {result.result === "approved" ? "✅ Upload berhasil" : result.result === "locked" ? "🔒 Dataset terkunci" : "❌ Dataset dihapus"}
                    </p>
                    <p style={{ opacity: 0.85 }}>{result.message}</p>
                </div>
            )}

            {/* Tombol submit */}
            <button onClick={handleSubmit} disabled={!file || loading}
                style={{ width: "100%", padding: "10px", background: !file || loading ? "var(--bg-elevated)" : type.color, color: !file || loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: !file || loading ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                {loading ? "Memproses..." : "Upload & Submit Consent"}
            </button>
        </div>
    );
}

export default function UploadPage() {
    return (
        <div>
            <div style={{ marginBottom: "28px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Upload Dataset</h1>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Upload dataset beserta persetujuan privasi dari setiap subjek data</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {DATA_TYPES.map((type) => (
                    <UploadCard key={type.key} type={type} />
                ))}
            </div>
        </div>
    );
}