# Pelon V1

Pelon is a single AI identity with a multi-provider gateway behind it.

## V1 status

The project currently contains:

- Premium monochrome Pelon UI
- Responsive desktop and mobile layout
- Light and dark mode
- Local conversation storage
- SVG interface icons
- Crisp SVG Pelon mark
- Chat streaming interface
- Cloudflare Worker gateway skeleton
- Mock gateway for frontend testing
- Provider adapter boundaries
- PWA manifest and service worker

## Visual rules

Pelon intentionally avoids the common blue or orange AI-app accent treatment.

The interface uses a monochrome visual identity so the product can establish its own recognizable language.

Interface icons are SVG.

The Pelon mark is an SVG asset and is kept as a standalone brand asset.

The interface avoids decorative emoji and typographic symbols used as UI icons.

## Architecture

```text
User
  |
  v
Pelon PWA
  |
  v
Cloudflare Worker
  |
  +-- Orchestrator
  +-- Router
  +-- Normalizer
  +-- Failover
  +-- Synthesis
  +-- Web access
  |
  +-- Gemini
  +-- SambaNova
  +-- Mistral
  +-- Cohere
  +-- GitHub Models
  +-- OpenRouter
  +-- Together
  +-- Pollinations
```

The browser must never receive provider API keys.

## Local API test

Versi ini sudah punya gateway lokal untuk mengetes API sebelum Pelon dipublish. Browser tetap tidak memegang API key; key dibaca Worker dari `.dev.vars`.

1. Salin `.dev.vars.example` menjadi `.dev.vars`.
2. Tempel API key milikmu hanya di `.dev.vars`.
3. Isi `PELON_ENABLED_PROVIDERS` dengan provider yang mau dites.
4. Jalankan Wrangler dari root project.
5. Buka alamat lokal yang diberikan Wrangler.

Contoh konfigurasi test:

`PELON_ENABLED_PROVIDERS=gemini,mistral,openrouter`

Jika lebih dari satu provider aktif, Pelon meminta kandidat jawaban secara paralel lalu memakai provider sintesis yang dipilih untuk menghasilkan satu jawaban final. Nama provider tidak dikirim ke UI.

Untuk test pertama, cukup aktifkan Gemini. Setelah itu tambah provider satu per satu agar mudah mengetahui provider mana yang gagal.

Jangan pernah mengirim API key ke chat atau memasukkannya ke frontend, GitHub, `localStorage`, atau `IndexedDB`. Untuk Gemini, dokumentasi resmi saat ini menggunakan header `x-goog-api-key`; endpoint `generateContent` juga tersedia untuk chat multi-turn.

## Next implementation stage

1. Confirm exact API/model endpoints for each provider.
2. Implement each provider adapter.
3. Add internal orchestration and synthesis.
4. Add web access.
5. Add file and image pipelines.
6. Add secure cross-app integration for Tanta, Hulhup, and Dotous.
7. Replace mock mode with production routing.


## Product completeness

The frontend now includes the main application shell, responsive layouts, chat, file/image/web surfaces, persona selection, settings, privacy, terms, about information, local persistence, theme switching, and PWA assets.

The remaining production work is primarily:
- provider API adapters
- orchestration and synthesis
- web access backend
- file/image processing backend
- Cloudflare Worker deployment
- secure Worker Secrets
- production QA

## Pidex
Pidex adalah workspace coding Pelon untuk mobile dan desktop. V1 mencakup editor responsif, line numbers, shortcut keyboard, copy, pemeriksaan dasar kode, preview JavaScript/HTML/CSS, Python melalui Pyodide WASM, serta integrasi AI Pelon. Dukungan runtime bahasa lain disiapkan untuk Runtime Manager dan sandbox backend.

## Pish

Pidex menggunakan shell miliknya sendiri bernama **Pish (Pidex Shell)**. Pish adalah shell virtual yang dibuat khusus untuk workspace Pidex. Command Pish mengelola file, folder, editor, diagnostics, preview, project, history, runtime, dan utilitas workspace.

## Runtime langsung

Runtime browser yang disediakan V4 mencakup JavaScript, HTML, CSS, Python melalui Pyodide, TypeScript melalui compiler TypeScript, SQL melalui SQL.js, Lua melalui Fengari, serta preview Markdown dan beberapa format data. Bahasa native seperti C/C++, Rust, Go, Java, dan lainnya membutuhkan runner terisolasi/WASM/server sandbox untuk eksekusi penuh.

## Grup AI
V1 UI kini memiliki ruang Grup: satu grup berisi pengguna sebagai pemimpin, Pelon sebagai AI utama, dan maksimal tiga AI custom. Setiap AI custom memiliki nama, karakter/sifat, peran, serta pilihan logo bawaan. Pesan grup disimpan sebagai pesan terpisah per anggota sehingga model percakapan mengikuti pola group chat, bukan satu output gabungan. Endpoint `/api/group-chat` sudah disiapkan; eksekusi AI multi-anggota tetap menunggu konfigurasi provider/API gateway produksi.
