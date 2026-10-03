# Oust Final 1.0

Oust adalah bahasa pemrograman general-purpose tingkat lanjut dalam ekosistem Pelon. Oust adalah bahasa yang paling dikuasai Pelon; Pous adalah bahasa kedua. Oust dirancang untuk web, aplikasi, UI, data, jaringan, server, sistem, tooling, concurrency, metaprogramming, matematika, dan pekerjaan pemrograman tingkat lanjut.

## Prinsip final

- Grammar deterministik dan konsisten.
- Simbol bukan dekorasi: setiap simbol resmi memiliki arti.
- Satu error sintaks/grammar membuat seluruh program Oust gagal build dan tidak boleh dieksekusi.
- Saat ada error, blok terdampak ditandai merah dari pembuka blok sampai akhir blok; jika struktur blok tidak dapat dipastikan, seluruh file dikunci merah sampai error diperbaiki.
- Oust bersifat fail-closed: tidak ada partial execution.
- Kompleksitas Oust berasal dari kedalaman kemampuan, bukan aturan acak.
- Target desain performa tinggi; kesulitan bahasa tidak berarti runtime harus lambat.
- Interoperabilitas resmi Oust hanya dengan Pous.

## Ekstensi

`*.oust`

## Simbol resmi

| Simbol | Fungsi |
|---|---|
| `@` | decorator/metadata |
| `#` | directive |
| `$` | binding/reference identifier |
| `&` | reference/borrow |
| `&&` | logical AND |
| `|` | pipeline/union |
| `||` | logical OR |
| `•` | member/composition |
| `√` | square root |
| `π` | mathematical pi |
| `∆` | delta/change |
| `×` | multiplication |
| `÷` | division |
| `^` | power |
| `~` | transform/bitwise context |
| `!` | negation/force |
| `?` | optional/conditional marker |
| `:` | type/label separator |
| `;` | statement terminator |
| `=` | assignment |
| `:=` | definition binding |
| `==` | equality |
| `!=` | inequality |
| `< >` | comparison/generic context |
| `<= >=` | ordered comparison |
| `=>` | lambda/map |
| `->` | return/type flow |
| `::` | namespace/path |
| `??` | null coalescing |
| `?.` | optional member access |
| `+ - * / %` | arithmetic |
| `` ` `` | raw/template delimiter |
| `\` | escape |
| `"` | string delimiter |
| `'` | character/string delimiter |
| `,` | argument/list separator |
| `.` | member/decimal separator |
| `[ ]` | collection/indexing |
| `{ }` | block/object |
| `( )` | call/grouping |
| `§` | section marker |
| `£ ¢ € ¥` | currency literals/values |
| `°` | degree conversion |
| `© ® ™` | metadata markers |
| `✓` | assertion/verified marker |

## Core language

Oust mencakup konsep seperti:

- immutable dan mutable bindings
- static typing dan type declarations
- generics
- `struct`, `enum`, `trait`, `impl`, interface/union model
- functions, lambdas, closures, namespaces, modules
- pattern matching
- conditional dan loop control
- async/await, spawn, parallel, atomic, lock, channel, select
- exception/error flow, `try/catch/finally`, `throw`, `assert`
- decorators, macros, compile-time execution, inline/extern/native boundaries
- UI/component/page/state/store primitives
- data, networking, filesystem, server, web, API, graphics, audio, dan sistem
- metaprogramming dan compile-time tooling
- interoperabilitas resmi dengan Pous

## Strict execution

Contoh error: program berikut tidak pernah dijalankan sebagian.

```oust
app "Demo" {
    let x := 10
    ???
    text "Tidak akan dijalankan"
}
```

Satu error menyebabkan build Oust gagal. Pidex menampilkan diagnostic dan memblokir Run sampai seluruh error diperbaiki.

## Pidex

Pidex menggunakan Oust sebagai runtime bahasa tingkat lanjutnya. File baru Oust memakai ekstensi `.oust`. Runtime browser Pidex menjalankan core executable yang aman untuk sandbox, sementara arsitektur bahasa Oust tetap dirancang general-purpose dan dapat memiliki backend native/sandbox yang lebih dalam.

## Status

**Oust Final 1.0 — spesifikasi bahasa dikunci.** Perubahan setelah ini hanya berupa bug-fix implementasi, optimasi runtime/compiler, standard library, atau penambahan backend tanpa mengubah identitas dan aturan inti bahasa secara sembarangan.
