# Pidex V16 — Pous Final Core + Editor Gutter + Pish 2.0

## Pous
- Parser/diagnostics block handling diperbaiki agar `}` dan `end` hanya menutup blok yang benar.
- Mendukung nested block, `else`, `elseif`, `{}` dan `end`.
- Pous Runtime diperluas untuk UI, state, function, loop, conditions, persistence dasar, events, dan bridge foundations.
- Starter project menggunakan `lang.pous` dan hanya Pous.
- Pelon di Pidex mendapat instruksi khusus untuk menjadi ahli Pous ketika workspace Pous aktif.

## Editor
- Nomor baris dibuat satu-per-baris dan mengikuti scroll editor secara sinkron.
- Nomor baris tetap tersedia sampai baris terakhir.
- Highlight dan gutter disinkronkan secara vertikal/horizontal.

## Pish
- Identitas tetap sebagai shell resmi Pidex.
- Ditambah command project management, `projects`, `open-project`, `delete-project`, `rename-project`, `clean`, `du`, `count`, `lines`, dan `about`.
- Versi Pish menjadi 2.0.

## Runtime tambahan
- Tidak menambahkan runner bahasa baru yang belum dapat dijamin benar-benar berjalan di browser sandbox Pidex. Bahasa lain tetap dikenali editor dan dapat ditambahkan melalui runner/bridge terisolasi.
