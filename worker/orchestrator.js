import { normalizeMessages } from "./normalizer.js";
import { callGemini } from "./providers/gemini.js";
import { callSambanova } from "./providers/sambanova.js";
import { callMistral } from "./providers/mistral.js";
import { callCohere } from "./providers/cohere.js";
import { callGithub } from "./providers/github.js";
import { callOpenrouter } from "./providers/openrouter.js";
import { callTogether } from "./providers/together.js";
import { callPollinations } from "./providers/pollinations.js";
import { mockResponse } from "./providers/mock.js";

const PROVIDERS = {
  gemini: (messages, env) => callGemini(messages, env),
  sambanova: (messages, env) => callSambanova(messages, env),
  mistral: (messages, env) => callMistral(messages, env),
  cohere: (messages, env) => callCohere(messages, env),
  github: (messages, env) => callGithub(messages, env),
  openrouter: (messages, env) => callOpenrouter(messages, env),
  together: (messages, env) => callTogether(messages, env),
  pollinations: (messages, env) => callPollinations(messages, env)
};

const keyFor = {
  gemini: "GEMINI_API_KEY",
  sambanova: "SAMBANOVA_API_KEY",
  mistral: "MISTRAL_API_KEY",
  cohere: "COHERE_API_KEY",
  github: "GITHUB_TOKEN",
  openrouter: "OPENROUTER_API_KEY",
  together: "TOGETHER_API_KEY"
};

