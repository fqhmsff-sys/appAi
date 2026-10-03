# Pous — Bahasa Pemrograman Pelon

Pous adalah bahasa pemrograman buatan Pelon. Pous dirancang sebagai bahasa mandiri untuk membuat web, aplikasi, antarmuka, logic, data lokal, otomasi, dan integrasi runtime lain dari satu bahasa. Pous menjadi bahasa pemrograman yang paling dipahami oleh Pelon.

## Prinsip

- Satu bahasa untuk UI dan logic aplikasi.
- Tidak wajib menulis HTML, CSS, atau JavaScript.
- Runtime Pous berjalan langsung di Pidex.
- Sintaks sederhana tetapi dapat berkembang ke project besar.
- `use` menjadi fondasi bridge untuk runtime atau bahasa lain.
- Error harus terdeteksi sebelum project dijalankan.

## File dan runtime

- Ekstensi: `.pous`
- Runtime: Pous Runtime 1.0
- Editor: Pidex

## Struktur dasar

```pous
app "Aplikasi Saya"
version "1.0.0"
page home

text "Halo dunia!"

button "Mulai" {
    say "Aplikasi berjalan."
}
```

## UI

`text`, `heading`, `label`, `button`, `input`, `textarea`, `image`, `link`, `row`, `column`, `header`, `card`, `list`, `item`, `nav`, `modal`, `table`, `form`, `progress`, `switch`, `select`, `option`, `divider`, `spacer`.

## Logic

`set`, `let`, `const`, `if`, `else`, `elseif`, `repeat`, `while`, `for`, `in`, `fn`, `return`, `call`, `on`, `emit`, `try`, `catch`, `throw`, `break`, `continue`.

Blok dapat ditutup dengan `}`. Control/function juga mendukung `end`.

```pous
fn greet(name) {
    say "Halo " + name
}

if true
    greet "Pous"
end
```

## Data dan penyimpanan

`state`, `store`, `save`, `load`, `delete`, `clear`. Data lokal disimpan oleh runtime Pidex pada perangkat pengguna.

## Interoperabilitas

`use`, `run`, `call`, `fetch`, dan `await` disediakan sebagai fondasi integrasi. Pous tidak menggantikan bahasa lain; Pous dapat menjadi lapisan utama yang menghubungkan runtime lain.

Contoh konseptual:

```pous
use python "ai.py"
use javascript "special.js"
```

Bridge eksternal hanya dapat dijalankan apabila runtime yang diperlukan tersedia di lingkungan Pidex.

## Filosofi Pous

Pous bukan sekadar pembungkus HTML/CSS/JavaScript. Pous memiliki model aplikasi sendiri dan Pidex menerjemahkan model tersebut ke runtime yang tersedia.
