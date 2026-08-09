Beberapa hal yang perlu diketahui

- Yang diubah adalah file dg extensi *.lyx

- Isilah di menu Document -> Setting -> Latex Preamble
  Beberapa variabel yang penting (nama variable sudah cukup menjelaskan)

%% \renewcommand{\chapter}[1]{\chapter[#1]{\centering #1}}
\usepackage{titlesec}
\usepackage{graphicx}
\usepackage{indentfirst}
\titleformat{\chapter}[hang]
  {\normalfont\huge\bfseries\centering}{\thechapter.}{14pt}{\Huge\MakeUppercase}
%%-------------
\newcommand{\Judul}{IMPLEMENTASI \textit{CHATBOT}\textit\ BERBASIS \textit{RETRIEVAL-AUGMENTED GENERATION}\textit\ (RAG) SECARA LOKAL MENGGUNAKAN PLATFORM OLLAMA}
\newcommand{\JudulInggris}{IMPLEMENTATION OF A CHATBOT BASED ON RETRIEVAL-AUGMENTED GENERATION (RAG) LOCALLY USING THE OLLAMA PLATFORM}
\newcommand{\Penulis}{Faadhil Riwa Muzakki Muniif}
\newcommand{\NPM}{50421428}
\newcommand{\JenisTulisan}{SKRIPSI}
\newcommand{\Gelar}{S1}
\newcommand{\Fakultas}{Teknologi Industri}
\newcommand{\FakultasInggris}{Industrial Technology}
\newcommand{\Jurusan}{Informatika}
\newcommand{\JurusanInggris}{Informatics}
%%-------------
\newcommand{\Prodi}{Direktorat Program Diploma Tiga Teknologi Informasi}
\newcommand{\Tahun}{2025}
\newcommand{\Bulan}{September}
\newcommand{\Tanggal}{16}
\newcommand{\Kota}{Jakarta}
%%-------------
\newcommand{\KataKunci}{\textit Chatbot \textit, \textit Retrieval-Augmented Generation\textit (RAG), \textit Ollama\textit, \textit Large Language Model \textit(LLM)}
\newcommand{\KeyWords}{Chatbot, Retrieval-Augmented Generation (RAG), Ollama, Large Language Model (LLM)}
%%-------------
\newcommand{\KoordinatorPI}{}
%%-------------
\newcommand{\KetuaJurusan}{Prof. Dr. Lintang Yuniar Banowosari, S.Kom., M.Sc.}
\newcommand{\KetuaPembimbing}{Dr. I Komang Sugiartha, S.Kom, MMSI.}
\newcommand{\AnggotaPembimbingA}{}
\newcommand{\AnggotaPembimbingB}{}
%%------------
\newcommand{\KetuaUjian}{Dr. Ravi Ahmad Salim, SSi.}
\newcommand{\SekUjian}{Prof. Dr., Wahyudi Priyono Suwarso.}
\newcommand{\AnggotaUjianA}{Dr. I Komang Sugiartha, SKom., MMSI.}
\newcommand{\AnggotaUjianB}{Dr. Ida Astuti, SKom., MMSI.}
\newcommand{\AnggotaUjianC}{Dr. Miftahul Jannah, SKom., MMSI.}
%%-------------
\newcommand{\Ringkasan}{Tulis ringkasan skripsi, pi, atau apa dengan bahasa yang jelas, lugas dan menggambarkan secara singkat tulisan ini.  Sebaiknya tidak lebih dari 150 kata dan sudah menjelaskan dari permasalahan, pembahasan dan penutup.}
\newcommand{\JumlahPustaka}{}
\newcommand{\JumlahHalaman}{77}
\newcommand{\JumlahHalamanDepan}{XV}
\newcommand{\TahunPustaka}{2019-2025}
%%
%% Keterangan administratif sidang sarjana
%%
\newcommand{\TanggalSidang}{16 September 2025}
\newcommand{\TanggalLulus}{16 September 2025}
\newcommand{\TanggalSah}{}
\newcommand{\PejabatBagianSidang}{Dr. Edi Sukirman, SSi., MM., M.I.Kom.}
\setlength{\headheight}{15pt}
%%-------------
%%
%%Untuk Kata pengantar
%%
\newcommand{\Rektor}{Prof. DR. Hj. E.S. Margianti, SE, MM.}
\newcommand{\Dekan}{Prof. Dr. Ing. Adang Suhendra, S.Si., S.Kom., M.Sc.}
\newcommand{\KotaPenulis}{Jakarta}
\newcommand{\BlnThn}{2025}
%%-----------
%%-----------
% The following commands set the page numbers on the top right
% except in the beginning of chapters
%\lhead{}
%\chead{}
%\rhead{\thepage}
%\lfoot{}
%\cfoot{}
%\rfoot{}
%\renewcommand{\headrulewidth}{0pt}

\usepackage{tocloft}
% Mengatur judul Daftar Isi, Daftar Gambar, dan Daftar Tabel agar tetap rata tengah dengan ukuran default
\renewcommand{\cfttoctitlefont}{\hfill\Huge\bfseries}
\renewcommand{\cftloftitlefont}{\hfill\Huge\bfseries}
\renewcommand{\cftlottitlefont}{\hfill\Huge\bfseries}
\renewcommand{\cftaftertoctitle}{\hfill}
\renewcommand{\cftafterloftitle}{\hfill}
\renewcommand{\cftafterlottitle}{\hfill}
% Membuat daftar khusus untuk lampiran
\newlistof{appendices}{app}{Daftar Lampiran}
% Kode untuk mengatur judul Daftar Lampiran
\makeatletter
\renewcommand{\listofappendices}{%
  \chapter*{DAFTAR LAMPIRAN}%
  \@starttoc{app}%
}
\makeatother


\renewcommand{\cftchapleader}{\cftdotfill{\cftdotsep}}
\renewcommand{\cftsecleader}{\cftdotfill{\cftdotsep}}
\renewcommand{\cftsubsecleader}{\cftdotfill{\cftdotsep}}



% Define custom page numbering style
\usepackage{fancyhdr}
\newcommand{\appendixpagenumbering}{
    \renewcommand{\thepage}{L-\arabic{page}}
}


% Mengatur header dan footer
\fancypagestyle{romanstyle}{
    \fancyhf{}
    \fancyfoot[C]{\thepage} % Nomor halaman di tengah bawah
    \renewcommand{\headrulewidth}{0pt} % Hapus garis header
    \renewcommand{\footrulewidth}{0pt} % Hapus garis footer
}

\fancypagestyle{arabicstyle}{
    \fancyhf{}
    \fancyhead[R]{\thepage} % Nomor halaman di kanan atas
    \renewcommand{\headrulewidth}{0pt} % Hapus garis header
    \renewcommand{\footrulewidth}{0pt} % Hapus garis footer
}

\fancypagestyle{appendixstyle}{
    \fancyhf{}
    \fancyfoot[C]{\thepage} % Nomor halaman di tengah bawah
    \renewcommand{\headrulewidth}{0pt} % Hapus garis header
    \renewcommand{\footrulewidth}{0pt} % Hapus garis footer
}
% Added by lyx2lyx
%% Variable width box for table cells
\newenvironment{cellvarwidth}[1][t]
    {\begin{varwidth}[#1]{\linewidth}}
    {\@finalstrut\@arstrutbox\end{varwidth}}
% Added by lyx2lyx
\usepackage{varwidth}
% Added by lyx2lyx
\usepackage{array}



- Logo Gunadarma letakkan di direktori setingkat

- file hypenation koreksi made-hypen.tex harus diletakkan pada direktori yang setingkat. File ini bisa saja diubah ditambahi bila menemukan pemenggalan yang tidak tepat.

- Pada bagian Abstraksi hati-hati terutama yang ada code "LaTeX" (ERT berwarna merah).  Beberapa paragraf pada bagian abstraksi memiliki spasi single.
  Pada bagian yang ada \noindent setelahnya ada spasi 

- Spasi dokumen ini adalah one-and-half (saya memutuskan tidak pakai double, terlalu membuang kertas)