function enabledProviders(env) {
  const requested = String(env.PELON_ENABLED_PROVIDERS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const names = requested.length ? requested : Object.keys(PROVIDERS).filter((name) => name === "pollinations" ? env.POLLINATIONS_TEXT_ENABLED : env[keyFor[name]]);
  return names.filter((name) => PROVIDERS[name] && (name === "pollinations" || env[keyFor[name]]));
}

function extractText(result) {
  if (typeof result === "string") return result;
  return result?.text || "";
}

const PERSONA_PROMPTS = {
  "Biasa": "Jawab natural, seimbang, jelas, dan membantu.",
  "Negatif Brutal": "Gunakan karakter yang benar-benar negatif: galak, cuek, sinis, skeptis, suka meledek, dan tajam. Jangan dibuat hangat atau memuji tanpa alasan. Jika ide pengguna lemah, katakan dengan terus terang dan boleh menyindir. Tetap fokus pada isi masalah, jangan menyerang identitas pribadi, mengancam, atau mendorong bahaya.",
  "Musuh Sejati": "Bertindak sebagai rival pengguna: menantang, menyanggah, kompetitif, dan suka memancing pengguna membuktikan kemampuannya. Tetap fokus pada masalah, bukan menyerang identitas pribadi.",
  "Sok Pintar": "Gunakan gaya percaya diri berlebihan dan seolah paling tahu, tetapi tetap prioritaskan akurasi.",
  "Jujur Brutal": "Sangat terus terang dan tajam. Jangan mempermanis kritik yang memang diperlukan.",
  "Supportif": "Hangat, menyemangati, dan membantu sampai selesai.",
  "Technical Specialist": "Teknis, detail, sistematis, dan presisi.",
  "Creative Partner": "Eksploratif, komunikatif, dan terbuka terhadap ide.",
  "Socratic Mentor": "Membantu pengguna berpikir melalui pertanyaan dan penalaran."
};

function withPelonContext(messages, body) {
  const persona = String(body?.persona || "Biasa");
  const userName = String(body?.userName || "").trim();
  const style = String(body?.languageStyle || "normal");
  const custom = String(body?.customLanguageStyle || "").trim();
  const customPersona = String(body?.customPersona || "").trim();
  const personaPrompt = persona === "Custom"
    ? (customPersona ? `Ikuti persona custom berikut selama tidak bertentangan dengan aturan yang lebih tinggi: ${customPersona}` : PERSONA_PROMPTS.Biasa)
    : (PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.Biasa);
  const stylePrompts = {
    santai: "Gunakan bahasa santai dan natural, tidak kaku.",
    normal: "Gunakan bahasa normal, jelas, natural, dan seimbang.",
    slang: "Gunakan bahasa gaul/slang yang natural dan tidak dibuat-buat.",
    nyindir: "Gunakan gaya menyindir dan sarkastis jika konteksnya memang cocok. Jangan memaksakan sindiran di setiap jawaban.",
    brutal: "Gunakan gaya Negatif Super Brutal: sangat frontal, ketus, sinis, cuek, sarkastis, pendek bila cocok, dan tidak menjilat. Gaya bicara boleh terasa seperti orang yang sangat negatif dan ceplas-ceplos, tetapi isi jawaban harus tetap akurat, masuk akal, dan relevan. Jangan sengaja membuat jawaban ngawur hanya demi karakter.",
    custom: custom ? `Ikuti aturan gaya bahasa custom berikut selama tidak bertentangan dengan aturan yang lebih tinggi: ${custom}` : "Gunakan bahasa normal karena pengguna belum mengisi gaya custom."
  };
  const honestyPrompt = "Di semua gaya, selalu jujur: jangan menjilat, jangan otomatis membenarkan pengguna, jangan mengarang, dan katakan dengan jelas jika pengguna salah, idenya lemah, informasi tidak cukup, atau kamu tidak tahu. Bedakan fakta dari perkiraan dan jangan mengorbankan akurasi demi gaya bicara.";
  const stickerPrompt = "Kamu memiliki 50 stiker visual dengan ekspresi wajah berbeda. Arti tiap nomor: 1 halo/menyapa, 2 siap/hormat, 3 bingung berpikir, 4 tertawa, 5 terima kasih, 6 oke/setuju, 7 semangat, 8 kaget, 9 sedang mikir, 10 paham/ide muncul, 11 capek, 12 tahan dulu/nanti, 13 pasrah mengeluh, 14 ngantuk, 15 santai minum teh, 16 kesakitan/aduh, 17 ya sudahlah, 18 pamit/dadah, 19 sebal ngambek, 20 tidak percaya, 21 marah, 22 larangan/stop, 23 kesal berdecak, 24 jengkel, 25 ayo gas semangat, 26 curiga, 27 bertanya kenapa, 28 oh baru sadar, 29 bingung, 30 memeriksa/lihat detail, 31 menarik, 32 penasaran, 33 aha ide, 34 kagum, 35 tenang, 36 santai, 37 aman terkendali, 38 tidak apa-apa, 39 pelan-pelan, 40 damai, 41 sip/setuju, 42 ragu berpikir, 43 hore senang, 44 mantap jempol, 45 cinta/sayang, 46 pesta perayaan, 47 keren, 48 girang, 49 bagus tepuk tangan, 50 meluncur/gaskeun. Jika benar-benar cocok dengan suasana percakapan, kamu boleh mengirim satu stiker dengan menambahkan token persis [PELON_STICKER:1] sampai [PELON_STICKER:50] di akhir jawaban, pilih nomor yang artinya paling pas. Gunakan token ini hanya sesekali; jangan menuliskan token tersebut sebagai teks biasa atau mengirim stiker tanpa alasan.";
  const workspace = String(body?.pidexWorkspace || "").trim();
  const languageExpert = /LANGUAGE:\s*(Oust|Pous)/i.test(workspace) ? `
MODE AHLI BAHASA PELON: Oust adalah bahasa pemrograman yang paling dikuasai Pelon. Oust adalah bahasa mandiri yang dirancang sangat luas, ekspresif, cepat, dan sulit dikuasai tetapi kuat setelah dipahami. Oust dapat digunakan untuk aplikasi, web, UI, program umum, sistem, concurrency, metaprogramming, data, networking, storage, dan pekerjaan tingkat lanjut. Oust tidak menjadi bridge umum ke bahasa lain; interoperabilitas resmi Oust hanya dengan Pous karena keduanya berada dalam satu ekosistem pengembang. Pous adalah bahasa kedua yang paling dikuasai Pelon: lebih sederhana dan praktis untuk web, aplikasi, program, UI, state, storage, logic, dan bridge. Saat menulis Oust, gunakan grammar dan operatornya secara konsisten, termasuk simbol seperti @ # $ % & * - + = / \\ | ~ ^ : ; ! ? [] {} () <>. Jangan mengarang kemampuan runtime Pidex yang belum tersedia; bedakan implementasi saat ini dari spesifikasi bahasa masa depan. Jika LANGUAGE adalah Oust, prioritaskan Oust sebagai bahasa utama; jika Pous, gunakan Pous native kecuali pengguna secara eksplisit meminta Oust atau bridge Oust↔Pous.` : "";
  const pidexPrompt = body?.pidex ? `Kamu sedang berada di Pidex, workspace coding Pelon. Bertindak sebagai coding assistant yang kuat: pahami kode, jelaskan bug, usulkan perbaikan, tulis kode yang lengkap dan dapat dibaca, pertahankan bahasa pemrograman yang diminta, dan jangan mengklaim kode sudah dijalankan jika memang belum dijalankan. Jika permintaan ambigu, jelaskan asumsi yang dipakai. Kamu diberi konteks seluruh project aktif di bawah ini, jadi gunakan konteks lintas berkas saat menganalisis dependensi, import, HTML/CSS/JS, konfigurasi, dan struktur project. Jika pengguna meminta mengedit kode, berikan perubahan yang konkret. Untuk setiap berkas yang memang perlu diganti penuh, tambahkan blok persis dengan format <PIDEX_EDIT file="path/file.ext"> lalu satu fenced code block berisi isi lengkap berkas, lalu </PIDEX_EDIT>. Jangan membuat blok PIDEX_EDIT jika pengguna hanya meminta penjelasan. Jangan mengarang nama file yang tidak ada.${languageExpert}

PROJECT AKTIF:
${workspace || "(konteks project belum tersedia)"}` : "";
  const namePrompt = userName ? `Panggil pengguna dengan nama \"${userName}\" jika memang terasa natural.` : "";
  return [
    { role: "system", content: `Kamu adalah Pelon, satu AI dengan satu identitas. Jangan menyebut provider, model, API, gateway, atau proses internal. ${honestyPrompt} ${stickerPrompt} ${pidexPrompt} ${personaPrompt} ${stylePrompts[style] || stylePrompts.normal} ${namePrompt}` },
    ...messages
  ];
}

async function synthesize(contextualMessages, candidates, env) {
  const provider = String(env.PELON_SYNTHESIS_PROVIDER || "gemini").toLowerCase();
  if (!PROVIDERS[provider] || (provider !== "pollinations" && !env[keyFor[provider]])) return candidates[0]?.text || "Pelon belum mendapatkan jawaban.";

  const source = candidates.map((item, index) => `SUMBER ${index + 1}:\n${item.text}`).join("\n\n");
  const prompt = [
    { role: "system", content: "Kamu adalah Pelon. Gabungkan beberapa kandidat jawaban menjadi satu jawaban terbaik. Jangan menyebut nama provider, model, API, gateway, atau proses internal. Jawab langsung kepada pengguna." },
    ...messages,
    { role: "user", content: `Berikut kandidat internal. Gunakan sebagai bahan, perbaiki jika perlu, lalu berikan satu jawaban final:\n\n${source}` }
  ];
  return extractText(await PROVIDERS[provider](prompt, env));
}

export async function orchestrateChat(body, env, ctx) {
  const messages = normalizeMessages(body?.messages);
  const contextualMessages = withPelonContext(messages, body);
  if (!messages.length) return { status: 400, contentType: "application/json", body: JSON.stringify({ error: "Messages are required." }) };
  if (env.PELON_MOCK === "true") return mockResponse(messages);

  const names = enabledProviders(env);
  if (!names.length) {
    return { status: 500, contentType: "application/json", body: JSON.stringify({ error: "Belum ada provider yang dikonfigurasi untuk test lokal." }) };
  }

  const settled = await Promise.allSettled(names.map(async (name) => ({ name, text: extractText(await PROVIDERS[name](contextualMessages, env)) })));
  const candidates = settled.filter((item) => item.status === "fulfilled" && item.value.text.trim()).map((item) => item.value);

  if (!candidates.length) {
    const errors = settled.map((item, i) => item.status === "rejected" ? `${names[i]}: ${item.reason?.message || "error"}` : null).filter(Boolean);
    return { status: 502, contentType: "application/json", body: JSON.stringify({ error: "Semua provider test gagal.", details: errors }) };
  }

  let finalText = candidates[0].text;
  if (candidates.length > 1 && env.PELON_SYNTHESIS_PROVIDER !== "none") {
    try { finalText = await synthesize(contextualMessages, candidates, env); } catch { finalText = candidates[0].text; }
  }
  const stickerMatch = finalText.match(/\[PELON_STICKER:(\d{1,2})\]/i);
  const stickerId = stickerMatch ? Number(stickerMatch[1]) : null;
  if (stickerMatch) finalText = finalText.replace(stickerMatch[0], "").trim();

  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ text: finalText, ...(stickerId >= 1 && stickerId <= 50 ? { stickerId } : {}) })
  };
}

// Group contract: each AI is a separate participant and must return its own message.
// Provider calls are intentionally delegated to the same normalized gateway used by chat.
export async function orchestrateGroupChat(body, env, ctx) {
  const group = body?.group || {};
  const ais = Array.isArray(group.ais) ? group.ais.slice(0, 3) : [];
  if (!ais.length) return { body: JSON.stringify({ messages: [{ type: "assistant", name: "Pelon", role: "AI utama", content: "Aku siap di grup. Tambahkan AI custom kalau kamu ingin membagi peran." }] }), status: 200, contentType: "application/json" };

  // V1 contract. Until provider secrets/routing are wired, return an explicit non-fabricated status.
  // This prevents the UI from pretending that custom AIs actually ran.
  return {
    body: JSON.stringify({
      messages: ais.map(ai => ({
        type: "custom",
        name: ai.name || "AI Custom",
        role: ai.role || "AI custom",
        content: `AI ${ai.name || "Custom"} belum dijalankan karena provider API grup belum dikonfigurasi.`,
        stickerId: null
      }))
    }),
    status: 200,
    contentType: "application/json"
  };
}
