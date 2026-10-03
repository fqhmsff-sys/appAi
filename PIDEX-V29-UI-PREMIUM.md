# Pelon V1 — V29 UI Premium

## Stiker
- 50 stiker dibuat ulang sebagai SVG (tajam di semua ukuran, jauh lebih ringan dari PNG).
- Setiap stiker punya ekspresi wajah, alis, mulut, pose tangan, dan elemen sendiri (lampu ide, hati, keringat, awan, api, konfeti, kacamata, topi pesta, roket, dll).
- Katalog arti nomor stiker ditambahkan ke prompt AI (`worker/orchestrator.js`) supaya AI memilih stiker yang sesuai.

## Grup
- Wajah karakter tampil di samping nama semua anggota (pesan, strip anggota, menu @), kecuali nama pengguna.
- Tombol @ baru di kolom kirim pesan, ikon @ baru di aksi pesan, menu mention dengan wajah anggota.
- Kolom kirim pesan melayang dengan border, bayangan, dan ring fokus sehingga tidak tenggelam.
- Kotak isian Tambah AI berlabel (Nama AI, Peran, Karakter dan sifat), tinggi dan kontras lebih jelas.

## Global
- Token `--surface` dan `--surface-2` sebelumnya dipakai 74 kali tetapi tidak pernah didefinisikan; kini didefinisikan untuk mode terang dan gelap.
- Ikon pengaturan diganti ikon slider yang bersih (tanpa gerigi) di sidebar dan kepala grup.
- Animasi latar Pelon dibuat samar (terang ±5%, gelap ±7%) mengikuti tema.
- Polish UI: sidebar, tombol, modal, bubble, composer utama, fokus, dan transisi.
- Atribut `hidden` kini selalu menyembunyikan elemen (bar "Mengedit pesan" sempat tampil terus).
- Cache service worker naik ke versi 18.
