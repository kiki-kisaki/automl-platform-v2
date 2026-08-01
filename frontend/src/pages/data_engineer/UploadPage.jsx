import { useState } from "react";
import { uploadTabular, uploadImage, uploadText } from "../../api/datasetsApi";
import {
    RiUploadCloud2Line, RiFileLine, RiImageLine, RiFileTextLine,
    RiCloseLine, RiCheckboxCircleLine, RiErrorWarningLine,
} from "react-icons/ri";

const DATA_TYPES = [
    {
        key: "tabular",
        label: "Tabular",
        icon: RiFileLine,
        color: "var(--role-data_engineer)",
        description: "File CSV dengan baris dan kolom",
        accept: ".csv",
        hint: "Format: .csv · Separator otomatis (koma, titik koma, tab)",
    },
    {
        key: "image",
        label: "Gambar",
        icon: RiImageLine,
        color: "var(--role-data_scientist)",
        description: "ZIP berisi folder per kelas gambar",
        accept: ".zip",
        hint: "Format: .zip · Struktur: folder_kelas/gambar.jpg",
    },
    {
        key: "text",
        label: "Teks",
        icon: RiFileTextLine,
        color: "var(--role-ml_engineer)",
        description: "File teks, satu baris = satu dokumen",
        accept: ".txt",
        hint: "Format: .txt · Satu baris = satu dokumen",
    },
];

function UploadCard({ type, onUpload }) {
    const [file, setFile] = useState(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [dragOver, setDragOver] = useState(false);

    const Icon = type.icon;

    const processFile = (f) => {
        if (!f) return;
        const ext = f.name.split(".").pop().toLowerCase();
        const allowed = type.accept.replace(".", "").split(",");
        if (!allowed.includes(ext)) {
            setError(`Hanya file ${type.accept} yang diperbolehkan`);
            return;
        }
        setError("");
        setFile(f);
        if (!name) setName(f.name.replace(/\.[^/.]+$/, ""));
    };

    const handleSubmit = async () => {
        if (!file || !name.trim()) {
            setError("File dan nama dataset wajib diisi");
            return;
        }
        setLoading(true);
        setError("");
        setResult(null);

        try {
            let res;
            if (type.key === "tabular") res = await uploadTabular(file, name.trim());
            if (type.key === "image") res = await uploadImage(file, name.trim());
            if (type.key === "text") res = await uploadText(file, name.trim());

            setResult(res.data.data);
            setFile(null);
            setName("");
            if (onUpload) onUpload();
        } catch (err) {
            setError(err.response?.data?.message || "Upload gagal");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius)", background: `${type.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} style={{ color: type.color }} />
                </div>
                <div>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{type.label}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{type.description}</p>
                </div>
            </div>

            {/* Nama dataset */}
            <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "500" }}>Nama Dataset</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="contoh: Dataset Kemiskinan 2024"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius)" }}
                />
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
                onClick={() => !file && document.getElementById(`file-${type.key}`).click()}
                style={{
                    border: `1.5px dashed ${dragOver ? type.color : file ? "var(--border-strong)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "20px",
                    textAlign: "center",
                    background: dragOver ? `${type.color}10` : "var(--bg-elevated)",
                    cursor: file ? "default" : "pointer",
                    transition: "all 0.15s",
                    marginBottom: "12px",
                }}
            >
                <input id={`file-${type.key}`} type="file" accept={type.accept}
                    onChange={(e) => processFile(e.target.files[0])}
                    style={{ display: "none" }}
                />
                {!file ? (
                    <>
                        <RiUploadCloud2Line size={28} style={{ color: type.color, marginBottom: "8px" }} />
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>Drag & drop atau klik untuk pilih</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{type.hint}</p>
                    </>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                        <Icon size={20} style={{ color: type.color }} />
                        <div style={{ textAlign: "left" }}>
                            <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>{file.name}</p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                            style={{ marginLeft: "8px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                            <RiCloseLine size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)", color: "var(--danger)", padding: "8px 12px", borderRadius: "var(--radius)", marginBottom: "12px", fontSize: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
                    <RiErrorWarningLine size={14} /> {error}
                </div>
            )}

            {/* Success */}
            {result && (
                <div style={{ background: "var(--success-dim)", border: "0.5px solid var(--success)", color: "var(--success)", padding: "10px 12px", borderRadius: "var(--radius)", marginBottom: "12px", fontSize: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <RiCheckboxCircleLine size={14} />
                        <span style={{ fontWeight: "500" }}>Upload berhasil!</span>
                    </div>
                    <p>Dataset ID: #{result.dataset_id}</p>
                    {result.meta?.rows && <p>Baris: {result.meta.rows.toLocaleString("id-ID")}</p>}
                    {result.meta?.classes && <p>Kelas: {result.meta.classes.join(", ")}</p>}
                    {result.meta?.total_documents && <p>Dokumen: {result.meta.total_documents}</p>}
                </div>
            )}

            {/* Tombol upload */}
            <button onClick={handleSubmit} disabled={!file || loading}
                style={{ width: "100%", padding: "10px", background: !file || loading ? "var(--bg-elevated)" : type.color, color: !file || loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "500", cursor: !file || loading ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                {loading ? "Mengupload..." : `Upload Dataset ${type.label}`}
            </button>
        </div>
    );
}

export default function UploadPage() {
    const [uploadCount, setUploadCount] = useState(0);

    return (
        <div>
            <div style={{ marginBottom: "28px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Upload Dataset</h1>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Upload dataset dalam berbagai format untuk diproses oleh Data Scientist</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {DATA_TYPES.map((type) => (
                    <UploadCard key={type.key} type={type} onUpload={() => setUploadCount((c) => c + 1)} />
                ))}
            </div>

            {uploadCount > 0 && (
                <div style={{ marginTop: "20px", background: "var(--bg-surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <RiCheckboxCircleLine size={16} style={{ color: "var(--success)" }} />
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        <span style={{ fontWeight: "500", color: "var(--success)" }}>{uploadCount} dataset</span> berhasil diupload. Data Scientist dapat mulai memproses dataset.
                    </p>
                </div>
            )}
        </div>
    );
}