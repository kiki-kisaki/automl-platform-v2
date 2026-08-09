PAKET DRAFT SKRIPSI ML ENGINEER
================================

Isi folder:
- Skripsi_ML_Engineer.lyx : draft skripsi utama dalam format LyX 2.4.
- biblio_ml.bib           : daftar pustaka BibTeX terkurasi (31 entri).
- LogoGunadarma.jpg      : logo untuk halaman sampul.
- made-hypen.tex          : file hyphenation dari template LyX awal.
- figures/                : lima diagram yang dipakai di Bab III.

FOKUS DOKUMEN
-------------
Draft ini merupakan versi individual untuk kontribusi ML Engineer pada proyek
AutoML Platform v2. Fokusnya adalah:
1. preprocessing tabular, gambar, dan teks;
2. eksperimen dan training model Scikit-learn;
3. packaging model serta artefak preprocessing;
4. integrasi pekerjaan asinkron melalui FastAPI;
5. analisis LLM lokal menggunakan Ollama, few-shot prompting, dan ROUGE.

CARA MEMBUKA
------------
1. Pastikan LyX 2.4 atau versi yang kompatibel telah terpasang.
2. Buka Skripsi_ML_Engineer.lyx dari folder ini.
3. Jangan memindahkan file .lyx, LogoGunadarma.jpg, made-hypen.tex, atau folder
   figures secara terpisah karena path gambar dan input template bersifat relatif.
4. Jalankan Update > Update Document sebelum melihat PDF.
5. Kompilasi dua atau tiga kali agar daftar isi, daftar gambar, daftar tabel, dan
   daftar pustaka diperbarui. Jika diminta oleh LyX, jalankan BibTeX melalui
   menu bibliografi atau gunakan Tools > Reconfigure jika package belum dikenali.

DATA YANG WAJIB DIGANTI
-----------------------
Pada bagian preamble LyX, cari komentar "GANTI DATA BERIKUT SEBELUM DIPAKAI".
Ganti sekurang-kurangnya:
- NAMA LENGKAP PENULIS
- NPM PENULIS
- PROGRAM STUDI ANDA
- NAMA DOSEN PEMBIMBING
- KOTA
- TANGGAL SIDANG
- data panitia ujian dan pejabat pengesahan

Ada placeholder yang sengaja dipertahankan karena informasi personal tersebut
tidak tersedia di repositori. Jangan menggunakan draft ini untuk sidang sebelum
semua placeholder dihapus dan disesuaikan dengan pedoman kampus.

CATATAN ILMIAH PENTING
----------------------
Repositori yang dianalisis tidak menyertakan dataset benchmark final untuk
menghasilkan angka accuracy, precision, recall, F1, RMSE, atau ROUGE. Oleh
karena itu, draft ini melaporkan hasil implementasi dan pengujian skenario,
tetapi tidak mengarang angka performa model. Sebelum finalisasi:
- tentukan dataset eksperimen dan protokol pembagian data;
- jalankan eksperimen final;
- isi tabel metrik dan spesifikasi hardware/model Ollama;
- tambahkan penilaian ahli untuk kualitas analisis LLM jika diperlukan;
- verifikasi klaim terhadap log pengujian aktual.

Perlu diperhatikan pula bahwa implementasi saat ini melakukan fit preprocessing
sebelum split data. Untuk evaluasi formal, pertimbangkan pipeline yang hanya
fit pada data training agar tidak terjadi data leakage.

DAFTAR PUSTAKA
--------------
File biblio_ml.bib berisi referensi DSR, AutoML, Scikit-learn, algoritma klasik,
HOG, TF-IDF, LLM, ROUGE, Ollama, Privacy by Design, UU PDP, dan repositori
proyek. BibTeX pada dokumen menggunakan gaya apacite dan hanya mencetak
referensi yang disitasi (btPrintCited). Entri cadangan yang belum disitasi dapat
dihapus atau disitasi setelah benar-benar digunakan dalam naskah.

SUMBER ARTEFAK
--------------
Repositori proyek: https://github.com/kiki-kisaki/automl-platform-v2
File Skripsi2.pdf pada repositori digunakan sebagai referensi struktur skripsi
gabungan. Draft ini tidak menyalin identitas penulis skripsi gabungan dan telah
memusatkan isi pada peran ML Engineer.
