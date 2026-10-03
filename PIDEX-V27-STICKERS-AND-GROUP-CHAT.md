# Pelon V1 — V27 Stickers & Group Chat

## Perubahan yang dilakukan
- Menambahkan paket 50 stiker PNG transparan, dibuat dari logo Pelon dan kelima ikon AI custom yang sudah ada.
- Menambahkan pilihan **Stiker** ke menu tombol `+` pada chat utama Pelon dan chat grup. Pilihan foto, kamera, dan file tetap tersedia.
- Menambahkan tampilan stiker pada pesan pengguna dan dukungan tampilan `stickerId` untuk pesan AI.
- Menambahkan protokol token `[PELON_STICKER:1]` sampai `[PELON_STICKER:50]` untuk jawaban Pelon di chat utama.
- Menambahkan dukungan pembacaan `stickerId` atau token stiker pada pesan AI grup ketika gateway mengirimkannya.
- Mengubah tombol hapus pesan grup agar pengguna dapat menghapus pesan pengguna sendiri maupun pesan AI satu per satu.
- Fitur hapus seluruh percakapan grup tetap tersedia di pengaturan grup.
- Menegaskan latar grup tetap statis dan animasi dekoratif/avatar pada tampilan grup dinonaktifkan.

## Batasan integrasi saat ini
- UI chat utama Pelon sudah dapat menampilkan stiker dari respons AI melalui `stickerId`.
- AI grup dapat ditampilkan stikernya jika endpoint grup mengirim `stickerId` atau token `[PELON_STICKER:n]`. Implementasi gateway grup pada versi ini masih berupa stub yang sudah ada sebelumnya; pengaktifan respons AI grup tetap memerlukan konfigurasi provider grup.

## Area yang tidak diubah
Pidex, Pish, Oust, Pous, dan fitur lain di luar kebutuhan stiker serta kontrol percakapan grup tidak dirombak.
