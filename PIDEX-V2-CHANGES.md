# Pidex V2 UI / Editor Revision

Perubahan utama:
- Syntax highlighting ringan tanpa library eksternal.
- Toolbar editor: Undo, Redo, Save, Find, Format.
- Menu `+` memakai popup Pidex, bukan browser `prompt()`.
- Popup berisi Berkas baru, Folder baru, Upload berkas, dan Buat project.
- Explorer mendukung folder virtual dan file dalam folder.
- Terminal diganti menjadi Pidex Shell dengan perintah lokal yang lebih banyak.
- Preview dapat dibuka dalam layar penuh.
- Auto-indent sederhana dan auto-pair bracket.
- Shortcut Ctrl/Cmd S, F, H tetap tersedia.
- Struktur tetap ringan dan mobile-first.

Catatan runtime:
Pidex Shell tidak harus Linux. Untuk V1/V2 UI, shell adalah shell milik Pidex. Eksekusi bahasa pemrograman yang benar-benar native membutuhkan runner/sandbox backend atau runtime WebAssembly yang sesuai.
