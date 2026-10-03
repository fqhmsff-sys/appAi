# Pidex V23 — Group Character Polish

- Popup pembuatan grup dipoles agar konsisten dengan UI Pelon: clean, premium, minimal.
- Saat popup dibuka selalu tersedia **AI 1** sebagai karakter custom pertama.
- Tombol **Tambah AI** menggunakan gaya tombol Pelon, bukan tombol dashed/placeholder.
- Lima karakter custom dibuat ulang sebagai SVG karakter orisinal bergaya maskot Pelon.
- Tidak menggunakan gradient; setiap karakter memakai satu warna utama yang berbeda.
- Lima bentuk karakter berbeda: Lelah, Jutek, Penasaran, Tenang, Ceria.
- Karakter Lelah memiliki ekspresi mata berat dan mulut lelah/pusing.
- Pemilih karakter memakai preview besar dan state terpilih yang konsisten dengan UI Pelon.
- Cache service worker dinaikkan agar aset karakter baru langsung terambil.


## Character refinement
- Karakter tidak memakai bentuk emoji, lingkaran, outline, gradient, atau efek glossy.
- Setiap karakter memakai siluet maskot yang berbeda dan satu warna flat utama.
- AI 1 default: Lelah — ekspresi berat, lemas, dan lesu.
- AI 2: Jutek — siluet lebih tajam dan ekspresi marah/jutek.
- Tiga karakter lain memiliki siluet dan warna yang berbeda: Penasaran, Tenang, Ceria.
- Warna utama tidak diulang antar lima karakter.
