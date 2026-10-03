# Media Chat Update

- Foto pada chat utama Pelon dan grup dirender sebagai gambar langsung, bukan nama berkas.
- Audio pada chat utama Pelon dan grup dirender dengan kontrol pemutar (play/pause, durasi, dan progress) sehingga suara diputar saat pengguna menekan tombol.
- Pemilihan file kini membaca data audio sebagai media dan menyimpan tipe audio, bukan memperlakukannya sebagai dokumen biasa.
- Renderer juga mengenali lampiran media berdasarkan MIME type atau ekstensi dan menerima sumber `dataUrl`, `url`, atau `src`.
- Lampiran media yang dikembalikan AI pada respons biasa maupun streaming ikut dirender.
- Cache service worker dinaikkan ke versi 17 agar pembaruan frontend tidak tertahan cache lama.
- Tidak mengubah fitur Pidex, Pish, Oust, Pous, konfigurasi provider, atau bagian lain yang tidak terkait.
