# Pidex V18 — Oust Final 1.0

## Oust
- Oust ditetapkan sebagai bahasa final 1.0 pada level spesifikasi.
- Oust tetap menjadi bahasa yang paling dikuasai Pelon; Pous adalah bahasa kedua.
- Grammar dibuat strict dan fail-closed.
- Satu error Oust memblokir seluruh Run/build.
- Error Oust memberi cascade highlight merah ke seluruh file ketika struktur blok tidak aman untuk dieksekusi.
- Block syntax menggunakan `{}` dan divalidasi secara deterministik.
- Unknown statement, unknown symbol, invalid decorator, unterminated string, dan block mismatch menghasilkan diagnostic.
- Symbol set resmi Oust didokumentasikan di `OUST.md`.
- Arithmetic/symbol expression core: `+ - * / % ^ × ÷ √ π ∆`.
- Flow/type/namespace symbols: `=> -> :: ?? ?.`.
- Reference/collection/block/call symbols: `$ & [ ] { } ( )`.
- Metadata/directive symbols: `@ # © ® ™ ✓ §`.
- Literal/format symbols: `" ' ` \\ , . £ ¢ € ¥ °`.
- Oust hanya memiliki interoperabilitas resmi dengan Pous.

## Runtime Pidex
- Oust runtime diperbarui untuk strict pre-run validation.
- UI blocks, variables, expressions, conditions, loops, functions, input, buttons, output, assertions, throw, dan Pous bridge core dipertahankan/ditingkatkan.
- Runtime tidak dijalankan sama sekali jika diagnostics Oust memiliki error.

## Service worker
- Cache dinaikkan ke `pelon-v1-pidex-final-15` agar perubahan V18 tidak tertahan cache V17.
