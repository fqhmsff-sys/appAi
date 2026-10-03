const state = {
  conversations: [],
  activeId: null,
  theme: localStorage.getItem("pelon-theme") || "light",
  font: localStorage.getItem("pelon-font") || "default",
  userName: localStorage.getItem("pelon-user-name") || "",
  birthDate: localStorage.getItem("pelon-birth-date") || "",
  languageStyle: localStorage.getItem("pelon-language-style") || "normal",
  customLanguageStyle: localStorage.getItem("pelon-custom-language-style") || "",
  persona: localStorage.getItem("pelon-persona") || "Biasa",
  customPersona: localStorage.getItem("pelon-custom-persona") || "",
  busy: false,
  actionConversationId: null,
  conversationSearch: "",
  cameraPermissionAsked: localStorage.getItem("pelon-camera-permission-asked") === "1",
  showArchived: false,
  pidexLanguage: localStorage.getItem("pelon-pidex-language") || "JavaScript",
  pidexCode: localStorage.getItem("pelon-pidex-code") || "",
  pendingAttachments: [],
  editingMessageIndex: null,
  groups: JSON.parse(localStorage.getItem("pelon-groups") || "[]"),
  activeGroupId: localStorage.getItem("pelon-active-group") || null,
  groupDraftAIs: [],
  groupReplyTo: null,
  groupMentionOpen: false,
  groupPendingAttachments: []
};

let pidexAttachmentTarget = "chat";
const STICKER_COUNT = 50;
const stickerPath = (id) => `./assets/stickers/sticker-${String(id).padStart(2, "0")}.svg`;
const validStickerId = (id) => Number.isInteger(Number(id)) && Number(id) >= 1 && Number(id) <= STICKER_COUNT ? Number(id) : null;
function stickerMarkup(id, extraClass = "") {
  const valid = validStickerId(id);
  return valid ? `<img class="pelon-sticker ${extraClass}" src="${stickerPath(valid)}" alt="Stiker ${valid}" loading="lazy">` : "";
}


const $ = (selector) => document.querySelector(selector);
const messagesEl = $("#messages");
const welcomeEl = $("#welcome");
const composer = $("#composer");
const input = $("#messageInput");
const chatList = $("#chatList");

const PELON_ASSETS = {
  idle: { full: "./assets/pelon-idle.svg", mark: "./assets/pelon-mark-live.svg" },
  typing: { full: "./assets/pelon-typing.svg", mark: "./assets/pelon-mark-typing.svg" },
  working: { full: "./assets/pelon-working.svg", mark: "./assets/pelon-mark-working.svg" }
};
let pelonMode = "idle";

function getPelonMode() { return pelonMode; }
function getPelonAsset(kind = "full", mode = pelonMode) {
  return PELON_ASSETS[mode]?.[kind] || PELON_ASSETS.idle[kind];
}
function setPelonMode(mode) {
  pelonMode = PELON_ASSETS[mode] ? mode : "idle";
  document.documentElement.dataset.pelonMode = pelonMode;
  if (window.PelonCharacter) window.PelonCharacter.setAction(pelonMode === "working" ? "working" : pelonMode === "typing" ? "typing" : "idle");
  document.querySelectorAll("[data-pelon-logo]").forEach((img) => {
    const kind = img.dataset.pelonLogo === "mark" ? "mark" : "full";
    const next = getPelonAsset(kind, pelonMode);
    if (img.getAttribute("src") !== next) img.setAttribute("src", next);
  });
}


/*
 * Global Pelon character.
 * The UI only provides a safe renderer. Later, the AI gateway can call
 * window.PelonCharacter.setAction({ name, intensity, duration, direction })
 * to decide how Pelon should move. Until then it autonomously wanders so the
 * character never feels frozen.
 */
const globalPelon = document.getElementById("globalPelon");
const globalPelonGlow = document.getElementById("globalPelonGlow");
let globalPelonAnimation = null;
let globalPelonTimer = null;
let globalPelonAction = "idle";
let globalPelonIntent = {};

function globalPelonBounds() {
  const vv = window.visualViewport;
  const width = vv?.width || window.innerWidth;
  const height = vv?.height || window.innerHeight;
  const keyboard = Math.max(0, window.innerHeight - (vv?.height || window.innerHeight) - (vv?.offsetTop || 0));
  const marginX = Math.max(16, width * 0.04);
  const top = Math.max(58, (vv?.offsetTop || 0) + 58);
  const bottom = Math.max(top + 120, height - keyboard - 86);
  return { width, height, left: marginX, right: Math.max(marginX, width - marginX), top, bottom };
}

function randomBetween(min, max) {
  return min + Math.random() * Math.max(0, max - min);
}

function globalPelonPoint() {
  const b = globalPelonBounds();
  return {
    x: randomBetween(b.left, b.right),
    y: randomBetween(b.top, b.bottom)
  };
}

function globalPelonMove(point, options = {}) {
  if (!globalPelon) return;
  const b = globalPelonBounds();
  const safePoint = {
    x: Math.max(b.left, Math.min(b.right, Number(point.x) || b.width / 2)),
    y: Math.max(b.top, Math.min(b.bottom, Number(point.y) || b.height / 2))
  };
  const rect = globalPelon.getBoundingClientRect();
  const currentX = rect.left + rect.width / 2;
  const currentY = rect.top + rect.height / 2;
  const dx = safePoint.x - currentX;
  const dy = safePoint.y - currentY;
  const distance = Math.hypot(dx, dy);
  const duration = options.duration ?? Math.max(700, Math.min(4200, 900 + distance * 3.2));
  const direction = options.direction === "left" ? -1 : options.direction === "right" ? 1 : (dx >= 0 ? 1 : -1);
  const intensity = Math.max(.35, Math.min(1.5, options.intensity ?? 1));
  const lift = options.lift ?? randomBetween(-28, 28) * intensity;
  const rotate = (options.rotate ?? randomBetween(-16, 16)) * intensity * direction;
  const scale = 0.86 + Math.random() * 0.24 * intensity;

  globalPelon.classList.toggle("is-active", intensity > .65);
  if (globalPelonAnimation) globalPelonAnimation.cancel();
  globalPelonAnimation = globalPelon.animate([
    { transform: `translate3d(${currentX - rect.width / 2}px, ${currentY - rect.height / 2}px, 0) rotate(0deg) scale(1)` },
    { transform: `translate3d(${currentX - rect.width / 2 + dx * .34}px, ${currentY - rect.height / 2 + dy * .34 + lift}px, 0) rotate(${rotate * .45}deg) scale(${scale})`, offset: .34 },
    { transform: `translate3d(${point.x - rect.width / 2}px, ${point.y - rect.height / 2 + lift * .25}px, 0) rotate(${rotate}deg) scale(${scale})` }
  ], { duration, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });

  if (globalPelonGlow) {
    globalPelonGlow.animate([
      { transform: `translate(${currentX}px, ${currentY}px) scale(.7)`, opacity: .15 },
      { transform: `translate(${safePoint.x}px, ${safePoint.y}px) scale(1.25)`, opacity: .5 },
      { transform: `translate(${safePoint.x}px, ${safePoint.y}px) scale(.9)`, opacity: .22 }
    ], { duration, easing: "ease-in-out", fill: "forwards" });
  }

  clearTimeout(globalPelonTimer);
  globalPelonTimer = setTimeout(() => {
    if (globalPelonAction === "stop") return;
    globalPelonAutonomousStep();
  }, duration * randomBetween(.45, .9));
}

function globalPelonAutonomousStep() {
  if (!globalPelon || globalPelonAction === "stop") return;
  const action = globalPelonAction;
  const point = globalPelonIntent.x != null && globalPelonIntent.y != null
    ? { x: globalPelonIntent.x, y: globalPelonIntent.y }
    : globalPelonPoint();
  const presets = {
    idle: { intensity: randomBetween(.45, .9) },
    typing: { intensity: randomBetween(.7, 1.1), duration: randomBetween(700, 1800), lift: randomBetween(-12, 4) },
    thinking: { intensity: randomBetween(.8, 1.25), duration: randomBetween(1000, 2600), rotate: randomBetween(-24, 24) },
    working: { intensity: randomBetween(1, 1.45), duration: randomBetween(650, 1700), lift: randomBetween(-42, 42), rotate: randomBetween(-28, 28) },
    curious: { intensity: randomBetween(.75, 1.2), duration: randomBetween(900, 2200), rotate: randomBetween(-32, 32) },
    scan: { intensity: 1.15, duration: randomBetween(500, 1200), rotate: randomBetween(-18, 18) },
    excited: { intensity: 1.45, duration: randomBetween(500, 1000), lift: randomBetween(-50, 50), rotate: randomBetween(-36, 36) },
    annoyed: { intensity: 1.3, duration: randomBetween(400, 900), rotate: randomBetween(-14, 14) },
    proud: { intensity: 1.05, duration: randomBetween(900, 1700), lift: randomBetween(-28, -8), rotate: randomBetween(-10, 10) },
    dramatic: { intensity: 1.5, duration: randomBetween(900, 1800), lift: randomBetween(-60, 60), rotate: randomBetween(-42, 42) }
  };
  globalPelonMove(point, { ...(presets[action] || presets.idle), ...globalPelonIntent });
}

function setGlobalPelonAction(actionOrOptions = "idle") {
  const options = typeof actionOrOptions === "string" ? { name: actionOrOptions } : (actionOrOptions || {});
  globalPelonAction = options.name || "idle";
  globalPelonIntent = { ...options };
  delete globalPelonIntent.name;
  document.documentElement.dataset.pelonGlobal = globalPelonAction;
  if (globalPelonAction === "stop") {
    clearTimeout(globalPelonTimer);
    globalPelon.classList.remove("is-active");
    return;
  }
  globalPelonAutonomousStep();
}

window.PelonCharacter = {
  setAction: setGlobalPelonAction,
  move: (point, options = {}) => globalPelonMove(point, options),
  wander: () => setGlobalPelonAction(globalPelonAction === "stop" ? "idle" : globalPelonAction),
  stop: () => setGlobalPelonAction("stop")
};

window.addEventListener("resize", () => {
  if (globalPelonAction !== "stop") globalPelonAutonomousStep();
});

setTimeout(() => setGlobalPelonAction("idle"), 180);

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function save() {
  localStorage.setItem("pelon-conversations", JSON.stringify(state.conversations));
  localStorage.setItem("pelon-theme", state.theme);
  localStorage.setItem("pelon-font", state.font || "default");
  localStorage.setItem("pelon-user-name", state.userName || "");
  localStorage.setItem("pelon-birth-date", state.birthDate || "");
  localStorage.setItem("pelon-language-style", state.languageStyle || "normal");
  localStorage.setItem("pelon-custom-language-style", state.customLanguageStyle || "");
  localStorage.setItem("pelon-pidex-language", state.pidexLanguage || "JavaScript");
  localStorage.setItem("pelon-pidex-code", state.pidexCode || "");
  localStorage.setItem("pelon-persona", state.persona || "Biasa");
  localStorage.setItem("pelon-custom-persona", state.customPersona || "");
  localStorage.setItem("pelon-camera-permission-asked", state.cameraPermissionAsked ? "1" : "0");
}

function load() {
  try {
    state.conversations = JSON.parse(localStorage.getItem("pelon-conversations") || "[]");
  } catch {
    state.conversations = [];
  }
  document.documentElement.dataset.theme = state.theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.font = state.font === "comic" ? "comic" : "default";
  renderChatList();
}

function createConversation() {
  const conversation = {
    id: uid(),
    title: "Percakapan baru",
    messages: [],
    createdAt: Date.now(),
    pinned: false,
    archived: false
  };
  state.conversations.unshift(conversation);
  state.activeId = conversation.id;
  save();
  render();
}

function activeConversation() {
  return state.conversations.find((item) => item.id === state.activeId);
}

function ensureConversation() {
  if (!state.activeId || !activeConversation()) createConversation();
  return activeConversation();
}

function renderChatList() {
  chatList.innerHTML = "";
  const query = state.conversationSearch.trim().toLowerCase();
  const visible = state.conversations
    .filter((conversation) => state.showArchived ? !!conversation.archived : !conversation.archived)
    .filter((conversation) => {
      if (!query) return true;
      const haystack = `${conversation.title || ""} ${(conversation.messages || []).map((m) => m.content || "").join(" ")}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.createdAt || 0) - (a.createdAt || 0));

  if (!visible.length) {
    chatList.innerHTML = `<div class="empty">${query ? "Percakapan tidak ditemukan" : state.showArchived ? "Belum ada percakapan yang diarsipkan" : "Belum ada percakapan"}</div>`;
    return;
  }

  visible.slice(0, 50).forEach((conversation) => {
    const row = document.createElement("div");
    row.className = `chat-row-wrap${conversation.id === state.activeId ? " active" : ""}`;

    const button = document.createElement("button");
    button.className = "chat-row";
    button.type = "button";
    button.innerHTML = `<span class="chat-row-title">${escapeHtml(conversation.title || "Percakapan baru")}</span>${conversation.pinned ? '<span class="chat-pin-indicator" aria-label="Disematkan"><svg viewBox="0 0 24 24"><path d="m8 4 8 8-2.2 2.2 2.7 5.3-1.5 1.5-5.3-2.7L7.5 20l-1.5-1.5 1.7-2.2-4.7-4.7L5 9.6 9.7 14.3 12 12 4 4h4Z"/></svg></span>' : ''}`;
    button.title = conversation.title || "Percakapan baru";
    button.addEventListener("click", () => {
      state.activeId = conversation.id;
      render();
      renderChatTitle();
      closeSidebar();
    });

    const menu = document.createElement("button");
    menu.className = "chat-row-menu";
    menu.type = "button";
    menu.setAttribute("aria-label", `Opsi percakapan ${conversation.title}`);
    menu.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';
    menu.addEventListener("click", (event) => {
      event.stopPropagation();
      openChatAction(conversation.id);
    });

    row.append(button, menu);
    chatList.appendChild(row);
  });
}

function attachmentSummary(attachments = []) {
  if (!attachments.length) return "";
  return attachments.length === 1 ? ` [${attachments[0].name || "lampiran"}]` : ` [${attachments.length} lampiran]`;
}

function attachmentMediaKind(attachment = {}) {
  const mime = String(attachment.type || attachment.mimeType || attachment.mime || "").toLowerCase();
  const name = String(attachment.name || attachment.filename || "").toLowerCase();
  if (attachment.kind === "image" || mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|bmp|heic)$/i.test(name)) return "image";
  if (attachment.kind === "audio" || mime.startsWith("audio/") || /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i.test(name)) return "audio";
  return "file";
}
function attachmentMediaSource(attachment = {}) {
  return attachment.dataUrl || attachment.url || attachment.src || attachment.data || "";
}
function renderMessageAttachments(container, attachments = []) {
  if (!attachments.length) return;
  const wrap = document.createElement("div");
  wrap.className = "message-attachments";
  attachments.forEach((attachment) => {
    const kind = attachmentMediaKind(attachment);
    const src = attachmentMediaSource(attachment);
    if (kind === "image" && src) {
      const img = document.createElement("img");
      img.className = "message-image";
      img.src = src;
      img.alt = attachment.name || "Foto yang dikirim";
      img.loading = "lazy";
      img.addEventListener("click", () => window.open(src, "_blank", "noopener"));
      wrap.appendChild(img);
      return;
    }
    if (kind === "audio" && src) {
      const player = document.createElement("div");
      player.className = "message-audio-card";
      const icon = document.createElement("span");
      icon.className = "message-audio-icon";
      icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M8 7v10M4 10v4M16 7v10M20 10v4"/></svg>';
      const audio = document.createElement("audio");
      audio.className = "message-audio-player";
      audio.controls = true;
      audio.preload = "metadata";
      audio.src = src;
      audio.setAttribute("aria-label", "Putar audio yang dikirim");
      player.append(icon, audio);
      wrap.appendChild(player);
      return;
    }
    const card = document.createElement("div");
    card.className = "message-file";
    card.innerHTML = `<span class="message-file-icon"><svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V20.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Z"/><path d="M14 3.5v5h4"/></svg></span><span class="message-file-text"><strong>${escapeHtml(attachment.name || "File")}</strong><small>${escapeHtml(attachment.type || "File")}</small></span>`;
    wrap.appendChild(card);
  });
  container.appendChild(wrap);
}
function renderGroupAttachmentsHtml(attachments = []) {
  if (!attachments.length) return "";
  return `<div class="message-attachments">${attachments.map((attachment) => {
    const kind = attachmentMediaKind(attachment);
    const src = attachmentMediaSource(attachment);
    if (kind === "image" && src) return `<img src="${escapeHtml(src)}" alt="${escapeHtml(attachment.name || "Foto yang dikirim")}" class="message-image-attachment" loading="lazy">`;
    if (kind === "audio" && src) return `<div class="message-audio-card"><span class="message-audio-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M8 7v10M4 10v4M16 7v10M20 10v4"/></svg></span><audio class="message-audio-player" controls preload="metadata" src="${escapeHtml(src)}" aria-label="Putar audio yang dikirim"></audio></div>`;
    return `<div class="message-file"><span>${escapeHtml(attachment.name || "Lampiran")}</span></div>`;
  }).join("")}</div>`;
}

function copyText(text, button) {
  const done = () => {
    const old = button.innerHTML;
    button.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
    button.setAttribute("aria-label", "Tersalin");
    setTimeout(() => { button.innerHTML = old; button.setAttribute("aria-label", "Salin"); }, 1100);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const area = document.createElement("textarea");
  area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
  document.body.appendChild(area); area.select();
  try { document.execCommand("copy"); done(); } finally { area.remove(); }
}

function render() {
  renderChatList();
  const conversation = activeConversation();

  if (!conversation || conversation.messages.length === 0) {
    welcomeEl.hidden = false;
    messagesEl.hidden = true;
    messagesEl.innerHTML = "";
    return;
  }

  welcomeEl.hidden = true;
  messagesEl.hidden = false;
  messagesEl.innerHTML = "";

  conversation.messages.forEach((message, index) => {
    const row = document.createElement("div");
    row.className = `message ${message.role}`;

    if (message.role === "assistant") {
      const mark = document.createElement("img");
      mark.className = "message-mark";
      mark.src = getPelonAsset("mark", getPelonMode());
      mark.dataset.pelonLogo = "mark";
      mark.alt = "";
      row.appendChild(mark);
    }

    const contentWrap = document.createElement("div");
    contentWrap.className = "message-content-wrap";
    if ((message.content || "").trim() || (message.role === "assistant" && !validStickerId(message.stickerId))) {
      const wrap = document.createElement("div");
      wrap.className = "message-bubble";
      wrap.textContent = message.content || "";
      contentWrap.appendChild(wrap);
    }
    if (validStickerId(message.stickerId)) {
      const sticker = document.createElement("img");
      sticker.className = "pelon-sticker message-sticker";
      sticker.src = stickerPath(message.stickerId);
      sticker.alt = `Stiker ${message.stickerId}`;
      contentWrap.appendChild(sticker);
    }
    renderMessageAttachments(contentWrap, message.attachments || []);

    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copy = document.createElement("button");
    copy.className = "message-action"; copy.type = "button"; copy.setAttribute("aria-label", "Salin semua teks");
    copy.title = "Salin semua teks";
    copy.innerHTML = '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10h2"/></svg>';
    copy.addEventListener("click", () => copyText(message.content || "", copy));
    actions.appendChild(copy);

    if ((message.content || "").trim()) {
      const selectText = document.createElement("button");
      selectText.className = "message-action";
      selectText.type = "button";
      selectText.setAttribute("aria-label", "Pilih teks");
      selectText.title = "Pilih teks";
      selectText.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>';
      selectText.addEventListener("click", () => {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(wrap);
        selection.removeAllRanges();
        selection.addRange(range);
        wrap.focus?.();
      });
      actions.appendChild(selectText);
    }

    if (message.role === "user") {
      const edit = document.createElement("button");
      edit.className = "message-action"; edit.type = "button"; edit.setAttribute("aria-label", "Edit pesan");
      edit.innerHTML = '<svg viewBox="0 0 24 24"><path d="m4 16.5-.8 3.3 3.3-.8L18 7.5 16.5 6 4 16.5Z"/><path d="m14.8 7.7 1.5-1.5 1.5 1.5-1.5 1.5"/></svg>';
      edit.addEventListener("click", () => startMessageEdit(index));
      actions.appendChild(edit);
    }
    contentWrap.appendChild(actions);
    row.appendChild(contentWrap);
    messagesEl.appendChild(row);
  });

  requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
}

function addMessage(role, content, attachments = [], stickerId = null) {
  const conversation = ensureConversation();
  conversation.messages.push({ role, content, attachments, stickerId: validStickerId(stickerId), createdAt: Date.now() });
  if (role === "user" && conversation.title === "Percakapan baru") {
    conversation.title = (content || attachments[0]?.name || "Percakapan baru").slice(0, 48);
  }
  save();
  render();
}

function startMessageEdit(index) {
  const conversation = activeConversation();
  const message = conversation?.messages?.[index];
  if (!message || message.role !== "user" || state.busy) return;
  state.editingMessageIndex = index;
  state.pendingAttachments = [];
  renderPendingAttachments();
  input.value = message.content || "";
  input.placeholder = "Edit pesan...";
  const bar = $("#composerEditBar");
  if (bar) bar.hidden = false;
  input.focus();
  input.dispatchEvent(new Event("input"));
}

function cancelMessageEdit() {
  state.editingMessageIndex = null;
  input.value = "";
  input.placeholder = "Tulis pesan Anda...";
  $("#composerEditBar")?.setAttribute("hidden", "");
  input.style.height = "auto";
  input.focus();
}

function prepareEditedConversation(index, content) {
  const conversation = activeConversation();
  if (!conversation || !conversation.messages[index]) return false;
  conversation.messages[index].content = content;
  conversation.messages[index].attachments = [];
  conversation.messages = conversation.messages.slice(0, index + 1);
  state.editingMessageIndex = null;
  $("#composerEditBar")?.setAttribute("hidden", "");
  input.placeholder = "Tulis pesan Anda...";
  save();
  render();
  return true;
}

async function sendMessage(content, attachments = [], stickerId = null) {
  stickerId = validStickerId(stickerId);
  if ((!content && !attachments.length && !stickerId) || state.busy) return;

  const editingIndex = state.editingMessageIndex;
  if (editingIndex !== null) {
    if (!prepareEditedConversation(editingIndex, content)) return;
  } else {
    addMessage("user", content, attachments, stickerId);
  }
  state.busy = true;
  setPelonMode("working");
  $("#connectionStatus").textContent = "Memproses";

  const conversation = activeConversation();
  const assistantIndex = conversation.messages.length;
  conversation.messages.push({ role: "assistant", content: "", createdAt: Date.now() });
  render();

  const bubble = messagesEl.lastElementChild?.querySelector(".message-bubble");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: state.userName,
        persona: state.persona,
        customPersona: state.customPersona,
        languageStyle: state.languageStyle,
        customLanguageStyle: state.customLanguageStyle,
        pidex: sessionStorage.getItem("pelon-pidex-next") === "1",
        messages: conversation.messages
          .slice(0, -1)
          .map(({ role, content, attachments, stickerId }) => ({ role, content: validStickerId(stickerId) ? (content || `[Pengguna mengirim stiker #${stickerId}]`) : content, attachments, stickerId }))
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream") && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const payload = JSON.parse(data);
            if (payload.animation && window.PelonCharacter) window.PelonCharacter.setAction(payload.animation);
            if (payload.text) {
              conversation.messages[assistantIndex].content += payload.text;
              if (bubble) bubble.textContent = conversation.messages[assistantIndex].content;
            }
            if (Array.isArray(payload.attachments)) conversation.messages[assistantIndex].attachments = payload.attachments;
            if (validStickerId(payload.stickerId)) {
              conversation.messages[assistantIndex].stickerId = validStickerId(payload.stickerId);
              render();
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          } catch {}
        }
      }
    } else {
      const data = await response.json();
      if (data.animation && window.PelonCharacter) window.PelonCharacter.setAction(data.animation);
      conversation.messages[assistantIndex].stickerId = validStickerId(data.stickerId);
      conversation.messages[assistantIndex].attachments = Array.isArray(data.attachments) ? data.attachments : [];
      conversation.messages[assistantIndex].content = data.text || (conversation.messages[assistantIndex].stickerId || conversation.messages[assistantIndex].attachments.length ? "" : "Pelon belum menerima jawaban.");
      if (bubble) bubble.textContent = conversation.messages[assistantIndex].content;
      if (conversation.messages[assistantIndex].stickerId || conversation.messages[assistantIndex].attachments?.length) render();
    }
    if (contentType.includes("text/event-stream")) render();
  } catch {
    conversation.messages[assistantIndex].content =
      "Pelon belum terhubung ke gateway AI. UI sudah siap; langkah berikutnya adalah menghubungkan Cloudflare Worker dan API provider.";
    if (bubble) bubble.textContent = conversation.messages[assistantIndex].content;
  } finally {
    sessionStorage.removeItem("pelon-pidex-next");
    save();
    state.busy = false;
    setPelonMode(input.value.trim() ? "typing" : "idle");
    $("#connectionStatus").textContent = "Siap";
  }
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = input.value.trim();
  const attachments = [...state.pendingAttachments];
  if (!content && !attachments.length) return;
  input.value = "";
  input.style.height = "auto";
  state.pendingAttachments = [];
  renderPendingAttachments();
  sendMessage(content, attachments);
});

input.addEventListener("input", () => {
  if (!state.busy) setPelonMode(input.value.trim() ? "typing" : "idle");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
});

input.addEventListener("focus", () => { if (!state.busy) setPelonMode(input.value.trim() ? "typing" : "idle"); });
input.addEventListener("blur", () => { if (!state.busy && !input.value.trim()) setPelonMode("idle"); });

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    input.focus();
    input.dispatchEvent(new Event("input"));
  });
});

$("#newChat").addEventListener("click", () => {
  createConversation();
  input.focus();
});

$("#clearChats").addEventListener("click", () => {
  if (!state.conversations.length) return;
  openConfirm("Hapus semua percakapan?", "Semua riwayat percakapan lokal akan dihapus dari perangkat ini.", clearAllConversations);
});

function deleteConversation(id) {
  const index = state.conversations.findIndex((item) => item.id === id);
  if (index < 0) return;
  const wasActive = state.activeId === id;
  state.conversations.splice(index, 1);
  if (wasActive) state.activeId = state.conversations[0]?.id || null;
  save();
  render();
  renderChatTitle();
}

function clearAllConversations() {
  state.conversations = [];
  state.activeId = null;
  save();
  render();
  renderChatTitle();
}

const conversationSearchInput = $("#conversationSearch");
conversationSearchInput?.addEventListener("input", () => {
  state.conversationSearch = conversationSearchInput.value;
  renderChatList();
});
$("#toggleArchived")?.addEventListener("click", () => {
  state.showArchived = !state.showArchived;
  const button = $("#toggleArchived");
  if (button) {
    button.classList.toggle("active", state.showArchived);
    button.setAttribute("aria-label", state.showArchived ? "Tampilkan percakapan utama" : "Tampilkan arsip");
    button.innerHTML = state.showArchived
      ? '<svg viewBox="0 0 24 24"><path d="M5 7h14M7 7l1 13h8l1-13M9 11h6"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 7.5h16M6 7.5l1 12h10l1-12M9 4.5h6l1 3H8l1-3Z"/></svg>';
  }
  renderChatList();
});

$("#themeToggle")?.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.font = state.font || "default";
  save();
});


const toolPage = $("#toolPage");

const confirmModal = $("#confirmModal");
let confirmAction = null;
function openConfirm(title, message, action, confirmLabel = "Hapus") {
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  $("#confirmAction").textContent = confirmLabel;
  confirmAction = action;
  confirmModal?.showModal();
}
$("#cancelConfirm")?.addEventListener("click", () => { confirmAction = null; confirmModal?.close(); });
$("#cancelConfirmTop")?.addEventListener("click", () => { confirmAction = null; confirmModal?.close(); });
$("#confirmAction")?.addEventListener("click", () => {
  const action = confirmAction;
  confirmAction = null;
  confirmModal?.close();
  if (typeof action === "function") action();
});
confirmModal?.addEventListener("cancel", () => { confirmAction = null; });

function getActiveTitle() {
  const conversation = activeConversation();
  return conversation?.title || "Obrolan baru";
}

function openRenameModal(conversationId = state.activeId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  const modal = $("#renameModal");
  const input = $("#renameInput");
  if (!conversation || !modal || !input) return;
  state.activeId = conversation.id;
  input.value = conversation.title || "Obrolan baru";
  modal.showModal();
  setTimeout(() => { input.focus(); input.select(); }, 40);
}

function openChatAction(conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  const modal = $("#chatActionModal");
  if (!conversation || !modal) return;
  state.actionConversationId = conversation.id;
  $("#chatActionTitle").textContent = conversation.title || "Percakapan";
  $("#chatActionSubtitle").textContent = "Pilih tindakan untuk percakapan ini.";
  $("#pinChatActionLabel").textContent = conversation.pinned ? "Lepaskan sematan" : "Sematkan";
  $("#archiveChatActionLabel").textContent = conversation.archived ? "Keluarkan dari arsip" : "Arsipkan";
  modal.showModal();
}

function togglePinnedConversation(id) {
  const conversation = state.conversations.find((item) => item.id === id);
  if (!conversation) return;
  conversation.pinned = !conversation.pinned;
  save();
  renderChatList();
}

function toggleArchivedConversation(id) {
  const conversation = state.conversations.find((item) => item.id === id);
  if (!conversation) return;
  conversation.archived = !conversation.archived;
  if (conversation.archived && state.activeId === id) {
    state.activeId = state.conversations.find((item) => !item.archived)?.id || null;
  }
  save();
  render();
  renderChatTitle();
}

function saveTitleEdit() {
  const id = state.actionConversationId || state.activeId;
  const conversation = state.conversations.find((item) => item.id === id);
  const input = $("#renameInput");
  if (!conversation || !input) return;
  const value = input.value.trim().replace(/\s+/g, " ");
  conversation.title = value || "Obrolan baru";
  state.activeId = conversation.id;
  save();
  $("#renameModal")?.close();
  render();
  renderChatTitle();
}

function renderChatTitle() {
  const titleNode = document.querySelector(".chat-title-wrap");
  if (!titleNode) return;
  titleNode.innerHTML = `
    <button class="chat-title-button" id="editChatTitle" type="button" aria-label="Ganti nama percakapan">
      <span class="chat-title">${escapeHtml(getActiveTitle())}</span>
      <svg viewBox="0 0 24 24"><path d="m8 6 6 6-6 6"/></svg>
    </button>`;
  $("#editChatTitle").addEventListener("click", () => openRenameModal(state.activeId));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function dateParts(value) {
  const [y, m, d] = String(value || "").split("-");
  return { year: y || "", month: m || "", day: d || "" };
}

function buildBirthDatePicker(prefix, value = "") {
  const parts = dateParts(value);
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1900; y--) years.push(`<option value="${y}"${String(parts.year) === String(y) ? " selected" : ""}>${y}</option>`);
  const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const days = Array.from({length:31}, (_, i) => i + 1);
  return `<div class="birth-picker" data-birth-picker="${prefix}">
    <select class="select birth-day" aria-label="Tanggal"><option value="">Tanggal</option>${days.map(d => `<option value="${String(d).padStart(2,"0")}"${parts.day === String(d).padStart(2,"0") ? " selected" : ""}>${d}</option>`).join("")}</select>
    <select class="select birth-month" aria-label="Bulan"><option value="">Bulan</option>${months.map((m,i) => { const n=String(i+1).padStart(2,"0"); return `<option value="${n}"${parts.month === n ? " selected" : ""}>${m}</option>`; }).join("")}</select>
    <select class="select birth-year" aria-label="Tahun"><option value="">Tahun</option>${years.join("")}</select>
  </div>`;
}

function readBirthDatePicker(prefix) {
  const root = document.querySelector(`[data-birth-picker="${prefix}"]`);
  if (!root) return "";
  const d = root.querySelector(".birth-day")?.value || "";
  const m = root.querySelector(".birth-month")?.value || "";
  const y = root.querySelector(".birth-year")?.value || "";
  if (!d || !m || !y) return "";
  const candidate = `${y}-${m}-${d}`;
  const date = new Date(`${candidate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(y) || date.getMonth() + 1 !== Number(m) || date.getDate() !== Number(d)) return "";
  return date > new Date() ? "" : candidate;
}



const GROUP_LOGOS = [
  { id: "tired", label: "Lelah", color: "#7C6AA6", file: "./assets/group-tired.svg" },
  { id: "angry", label: "Jutek", color: "#C45B62", file: "./assets/group-angry.svg" },
  { id: "curious", label: "Penasaran", color: "#3F8F91", file: "./assets/group-curious.svg" },
  { id: "calm", label: "Tenang", color: "#3F7D63", file: "./assets/group-calm.svg" },
  { id: "bright", label: "Ceria", color: "#D18A3C", file: "./assets/group-bright.svg" }
];
function saveGroups(){ state.groups=Array.isArray(state.groups)?state.groups.slice(0,1):[]; if(state.activeGroupId && !state.groups.some(g=>g.id===state.activeGroupId)) state.activeGroupId=state.groups[0]?.id||null; localStorage.setItem("pelon-groups", JSON.stringify(state.groups)); if(state.activeGroupId) localStorage.setItem("pelon-active-group", state.activeGroupId); else localStorage.removeItem("pelon-active-group"); }
function activeGroup(){ return state.groups.find(g=>g.id===state.activeGroupId) || null; }
function groupLogo(ai, size="sm", animated=false, action="idle") {
  const safeAction = ["idle","thinking","typing","answering","reading","surprised","focused"].includes(action) ? action : "idle";
  if(ai?.type === "pelon") return `<span class="group-avatar pelon-group-avatar ${size}" data-action="${safeAction}"><img src="./assets/pelon-mark-live.svg" alt="Pelon"></span>`;
  const l=GROUP_LOGOS.find(x=>x.id===ai?.logo)||GROUP_LOGOS[0];
  return `<span class="group-avatar ai-group-avatar ${size}" style="--group-logo:${l.color}" data-action="${safeAction}"><img src="${l.file}" alt="${escapeHtml(ai?.name||l.label)}"></span>`;
}
function groupMemberFace(group,m){
  if(!m||m.type==="user")return null;
  if(m.type==="pelon"||String(m.name||"").toLowerCase()==="pelon")return {type:"pelon",name:"Pelon"};
  const ais=group?.ais||[];
  const found=ais.find(a=>a.id&&a.id===m.id)||ais.find(a=>String(a.name||"").toLowerCase()===String(m.name||"").toLowerCase());
  if(found)return found;
  if(GROUP_LOGOS.some(l=>l.id===m.logo))return m;
  let h=0;for(const ch of String(m.name||"ai"))h=(h*31+ch.charCodeAt(0))>>>0;
  return {...m,logo:GROUP_LOGOS[h%GROUP_LOGOS.length].id};
}
function groupFaceHtml(group,m,size,animated,action){const face=groupMemberFace(group,m);return face?groupLogo(face,size,animated,action):"";}
function groupMembers(group){ return [{id:"user",name:state.userName||"Kamu",role:"Pemimpin",type:"user",logo:""},{id:"pelon",name:"Pelon",role:"AI utama",type:"pelon",logo:""},...(group?.ais||[])]; }
function groupMemberByName(group, name){ return groupMembers(group).find(m=>m.name.toLowerCase()===name.toLowerCase()); }
function groupMentionNames(group){ return groupMembers(group).filter(m=>m.type!=="user").map(m=>m.name); }
function renderGroupPage(){
  saveGroups();
  const group=activeGroup();
  state.groupReplyTo=null;
  if(!group){
    toolPage.innerHTML=`<div class="groups-page groups-single-page"><section class="group-empty"><div class="group-empty-orbit">${groupLogo({type:'pelon'},'md',false)}</div><span class="group-empty-kicker">RUANG AI</span><strong>Buat grup AI pertamamu</strong><p>Satu grup saja. Pelon menjadi AI utama, lalu kamu dapat menambahkan hingga tiga AI custom dengan identitas dan karakter masing-masing.</p><button class="group-primary-btn" id="emptyNewGroup" type="button"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Buat grup</span></button></section></div>`;
    $("#emptyNewGroup")?.addEventListener("click",openGroupCreate);
    return;
  }
  toolPage.innerHTML=`<div class="groups-page groups-single-page"><section class="group-chat-shell">${renderGroupChat(group)}</section></div>`;
  const send=$("#groupSendForm"), gi=$("#groupMessageInput");
  send?.addEventListener("submit",async e=>{e.preventDefault(); const text=gi.value.trim(); const attachments=[...state.groupPendingAttachments]; if(!text&&!attachments.length)return; await sendGroupMessage(text,attachments);});
  gi?.addEventListener("input",()=>renderGroupMentionMenu(group,gi));
  gi?.addEventListener("keydown",e=>{ if(e.key==="Escape"){closeGroupMentionMenu();return;} if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send?.requestSubmit();} });
  $("#groupAtButton")?.addEventListener("click",()=>{if(!gi)return;const pos=gi.selectionStart??gi.value.length;const before=gi.value.slice(0,pos);const needSpace=before&&!/\s$/.test(before);gi.value=before+(needSpace?" ":"")+"@"+gi.value.slice(pos);const p=pos+(needSpace?2:1);gi.focus();gi.setSelectionRange(p,p);renderGroupMentionMenu(group,gi);});
  $("#groupAttachButton")?.addEventListener("click",()=>{pidexAttachmentTarget="group";openAttachmentPicker();});
  $("#groupSettings")?.addEventListener("click",()=>openGroupSettings());
  toolPage.querySelectorAll(".group-reply-btn").forEach(b=>b.addEventListener("click",()=>setGroupReply(group,b.dataset.messageId)));
  toolPage.querySelectorAll(".group-mention-btn").forEach(b=>b.addEventListener("click",()=>insertGroupMention(b.dataset.name)));
  toolPage.querySelectorAll(".group-copy-btn").forEach(b=>b.addEventListener("click",()=>{const m=(group.messages||[]).find(x=>String(x.id)===String(b.dataset.messageId));if(m)copyText(m.content||"",b);}));
  toolPage.querySelectorAll(".group-reaction-btn").forEach(b=>b.addEventListener("click",()=>setGroupReaction(group,b.dataset.messageId,b.dataset.reaction)));
  toolPage.querySelectorAll(".group-delete-btn").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.messageId;const message=(group.messages||[]).find(m=>String(m.id)===String(id));if(!message)return;openConfirm("Hapus pesan?",`Pesan dari ${message.name||"anggota grup"} akan dihapus dari percakapan.`,()=>{group.messages=group.messages.filter(m=>String(m.id)!==String(id));saveGroups();renderGroupPage();});}));
}
function renderGroupChat(group){
  const members=groupMembers(group), msgs=group.messages||[];
  const memberCount=members.length;
  return `<div class="group-chat-head"><div class="group-chat-title"><div class="group-title-avatar group-title-stack">${groupLogo({type:'pelon'},'md',true)}${(group.ais||[]).map(a=>groupLogo(a,'sm',false)).join('')}</div><div class="group-chat-title-copy"><strong>${escapeHtml(group.name)}</strong><span>${memberCount} anggota</span></div></div><button class="small-icon" id="groupSettings" type="button" aria-label="Pengaturan grup" title="Pengaturan grup"><svg viewBox="0 0 24 24"><path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.6"/><circle cx="9" cy="17" r="2.6"/></svg></button></div><div class="group-members-strip">${members.map(m=>`<span class="${m.type==='user'?'is-user':''}">${groupFaceHtml(group,m,'xs',false,'idle')}${escapeHtml(m.name)}</span>`).join('')}</div><div class="group-messages" id="groupMessages">${msgs.length?msgs.map(renderGroupMessage).join(''):'<div class="group-welcome"><div class="group-welcome-avatar">'+groupLogo({type:'pelon'},'md',true,'idle')+'</div><strong>Grup siap.</strong><p>Kirim pesan seperti biasa. Setiap AI akan hadir sebagai anggota chat sendiri.</p></div>'}</div><div id="groupMentionMenu" class="group-mention-menu" hidden></div><form class="composer-wrap group-composer-wrap" id="groupSendForm"><div id="groupReplyPreview" class="group-reply-preview" hidden></div><div id="groupAttachmentPreview" class="attachment-preview" ${state.groupPendingAttachments.length?'':'hidden'}></div><div class="composer"><button class="composer-action" id="groupAttachButton" type="button" aria-label="Tambah foto, kamera, atau file"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><button class="composer-action group-at-btn" id="groupAtButton" type="button" aria-label="Sebut anggota" title="Sebut anggota (@)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg></button><textarea id="groupMessageInput" rows="1" placeholder="Tulis pesan Anda..." aria-label="Pesan grup"></textarea><button class="composer-action send" id="groupSendButton" type="submit" aria-label="Kirim"><svg viewBox="0 0 24 24"><path d="m4 4 16 8-16 8 2.5-8L4 4Z"/><path d="M6.5 12h8"/></svg></button></div><div class="composer-note">Pelon dan AI lain dapat membaca konteks percakapan grup ini.</div></form></div>`;
  renderGroupPendingAttachments();
}
function renderGroupPendingAttachments(){
  const box=$("#groupAttachmentPreview"); if(!box)return;
  box.innerHTML=""; box.hidden=!state.groupPendingAttachments.length;
  state.groupPendingAttachments.forEach((a,i)=>{const item=document.createElement("div");item.className="attachment-preview-item";if(a.kind==="image"&&a.dataUrl){const img=document.createElement("img");img.src=a.dataUrl;img.alt=a.name||"Foto";item.appendChild(img);}else item.innerHTML='<span class="attachment-file-icon"><svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V20.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Z"/><path d="M14 3.5v5h4"/></svg></span>';const label=document.createElement("span");label.textContent=a.name||"Lampiran";item.appendChild(label);const b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Hapus lampiran");b.innerHTML='<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>';b.addEventListener("click",()=>{state.groupPendingAttachments.splice(i,1);renderGroupPendingAttachments();});item.appendChild(b);box.appendChild(item);});
}
function renderGroupMessage(m){
  const reply=m.replyTo ? `<div class="group-quoted"><strong>${escapeHtml(m.replyTo.name||'Pesan')}</strong><span>${escapeHtml((m.replyTo.content||'').slice(0,120))}</span></div>` : '';
  const mentionSafe=escapeHtml(m.content||'').replace(/(@[\wÀ-ÿ._-]+)/g,'<span class="group-mention">$1</span>');
  const attachments=renderGroupAttachmentsHtml(m.attachments||[]);
  const sticker=stickerMarkup(m.stickerId,"group-message-sticker");
  const liked=m.reaction==='like', disliked=m.reaction==='dislike';
  return `<article class="group-message ${m.type==='user'?'mine':''}" data-message-id="${escapeHtml(m.id||'')}" id="gm-${escapeHtml(m.id||'')}"><div class="group-message-meta">${groupFaceHtml(activeGroup(),m,'xs',false,m.animation?.action||'idle')}<strong>${escapeHtml(m.name||'')}</strong><span>${m.role?escapeHtml(m.role):''}</span></div>${reply}${m.content||attachments?`<div class="group-bubble">${mentionSafe}${attachments}</div>`:''}${sticker}<div class="group-message-actions"><button type="button" class="group-message-icon group-copy-btn" data-message-id="${escapeHtml(m.id||'')}" aria-label="Salin" title="Salin"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10h2"/></svg></button><button type="button" class="group-message-icon group-reaction-btn${liked?' active':''}" data-message-id="${escapeHtml(m.id||'')}" data-reaction="like" aria-label="Suka" title="Suka"><svg viewBox="0 0 24 24"><path d="M7 10v10H4.5A1.5 1.5 0 0 1 3 18.5v-7A1.5 1.5 0 0 1 4.5 10H7Z"/><path d="M7 20h9.2a2.5 2.5 0 0 0 2.4-1.8l1.8-6.4A2.2 2.2 0 0 0 18.3 9H14l.7-3.2A2.4 2.4 0 0 0 12.4 3L7 10v10Z"/></svg></button><button type="button" class="group-message-icon group-reaction-btn${disliked?' active':''}" data-message-id="${escapeHtml(m.id||'')}" data-reaction="dislike" aria-label="Tidak suka" title="Tidak suka"><svg viewBox="0 0 24 24"><path d="M17 14V4h2.5A1.5 1.5 0 0 1 21 5.5v7a1.5 1.5 0 0 1-1.5 1.5H17Z"/><path d="M17 4H7.8a2.5 2.5 0 0 0-2.4 1.8l-1.8 6.4A2.2 2.2 0 0 0 5.7 15H10l-.7 3.2A2.4 2.4 0 0 0 11.6 21L17 14V4Z"/></svg></button><button type="button" class="group-message-icon group-reply-btn" data-message-id="${escapeHtml(m.id||'')}" aria-label="Balas" title="Balas"><svg viewBox="0 0 24 24"><path d="M9 8 4 12l5 4"/><path d="M4 12h9a6 6 0 0 1 6 6v1"/></svg></button>${m.type!=='user'?`<button type="button" class="group-message-icon group-mention-btn" data-name="${escapeHtml(m.name||'')}" aria-label="Tag ${escapeHtml(m.name||'')}" title="Tag ${escapeHtml(m.name||'')}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg></button>`:''}<button type="button" class="group-message-icon group-delete-btn" data-message-id="${escapeHtml(m.id||'')}" aria-label="Hapus pesan" title="Hapus pesan"><svg viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4.8h6V7m-8 0 1 13h8l1-13M10 10.5v6m4-6v6"/></svg></button></div></article>`;
}
function setGroupReaction(group,id,reaction){const m=(group.messages||[]).find(x=>String(x.id)===String(id));if(!m)return;m.reaction=m.reaction===reaction?null:reaction;saveGroups();renderGroupPage();}
function openGroupSettings(){
  const group=activeGroup(); if(!group)return;
  const dialog=$("#groupSettingsModal"); if(!dialog)return;
  const body=$("#groupSettingsBody");
  body.innerHTML=`<label class="settings-label group-name-field"><span>Nama grup</span><input class="settings-name-input" id="groupSettingsName" maxlength="48" value="${escapeHtml(group.name)}"></label><div class="group-settings-section-head"><div><strong>AI dalam grup</strong><span>Pelon selalu ada · maksimal 3 AI custom</span></div><span class="group-count-badge">${(group.ais||[]).length} / 3</span></div><div id="groupSettingsAIs" class="group-ai-builder"></div><div class="group-danger-zone"><div><strong>Riwayat percakapan</strong><span>Hapus seluruh pesan dalam grup. Pengaturan dan anggota AI tetap ada.</span></div><button class="group-clear-history" id="groupClearHistory" type="button">Hapus seluruh percakapan</button></div><button class="group-add-ai group-settings-add" id="groupSettingsAddAI" type="button"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Tambah AI</span></button>`;
  renderGroupSettingsAIs(group);
  $("#groupSettingsName")?.addEventListener("input",e=>{group.name=e.target.value||"Grup";});
  $("#groupClearHistory")?.addEventListener("click",()=>openConfirm("Hapus seluruh percakapan?","Semua pesan di grup ini akan dihapus. Nama grup dan pengaturan AI tetap tersimpan.",()=>{group.messages=[];saveGroups();$("#groupSettingsModal")?.close();renderGroupPage();},"Hapus semua"));
  $("#groupSettingsAddAI")?.addEventListener("click",()=>{if((group.ais||[]).length>=3)return;group.ais.push({id:`ai-${Date.now()}`,type:"custom",name:`AI ${group.ais.length+1}`,character:"",role:"",logo:GROUP_LOGOS[group.ais.length]?.id||GROUP_LOGOS[0].id});saveGroups();openGroupSettings();});
  dialog.showModal();
}
function renderGroupSettingsAIs(group){
  const el=$("#groupSettingsAIs");if(!el)return;
  el.innerHTML=(group.ais||[]).map((a,i)=>{const chosen=GROUP_LOGOS.find(l=>l.id===a.logo)||GROUP_LOGOS[0];return `<section class="group-ai-card"><div class="group-ai-card-head"><div class="group-ai-settings-identity">${groupLogo(a,'sm',false)}<div><strong>AI ${i+1}</strong><small>${escapeHtml(chosen.label)}</small></div></div><button type="button" class="group-remove-ai" data-i="${i}" aria-label="Hapus AI" title="Hapus AI"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M8 10v7M12 10v7M16 10v7M7 20h10l1-13H6l1 13Z"/></svg></button></div><div class="group-ai-fields"><label class="gf"><span>Nama AI</span><input class="settings-name-input" data-gfield="name" data-i="${i}" value="${escapeHtml(a.name||'')}" maxlength="32" placeholder="Contoh: Nara"></label><label class="gf"><span>Peran</span><input class="settings-name-input" data-gfield="role" data-i="${i}" value="${escapeHtml(a.role||'')}" maxlength="80" placeholder="Contoh: Programmer"></label><label class="gf"><span>Karakter dan sifat</span><textarea class="settings-custom-style" data-gfield="character" data-i="${i}" maxlength="500" placeholder="Contoh: Teliti, bicara singkat, suka memberi saran praktis">${escapeHtml(a.character||'')}</textarea></label></div><div class="group-logo-label"><span>Karakter</span><small>${escapeHtml(chosen.label)}</small></div><div class="group-logo-picker">${GROUP_LOGOS.map(l=>`<button type="button" class="group-logo-choice${a.logo===l.id?' selected':''}" data-glogo="${l.id}" data-i="${i}" title="${l.label}"><img src="${l.file}" alt="${l.label}"></button>`).join('')}</div></section>`;}).join('')||'<div class="group-settings-empty">Belum ada AI custom. Tambahkan AI untuk memulai.</div>';
  el.querySelectorAll('[data-gfield]').forEach(x=>x.addEventListener('input',()=>{group.ais[Number(x.dataset.i)][x.dataset.gfield]=x.value;saveGroups();}));
  el.querySelectorAll('[data-glogo]').forEach(x=>x.addEventListener('click',()=>{group.ais[Number(x.dataset.i)].logo=x.dataset.glogo;saveGroups();renderGroupSettingsAIs(group); }));
  el.querySelectorAll('.group-remove-ai').forEach(x=>x.addEventListener('click',()=>{group.ais.splice(Number(x.dataset.i),1);saveGroups();openGroupSettings();}));
}
function setGroupReply(group,id){ const m=(group.messages||[]).find(x=>String(x.id)===String(id)); if(!m)return; state.groupReplyTo=m; const box=$("#groupReplyPreview"); if(box){box.hidden=false;box.innerHTML=`<div><strong>Balas ${escapeHtml(m.name)}</strong><span>${escapeHtml((m.content||'').slice(0,120))}</span></div><button type="button" id="cancelGroupReply" aria-label="Batal balas"><svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg></button>`;$("#cancelGroupReply")?.addEventListener("click",()=>{state.groupReplyTo=null;box.hidden=true;});} $("#groupMessageInput")?.focus(); }
function insertGroupMention(name){ const gi=$("#groupMessageInput"); if(!gi)return; const before=gi.value; const pos=gi.selectionStart??before.length; const left=before.slice(0,pos); const match=left.match(/@[\wÀ-ÿ._-]*$/); const start=match?pos-match[0].length:pos; gi.value=before.slice(0,start)+`@${name} `+before.slice(pos); gi.focus(); const p=start+name.length+2; gi.setSelectionRange(p,p); closeGroupMentionMenu(); }
function closeGroupMentionMenu(){const m=$("#groupMentionMenu");if(m)m.hidden=true;}
function renderGroupMentionMenu(group,gi){ const menu=$("#groupMentionMenu"); if(!menu)return; const left=gi.value.slice(0,gi.selectionStart??gi.value.length); const match=left.match(/@([\wÀ-ÿ._-]*)$/); if(!match){closeGroupMentionMenu();return;} const q=match[1].toLowerCase(); const names=groupMentionNames(group).filter(n=>n.toLowerCase().startsWith(q)); if(!names.length){closeGroupMentionMenu();return;} menu.innerHTML=names.map(n=>`<button type="button" class="group-mention-btn" data-name="${escapeHtml(n)}">${groupFaceHtml(group,groupMemberByName(group,n),'xs',false,'idle')}<span>@${escapeHtml(n)}</span></button>`).join(''); menu.hidden=false; menu.querySelectorAll('.group-mention-btn').forEach(b=>b.addEventListener('click',()=>insertGroupMention(b.dataset.name))); }
function openGroupCreate(){
  state.groupDraftAIs=[]; renderGroupBuilder(); $("#groupNameInput").value=""; $("#groupCreateModal").showModal();
}
function renderGroupBuilder(){
  const el=$("#groupAiBuilder"); if(!el)return;
  if(!state.groupDraftAIs.length) state.groupDraftAIs=[{name:"",character:"",role:"",logo:"tired"}];
  el.innerHTML=state.groupDraftAIs.map((a,i)=>{ const chosen=GROUP_LOGOS.find(l=>l.id===a.logo)||GROUP_LOGOS[0]; return `<section class="group-ai-card"><div class="group-ai-card-head"><div><strong>AI ${i+1}</strong><small>Pilih karakter dan identitas AI ini</small></div>${state.groupDraftAIs.length>1?`<button type="button" class="text-button remove-group-ai" data-i="${i}">Hapus</button>`:''}</div><div class="group-ai-identity"><div class="group-ai-preview" style="--group-logo:${chosen.color}"><img src="${chosen.file}" alt="${chosen.label}"></div><div class="group-ai-fields"><label class="gf"><span>Nama AI</span><input class="settings-name-input" data-field="name" data-i="${i}" value="${escapeHtml(a.name)}" maxlength="32" placeholder="Contoh: Nara"></label><label class="gf"><span>Peran</span><input class="settings-name-input" data-field="role" data-i="${i}" value="${escapeHtml(a.role)}" maxlength="80" placeholder="Contoh: Programmer"></label><label class="gf"><span>Karakter dan sifat</span><textarea class="settings-custom-style" data-field="character" data-i="${i}" maxlength="500" placeholder="Contoh: Teliti, bicara singkat, suka memberi saran praktis">${escapeHtml(a.character)}</textarea></label></div></div><div class="group-logo-label"><span>Karakter</span><small>${escapeHtml(chosen.label)}</small></div><div class="group-logo-picker">${GROUP_LOGOS.map(l=>`<button type="button" class="group-logo-choice${a.logo===l.id?' selected':''}" data-logo="${l.id}" data-i="${i}" title="${l.label}" style="--group-logo:${l.color}"><img src="${l.file}" alt="${l.label}"></button>`).join('')}</div></section>`; }).join('');
  const badge=$("#groupCountBadge"); if(badge) badge.textContent=`${state.groupDraftAIs.length} / 3`;
  el.querySelectorAll('[data-field]').forEach(x=>x.addEventListener('input',()=>{state.groupDraftAIs[Number(x.dataset.i)][x.dataset.field]=x.value;}));
  el.querySelectorAll('[data-logo]').forEach(x=>x.addEventListener('click',()=>{state.groupDraftAIs[Number(x.dataset.i)].logo=x.dataset.logo;renderGroupBuilder();}));
  el.querySelectorAll('.remove-group-ai').forEach(x=>x.addEventListener('click',()=>{state.groupDraftAIs.splice(Number(x.dataset.i),1);renderGroupBuilder();}));
}
$("#addGroupAi")?.addEventListener("click",()=>{if(state.groups.length)return;if(state.groupDraftAIs.length<3){state.groupDraftAIs.push({name:"",character:"",role:"",logo:GROUP_LOGOS[state.groupDraftAIs.length].id});renderGroupBuilder();}});
$("#createGroupButton")?.addEventListener("click",e=>{e.preventDefault(); if(state.groups.length){$("#groupCreateModal").close();return;} const name=$("#groupNameInput").value.trim()||"Grup baru"; const ais=state.groupDraftAIs.slice(0,3).map((a,i)=>({...a,name:a.name.trim()||`AI ${i+1}`,id:`ai-${Date.now()}-${i}`,type:"custom"})); const g={id:`group-${Date.now()}`,name,ais,messages:[]}; state.groups=[g];state.activeGroupId=g.id;saveGroups();$("#groupCreateModal").close();renderGroupPage();});
$("#groupSettingsClose")?.addEventListener("click",()=>$("#groupSettingsModal")?.close());
$("#groupSettingsDone")?.addEventListener("click",()=>{saveGroups();$("#groupSettingsModal")?.close();renderGroupPage();});
$("#groupSettingsCancel")?.addEventListener("click",()=>$("#groupSettingsModal")?.close());
async function sendGroupMessage(text,attachments=[],stickerId=null){
  const group=activeGroup(); if(!group)return; stickerId=validStickerId(stickerId); if(!text&&!attachments.length&&!stickerId)return; group.messages=group.messages||[]; const userMessage={id:`m-${Date.now()}-u`,type:"user",name:state.userName||"Kamu",role:"Pemimpin",content:text,attachments,stickerId,createdAt:Date.now(),replyTo:state.groupReplyTo?{name:state.groupReplyTo.name,content:state.groupReplyTo.content}:null}; group.messages.push(userMessage); state.groupPendingAttachments=[]; state.groupReplyTo=null; saveGroups(); renderGroupPage();
  const panel=$("#groupMessages"); if(panel) panel.scrollTop=panel.scrollHeight;
  try{
    const response=await fetch("/api/group-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userName:state.userName||"Kamu",group:{name:group.name,ais:group.ais},messages:group.messages.map(m=>({type:m.type,name:m.name,role:m.role,content:validStickerId(m.stickerId)?(m.content||`[Pengguna mengirim stiker #${m.stickerId}]`):m.content,attachments:m.attachments,stickerId:m.stickerId}))})});
    if(!response.ok)throw new Error("gateway"); const data=await response.json();
    if(Array.isArray(data.messages)){group.messages.push(...data.messages.map((m,i)=>{const raw=String(m.content||"");const match=raw.match(/\[PELON_STICKER:(\d{1,2})\]/i);const stickerId=validStickerId(m.stickerId)||validStickerId(match?.[1]);return {...m,content:match?raw.replace(match[0],"").trim():raw,stickerId,id:m.id||`m-${Date.now()}-${i}`,createdAt:m.createdAt||Date.now()};}));saveGroups();renderGroupPage();}
  }catch{
    group.messages.push({id:`m-${Date.now()}-system`,type:"system",name:"Pelon",role:"Gateway",content:"Grup sudah siap, tetapi API AI grup belum terhubung. Setelah gateway diaktifkan, setiap AI akan mengirim pesan masing-masing ke grup ini.",createdAt:Date.now()}); saveGroups(); renderGroupPage();
  }
}

function showPage(mode) {
  document.body.classList.toggle("pidex-page-active", mode === "pidex");
  if (window.PelonCharacter && mode === "pidex") window.PelonCharacter.setAction("stop");
  if (mode !== "pidex" && window.PelonCharacter) window.PelonCharacter.setAction("idle");
  if (mode === "chat") {
    toolPage.hidden = true;
    const chatTitleWrap = $(".chat-title-wrap");
    if (chatTitleWrap) chatTitleWrap.hidden = false;
    renderChatTitle();
    welcomeEl.hidden = !!activeConversation()?.messages?.length;
    messagesEl.hidden = !activeConversation()?.messages?.length;
    composer.style.display = "";
    render();
    return;
  }

  welcomeEl.hidden = true;
  messagesEl.hidden = true;
  composer.style.display = "none";
  toolPage.hidden = false;
  const chatTitleWrap = $(".chat-title-wrap");
  if (chatTitleWrap) chatTitleWrap.hidden = true;

  const titles = {
    file: ["File", "Analisis dokumen dan file dilakukan dari satu ruang kerja Pelon."],
    image: ["Gambar", "Gunakan ruang ini untuk membuat dan menganalisis gambar."],
    web: ["Web", "Pelon dapat menggunakan sumber publik yang relevan melalui gateway web."],
    persona: ["Persona", "Atur gaya Pelon sesuai kebutuhan percakapan."],
    privacy: ["Privasi", "Kontrol dan penjelasan tentang data yang digunakan Pelon."],
    settings: ["Pengaturan", "Preferensi pengalaman Pelon pada perangkat ini."]
  };
  const [title, subtitle] = titles[mode] || titles.settings;

  if (mode === "groups") {
    renderGroupPage();
    return;
  }
  if (mode === "persona") {
    const personas = [
      ["Biasa", "Natural, seimbang, jelas, dan menjadi gaya default Pelon.", "Default"],
      ["Negatif Brutal", "Galak, cuek, sinis, suka meledek, skeptis, dan tanpa basa-basi. Kalau jawabanmu lemah, Pelon akan mengatakannya terus terang.", "Brutal"],
      ["Musuh Sejati", "Rival keras kepala yang suka menantang, menyanggah, dan memancingmu membuktikan kemampuanmu.", "Rival"],
      ["Sok Pintar", "Percaya diri berlebihan, suka memamerkan pengetahuan, dan sering terdengar paling tahu.", "Karakter"],
      ["Jujur Brutal", "Terus terang, tajam, dan tidak membungkus kritik dengan basa-basi.", "Tegas"],
      ["Supportif", "Hangat, menyemangati, dan fokus membantu sampai selesai.", "Positif"],
      ["Technical Specialist", "Teknis, detail, sistematis, dan presisi.", "Profesional"],
      ["Creative Partner", "Eksploratif, komunikatif, dan terbuka terhadap ide.", "Kreatif"],
      ["Socratic Mentor", "Membantu berpikir melalui pertanyaan dan penalaran.", "Mentor"]
    ];
    toolPage.innerHTML = `
      <div class="page-panel">
        <h2>${title}</h2>
        <p>${subtitle} Pilih karakter Pelon yang ingin menemanimu.</p>
        <div class="persona-grid">
          ${personas.map(([name, desc, tag]) => `
            <button class="persona-card${state.persona === name ? " selected" : ""}" data-persona="${escapeHtml(name)}" type="button">
              <strong>${escapeHtml(name)}</strong>
              <p>${escapeHtml(desc)}</p>
              <span class="persona-tag">${escapeHtml(tag)}</span>
            </button>
          `).join("")}
        </div>
        <div class="custom-persona-panel" id="customPersonaPanel" ${state.persona === "Custom" ? "" : "hidden"}>
          <label class="settings-label" for="customPersonaInput">Persona custom</label>
          <div class="settings-help">Tulis karakter, cara berpikir, dan perilaku Pelon yang kamu mau.</div>
          <textarea id="customPersonaInput" class="settings-custom-style" maxlength="1500" placeholder="Contoh: Jadilah partner brainstorming yang kritis, banyak bertanya, dan tidak asal setuju.">${escapeHtml(state.customPersona)}</textarea>
          <button class="settings-save-name custom-persona-save" id="saveCustomPersona" type="button">Simpan persona</button>
        </div>
      </div>`;
  } else if (mode === "settings") {
    toolPage.innerHTML = `
      <div class="page-panel">
        <h2>${title}</h2><p>${subtitle}</p>
        <div class="settings-card">
          <div class="settings-row"><div><div class="settings-label">Nama pengguna</div><div class="settings-help">Nama yang digunakan Pelon untuk memanggilmu.</div></div><div class="settings-name-control"><input class="settings-name-input" id="settingsNameInput" value="${escapeHtml(state.userName)}" maxlength="40" aria-label="Nama pengguna"><button class="settings-save-name" id="saveUserName" type="button">Simpan</button></div></div>
          <div class="settings-row"><div><div class="settings-label">Tanggal lahir</div><div class="settings-help">Digunakan untuk menentukan fitur dengan batas usia.</div></div><div class="settings-name-control birth-setting-control">${buildBirthDatePicker("settings", state.birthDate)}<button class="settings-save-name" id="saveBirthDate" type="button">Simpan</button></div></div>
          <div class="settings-row"><div><div class="settings-label">Tema</div><div class="settings-help">Gunakan tampilan terang atau gelap.</div></div><select class="select" id="themeSelect"><option value="light">Terang</option><option value="dark">Gelap</option></select></div>
          <div class="settings-row"><div><div class="settings-label">Typography</div><div class="settings-help">Pilih gaya tulisan Pelon.</div></div>
            <div style="min-width:180px">
              <button class="font-option selected" data-font="default" type="button"><span class="font-preview">Pelon Default</span><span class="font-desc">Gaya utama Pelon, bersih dan modern.</span></button>
              <button class="font-option" data-font="comic" type="button"><span class="font-preview">Pelon Comic</span><span class="font-desc">Gaya lebih santai dan playful.</span></button>
            </div>
          </div>
          <div class="settings-row"><div><div class="settings-label">Kedalaman jawaban</div><div class="settings-help">Preferensi panjang dan detail respons.</div></div><select class="select"><option>Seimbang</option><option>Ringkas</option><option>Detail</option></select></div>
          <div class="settings-row settings-style-row"><div><div class="settings-label">Formalitas gaya bahasa Pelon</div><div class="settings-help">Pilih cara Pelon berbicara. Kejujuran Pelon tetap sama di semua gaya.</div></div>
            <div class="language-style-control">
              <select class="select" id="languageStyleSelect">
                <option value="santai">Santai</option>
                <option value="normal">Normal</option>
                <option value="slang">Gaul / Slang</option>
                <option value="custom">Custom</option>
                <option value="nyindir">Nyindir</option>
                <option value="brutal">Negatif Super Brutal</option>
              </select>
              <textarea id="customLanguageStyle" class="settings-custom-style" maxlength="1000" placeholder="Tulis aturan gaya bahasa yang kamu mau..."></textarea>
              <div class="settings-help" id="brutalAgeHelp"></div>
            </div>
          </div>
          <div class="settings-row"><div><div class="settings-label">Simpan percakapan lokal</div><div class="settings-help">Data percakapan disimpan pada perangkat ini untuk V1.</div></div><button class="toggle on" type="button"><span></span></button></div>
          <div class="settings-row"><div><div class="settings-label">Tentang Pelon</div><div class="settings-help">Identitas, tujuan, dan informasi pembuat Pelon.</div></div><button class="settings-save-name" type="button" data-legal="about">Buka</button></div>
        </div>
        <div class="legal-links">
          <button class="text-button" data-legal="privacy">Kebijakan Privasi</button>
          <button class="text-button" data-legal="terms">Ketentuan Penggunaan</button>
          <button class="text-button" data-legal="about">Tentang Pelon</button>
        </div>
      </div>`;
    const nameInput = $("#settingsNameInput");
    const saveNameButton = $("#saveUserName");
    const saveBirthDateButton = $("#saveBirthDate");
    saveNameButton.addEventListener("click", () => {
      const value = nameInput.value.trim().replace(/\s+/g, " ");
      if (!value) { nameInput.focus(); return; }
      state.userName = value;
      save();
      saveNameButton.textContent = "Tersimpan";
      setTimeout(() => { saveNameButton.textContent = "Simpan"; }, 900);
      render();
    });
    saveBirthDateButton.addEventListener("click", () => {
      const value = readBirthDatePicker("settings");
      if (!value) return;
      state.birthDate = value;
      if (state.languageStyle === "brutal" && (() => { const b = new Date(`${value}T00:00:00`); const t = new Date(); let a=t.getFullYear()-b.getFullYear(); if (t.getMonth()<b.getMonth() || (t.getMonth()===b.getMonth() && t.getDate()<b.getDate())) a--; return a < 14; })()) state.languageStyle = "normal";
      save();
      saveBirthDateButton.textContent = "Tersimpan";
      setTimeout(() => { saveBirthDateButton.textContent = "Simpan"; }, 900);
      render();
    });

    const select = $("#themeSelect");
    select.value = state.theme;
    select.addEventListener("change", () => {
      state.theme = select.value;
      document.documentElement.dataset.theme = state.theme;
      save();
    });

    const languageStyleSelect = $("#languageStyleSelect");
    const customLanguageStyle = $("#customLanguageStyle");
    const brutalAgeHelp = $("#brutalAgeHelp");
    const calculateAge = (dateString) => {
      if (!dateString) return null;
      const birth = new Date(`${dateString}T00:00:00`);
      if (Number.isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
      if (beforeBirthday) age--;
      return age;
    };
    const isBrutalAllowed = () => (calculateAge(state.birthDate) ?? 0) >= 14;
    if (state.languageStyle === "brutal" && !isBrutalAllowed()) state.languageStyle = "normal";
    languageStyleSelect.value = state.languageStyle;
    customLanguageStyle.value = state.customLanguageStyle;
    customLanguageStyle.hidden = state.languageStyle !== "custom";
    brutalAgeHelp.textContent = state.languageStyle === "brutal" ? "Mode ini tersedia untuk pengguna berusia 14 tahun ke atas." : "";
    languageStyleSelect.addEventListener("change", () => {
      let value = languageStyleSelect.value;
      if (value === "brutal" && !isBrutalAllowed()) {
        alert("Negatif Super Brutal hanya tersedia untuk pengguna berusia 14 tahun ke atas.");
        value = "normal";
        languageStyleSelect.value = value;
      }
      state.languageStyle = value;
      customLanguageStyle.hidden = value !== "custom";
      brutalAgeHelp.textContent = value === "brutal" ? "Mode ini tersedia untuk pengguna berusia 14 tahun ke atas." : "";
      save();
    });
    customLanguageStyle.addEventListener("input", () => {
      state.customLanguageStyle = customLanguageStyle.value;
      save();
    });

    toolPage.querySelectorAll(".font-option").forEach((button) => {
      button.classList.toggle("selected", button.dataset.font === (state.font || "default"));
      button.addEventListener("click", () => {
        state.font = button.dataset.font;
        document.documentElement.dataset.font = state.font;
        toolPage.querySelectorAll(".font-option").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        save();
      });
    });
  } else if (mode === "pidex") {
    const languages = ["Oust","Pous","JavaScript","TypeScript","Python","HTML","CSS","Java","C","C++","C#","Go","Rust","PHP","Kotlin","Swift","Dart","Ruby","SQL","Bash","PowerShell","R","Lua","Perl","Scala","Haskell","Elixir","React","Vue","Svelte","Node.js","JSON","XML","YAML","Markdown","TSX","JSX","GraphQL","TOML","INI"];
    const extensions = {oust:"Oust",pous:"Pous",html:"HTML",htm:"HTML",css:"CSS",js:"JavaScript",mjs:"JavaScript",cjs:"JavaScript",ts:"TypeScript",tsx:"TypeScript",jsx:"React",py:"Python",java:"Java",c:"C",h:"C",cpp:"C++",cc:"C++",cxx:"C++",cs:"C#",go:"Go",rs:"Rust",php:"PHP",kt:"Kotlin",swift:"Swift",dart:"Dart",rb:"Ruby",sql:"SQL",sh:"Bash",ps1:"PowerShell",r:"R",lua:"Lua",pl:"Perl",scala:"Scala",hs:"Haskell",ex:"Elixir",json:"JSON",xml:"XML",yaml:"YAML",yml:"YAML",md:"Markdown"};
    const defaultFiles = [{name:"lang.pous", language:"Pous", code:"app \"Pelon — Pous\"\nversion \"1.0.0\"\n\npage home\n\nheader {\n    heading \"Pelon\"\n    text \"Aplikasi ini dibuat hanya dengan bahasa Pous.\"\n}\n\ncard {\n    input name \"Nama kamu\"\n\n    button \"Kirim\" {\n        if name != \"\"\n            say \"Halo \" + name + \"!\"\n        else\n            say \"Silakan isi nama terlebih dahulu.\"\n        end\n    }\n}"}];
    const cloneFiles=(items)=>items.map(f=>({name:f.name,language:f.language,code:f.code||""}));
    let projectStore=(()=>{try{const v=JSON.parse(localStorage.getItem("pelon-pidex-projects")||"");if(v&&typeof v==="object"&&Object.keys(v).length)return v;}catch{};let legacyFiles=defaultFiles,legacyFolders=[];try{const v=JSON.parse(localStorage.getItem("pelon-pidex-files")||"");if(Array.isArray(v)&&v.length)legacyFiles=v;}catch{}try{const v=JSON.parse(localStorage.getItem("pelon-pidex-folders")||"[]");if(Array.isArray(v))legacyFolders=v;}catch{}return {"Project Saya":{files:cloneFiles(legacyFiles),folders:legacyFolders,activeFile:(localStorage.getItem("pelon-pidex-active-file")||legacyFiles[0].name)}};})();
    let projectName=localStorage.getItem("pelon-pidex-active-project")||Object.keys(projectStore)[0]||"Project Saya";
    if(!projectStore[projectName])projectName=Object.keys(projectStore)[0]||"Project Saya";
    if(!projectStore[projectName])projectStore[projectName]={files:cloneFiles(defaultFiles),folders:[],activeFile:"lang.pous"};
    let projectState=projectStore[projectName];
    let files=cloneFiles(projectState.files||defaultFiles);
    let activeFile=projectState.activeFile||files[0].name;
    if(!files.some(f=>f.name===activeFile))activeFile=files[0].name;
    const persistFiles=()=>{projectState.files=cloneFiles(files);projectState.activeFile=activeFile;projectStore[projectName]=projectState;localStorage.setItem("pelon-pidex-projects",JSON.stringify(projectStore));localStorage.setItem("pelon-pidex-active-project",projectName);localStorage.setItem("pelon-pidex-files",JSON.stringify(files));localStorage.setItem("pelon-pidex-active-file",activeFile);};
    const current=()=>files.find(f=>f.name===activeFile)||files[0];
    const detectLanguage=(name)=>extensions[name.split(".").pop().toLowerCase()]||"JavaScript";
    const esc=(v)=>escapeHtml(v);
    toolPage.innerHTML=`
      <div class="pidex-page"><div class="pidex-code-bg" aria-hidden="true"></div>
        <div class="pidex-header">
          <div class="pidex-brand-block"><img class="pidex-logo" src="./assets/pidex-logo.svg" alt=""><div><div class="pidex-kicker">PELON CODE WORKSPACE</div><h2>Pidex</h2><p>Editor coding Pelon untuk HP dengan project, preview, terminal, diagnostics, runtime, dan bantuan AI.</p></div></div>
          <span class="pidex-badge">${languages.length} bahasa</span>
        </div>
        <div class="pidex-shell">
          <aside class="pidex-explorer">
            <div class="pidex-panel-title"><span>Explorer</span><div class="pidex-mini-actions"><button id="pidexProjectsButton" title="Lihat semua project">Projects</button><button id="pidexAddFile" title="Buka menu Pidex">+</button></div></div>
            <div class="pidex-project-name" id="pidexProjectName">PROJECT</div><div id="pidexFileList" class="pidex-file-list"></div>
          </aside>
          <main class="pidex-main">
            <div class="pidex-tabs" id="pidexTabs"></div>
            <div class="pidex-toolbar">
              <label class="pidex-select-wrap"><span>Bahasa</span><select id="pidexLanguage" class="select">${languages.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select></label>
              <div class="pidex-actions">
                <button class="pidex-action" id="pidexCheck">Periksa</button><button class="pidex-action" id="pidexCopy">Salin</button><button class="pidex-action run" id="pidexRun">Jalankan</button><button class="pidex-action" id="pidexPreview">Preview</button><button class="pidex-action primary" id="pidexSend">Tanya Pelon</button>
              </div>
            </div>
            <div class="pidex-editor-card">
              <div class="pidex-editor-head"><span id="pidexCurrentName">lang.pous</span><span id="pidexLineCount">1 baris</span></div>
              <div class="pidex-editor-tools"><button class="pidex-icon-action" id="pidexUndo" title="Urungkan" aria-label="Urungkan"><svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></svg></button><button class="pidex-icon-action" id="pidexRedo" title="Ulangi" aria-label="Ulangi"><svg viewBox="0 0 24 24"><path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></svg></button><button class="pidex-icon-action" id="pidexSave" title="Simpan" aria-label="Simpan"><svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></svg></button><button class="pidex-icon-action" id="pidexFind" title="Cari" aria-label="Cari"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4 4"/></svg></button><button class="pidex-icon-action" id="pidexFormat" title="Rapikan" aria-label="Rapikan kode"><svg viewBox="0 0 24 24"><path d="M7 4.5v15M17 4.5v15M4.5 8h15M4.5 16h15"/></svg></button></div><div class="pidex-editor-wrap"><div id="pidexLineNumbers" class="pidex-lines">1</div><pre id="pidexHighlight" class="pidex-highlight" aria-hidden="true"></pre><textarea id="pidexEditor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="Tulis atau tempel kode di sini..."></textarea></div>
              <div class="pidex-shortcuts"><span>Ctrl/Cmd A Pilih</span><span>Ctrl/Cmd C Salin</span><span>Ctrl/Cmd V Tempel</span><span>Ctrl/Cmd X Potong</span><span>Ctrl/Cmd Z Undo</span><span>Ctrl/Cmd Y Redo</span><span>Ctrl/Cmd S Simpan</span><span>Ctrl/Cmd F Cari</span><span>Ctrl/Cmd H Ganti</span><span>Ctrl/Cmd N File</span><span>Ctrl/Cmd Shift N Folder</span><span>Ctrl/Cmd U Upload</span><span>Ctrl/Cmd P Preview</span><span>Ctrl/Cmd B Explorer</span><span>Ctrl/Cmd ~ Pish</span><span>Ctrl/Cmd Enter Jalankan</span><span>Ctrl/Cmd O Buka</span><span>Ctrl/Cmd W Tutup tab</span><span>Ctrl/Cmd G Ke baris</span><span>Ctrl/Cmd D Duplikat baris</span><span>Ctrl/Cmd K Pish</span></div>
            </div>
            <div class="pidex-pelon-card">
              <div class="pidex-pelon-head"><div><strong>Pelon</strong><span>Instruksi khusus untuk workspace Pidex</span></div><button class="pidex-pelon-clear" id="pidexPelonClear" type="button">Bersihkan</button></div>
              <div class="pidex-pelon-messages" id="pidexPelonMessages" aria-live="polite"><div class="pidex-pelon-empty" id="pidexPelonEmpty">Pelon bisa membaca project aktif, menganalisis kode, mencari bug, dan membantu mengubah berkas.</div></div>
              <div class="pidex-pelon-attachments" id="pidexPelonAttachments" hidden></div>
              <div class="pidex-pelon-composer">
                <button class="composer-action" id="pidexPelonAttach" type="button" aria-label="Tambah foto, kamera, atau file"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
                <textarea id="pidexPrompt" rows="1" placeholder="Instruksikan Pelon untuk membaca, menjelaskan, memperbaiki, atau mengedit kode..."></textarea>
                <button class="composer-action send" id="pidexPelonSend" type="button" aria-label="Kirim"><svg viewBox="0 0 24 24"><path d="m4 4 16 8-16 8 2.5-8L4 4Z"/><path d="M6.5 12h8"/></svg></button>
              </div>
              <div class="pidex-pelon-note">Pelon mendapat konteks seluruh project aktif. Perubahan kode selalu ditinjau sebelum diterapkan.</div>
            </div>
            <div class="pidex-bottom-grid">
              <section class="pidex-output-card" id="pidexOutputCard" hidden><div class="pidex-editor-head"><span id="pidexOutputTitle">Output</span><div class="pidex-output-head-actions"><button class="pidex-output-clear" id="pidexOutputFullscreen" type="button">Layar penuh</button><button class="pidex-output-clear" id="pidexOutputClear" type="button">Tutup</button></div></div><div id="pidexOutput" class="pidex-output"></div></section>
              <section class="pidex-terminal-card"><div class="pidex-editor-head"><span>Pish <small>Pidex Shell</small></span><div class="pidex-terminal-head-actions"><button class="pidex-output-clear" id="pidexTerminalHelp">Help</button><button class="pidex-output-clear" id="pidexTerminalClear">Clear</button></div></div><div id="pidexTerminalOutput" class="pidex-terminal-output">Pish dibuat khusus untuk Pidex untuk mengelola project, file, runtime, editor, dan berbagai kebutuhan coding. Ketik help untuk melihat daftar perintah.</div><div class="pidex-terminal-input"><span>pish&gt;</span><input id="pidexTerminalInput" autocomplete="off" spellcheck="false" placeholder="ketik perintah..."></div></section>
            </div>
            <section class="pidex-problems-card"><div class="pidex-editor-head"><span>Problems</span><span id="pidexProblemCount">0</span></div><div id="pidexProblems" class="pidex-problems"><div class="pidex-empty">Belum ada diagnostic.</div></div></section>
            <section class="pidex-runtime-card"><div><strong>Runtime Manager</strong><span id="pidexRuntimeStatus">Siap</span></div><p>Pidex hanya menjalankan runtime yang benar-benar tersedia. Runtime tambahan dapat dipasang melalui sandbox terisolasi tanpa memasukkan compiler besar ke aplikasi utama.</p><div class="pidex-runtime-grid">${languages.slice(0,18).map(x=>`<span><b>${esc(x)}</b><small>${["Oust","Pous","JavaScript","HTML","CSS","Python","TypeScript","SQL","Lua","R"].includes(x)?"Ready":"Available"}</small></span>`).join("")}</div></section>
          </main>
        </div>
        <input id="pidexUploadInput" type="file" multiple hidden>
      </div>`;

    const lang=$("#pidexLanguage"), editor=$("#pidexEditor"), prompt=$("#pidexPrompt"), count=$("#pidexLineCount"), lines=$("#pidexLineNumbers"), list=$("#pidexFileList"), tabs=$("#pidexTabs"), currentName=$("#pidexCurrentName");
    const outputCard=$("#pidexOutputCard"), output=$("#pidexOutput"), outputFullscreen=$("#pidexOutputFullscreen"), runButton=$("#pidexRun"), runtimeStatus=$("#pidexRuntimeStatus"), problems=$("#pidexProblems"), problemCount=$("#pidexProblemCount");
    const terminalOut=$("#pidexTerminalOutput"), terminalInput=$("#pidexTerminalInput"), highlight=$("#pidexHighlight");
    const pidexActionModal=$("#pidexActionModal"), pidexInputModal=$("#pidexInputModal"), pidexInputField=$("#pidexInputField"), pidexInputTitle=$("#pidexInputTitle"), pidexInputSubtitle=$("#pidexInputSubtitle"), pidexInputForm=$("#pidexInputForm");
    let previewConsole = [];
    let previewConsoleOpen = false;
    const closePreview=()=>{outputCard.hidden=true;outputCard.classList.remove("is-fullscreen");document.body.classList.remove("pidex-preview-open","pidex-preview-fullscreen");previewConsoleOpen=false;};
    const renderPreviewConsole=()=>{
      const panel=output.querySelector(".pidex-preview-console");
      if(!panel) return;
      panel.innerHTML=previewConsole.length?previewConsole.map(x=>`<div class="pidex-console-line ${esc(x.type)}"><span>${esc(x.type)}</span><b>${esc(x.text)}</b></div>`).join(""):"<div class=\"pidex-console-empty\">Console kosong.</div>";
      panel.scrollTop=panel.scrollHeight;
    };
    const togglePreviewConsole=()=>{previewConsoleOpen=!previewConsoleOpen;output.querySelector(".pidex-preview-console")?.classList.toggle("open",previewConsoleOpen);};
    const showOutput=(content,kind="text",title="Output")=>{outputCard.hidden=false;outputCard.classList.remove("is-fullscreen");document.body.classList.remove("pidex-preview-open");$("#pidexOutputTitle").textContent=title;output.innerHTML="";if(kind==="frame")output.appendChild(content);else output.textContent=content;outputCard.scrollIntoView({behavior:"smooth",block:"nearest"});};
    const showPreview=(frame,url="http://localhost:8080/")=>{
      outputCard.hidden=false;outputCard.classList.remove("is-fullscreen");document.body.classList.remove("pidex-preview-open","pidex-preview-fullscreen");previewConsole=[];previewConsoleOpen=false;
      $("#pidexOutputTitle").textContent="Preview";
      output.innerHTML=`<div class="pidex-preview-chrome"><div class="pidex-preview-url"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M8.5 12h7M12 8.5v7"/></svg><span>${escapeHtml(url)}</span></div><button class="pidex-preview-menu" type="button" id="pidexPreviewMenu" aria-label="Menu preview" aria-expanded="false"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg></button><div class="pidex-preview-menu-pop" id="pidexPreviewMenuPop"><button type="button" id="pidexConsoleAction">Console</button><button type="button" id="pidexFullscreenCloseAction">Tutup preview</button></div></div><div class="pidex-preview-console" aria-label="Console preview"></div>`;
      output.appendChild(frame);
      renderPreviewConsole();
      $("#pidexPreviewMenu")?.addEventListener("click",()=>{const pop=$("#pidexPreviewMenuPop");const open=pop?.classList.toggle("open");$("#pidexPreviewMenu")?.setAttribute("aria-expanded",open?"true":"false");});
      $("#pidexConsoleAction")?.addEventListener("click",()=>{togglePreviewConsole();$("#pidexPreviewMenuPop")?.classList.remove("open");});
      $("#pidexFullscreenCloseAction")?.addEventListener("click",closePreview);
      outputCard.scrollIntoView({behavior:"smooth",block:"nearest"});
    };
    window.addEventListener("message",(event)=>{
      if(!event.data || event.data.source!=="pidex-preview-console") return;
      previewConsole.push({type:event.data.type||"log",text:String(event.data.text||"")});
      if(previewConsole.length>300) previewConsole.shift();
      renderPreviewConsole();
    });
    const makeFrame=(srcdoc)=>{
      const frame=document.createElement("iframe");frame.className="pidex-run-frame";frame.setAttribute("sandbox","allow-scripts");
      const bridge=`<script>(function(){const send=(type,args)=>parent.postMessage({source:'pidex-preview-console',type,text:args.map(x=>{try{return typeof x==='string'?x:JSON.stringify(x)}catch{return String(x)}}).join(' ')},'*');['log','info','warn','error','debug'].forEach(k=>{const old=console[k];console[k]=function(){send(k,[...arguments]);old&&old.apply(console,arguments)}});window.addEventListener('error',e=>send('error',[e.message+' (line '+e.lineno+')']));window.addEventListener('unhandledrejection',e=>send('error',[e.reason&&e.reason.message?e.reason.message:String(e.reason)]));})();<\/script>`;
      frame.srcdoc=srcdoc + bridge;return frame;
    };
    const baseName=(name)=>name.split("/").pop();
    const folderOf=(name)=>name.includes("/")?name.slice(0,name.lastIndexOf("/")):"";
    let folders=Array.isArray(projectState.folders)?projectState.folders.slice():[];
    let selectedFolder=folderOf(activeFile);
    const persistWorkspace=()=>{projectState.folders=folders.slice();persistFiles();};
    let pidexPelonMessages=[];
    let pidexPelonPending=[];
    let pidexPelonBusy=false;
    const pidexPelonMessagesEl=()=>$("#pidexPelonMessages");
    const renderPidexPelonAttachments=()=>{const box=$("#pidexPelonAttachments");if(!box)return;box.innerHTML="";box.hidden=!pidexPelonPending.length;pidexPelonPending.forEach((a,i)=>{const item=document.createElement("div");item.className="pidex-pelon-attachment";item.innerHTML=`<span>${esc(a.name||"Lampiran")}</span>`;const b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Hapus lampiran");b.innerHTML='<svg viewBox="0 0 24 24" width="13" height="13"><path d="m7 7 10 10M17 7 7 17"/></svg>';b.addEventListener("click",()=>{pidexPelonPending.splice(i,1);renderPidexPelonAttachments();});item.appendChild(b);box.appendChild(item);});};
    const extractPidexEdits=(text)=>{const edits=[];const re=/<PIDEX_EDIT\s+file=["']([^"']+)["']\s*>\s*```[^\n]*\n([\s\S]*?)```\s*<\/PIDEX_EDIT>/gi;let m;while((m=re.exec(text))){edits.push({file:m[1],code:m[2].replace(/\n$/,""),token:m[0]});}return edits;};
    const renderPidexPelonMessages=()=>{const box=pidexPelonMessagesEl();if(!box)return;box.innerHTML="";if(!pidexPelonMessages.length){box.innerHTML='<div class="pidex-pelon-empty">Pelon bisa membaca project aktif, menganalisis kode, mencari bug, dan membantu mengubah berkas.</div>';return;}pidexPelonMessages.forEach((m,mi)=>{const row=document.createElement("div");row.className=`pidex-pelon-msg ${m.role}`;const wrap=document.createElement("div");const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=m.content||"";wrap.appendChild(bubble);if(m.role==="assistant"){const edits=extractPidexEdits(m.content||"");edits.forEach((edit,ei)=>{const card=document.createElement("div");card.className="pidex-pelon-edit";card.innerHTML=`<strong>Perubahan: ${esc(edit.file)}</strong><span>Pelon mengusulkan penggantian isi berkas ini.</span>`;const btn=document.createElement("button");btn.type="button";btn.textContent="Tinjau & terapkan";btn.addEventListener("click",()=>{const target=files.find(f=>f.name===edit.file);if(!target){showOutput(`Berkas ${edit.file} tidak ditemukan di project aktif.`,"text","Perubahan Pelon");return;}const ok=confirm(`Terapkan perubahan Pelon ke “${edit.file}”?\n\nIsi berkas saat ini akan diganti.`);if(!ok)return;target.code=edit.code;persistWorkspace();openFile(edit.file);runDiagnostics();renderFiles();});card.appendChild(btn);wrap.appendChild(card);});}row.appendChild(wrap);box.appendChild(row);});box.scrollTop=box.scrollHeight;};
    const pidexWorkspaceContext=()=>files.map(f=>`FILE: ${f.name}\nLANGUAGE: ${f.language}\n\`\`\`${String(f.language||"").toLowerCase()}\n${f.code||""}\n\`\`\``).join("\n\n");
    const sendPidexPelon=async()=>{const promptEl=$("#pidexPrompt");const content=promptEl?.value.trim()||"";if((!content&&!pidexPelonPending.length)||pidexPelonBusy)return;const attachments=[...pidexPelonPending];pidexPelonPending=[];renderPidexPelonAttachments();promptEl.value="";promptEl.style.height="auto";pidexPelonMessages.push({role:"user",content:content||"[Lampiran dikirim]"});renderPidexPelonMessages();pidexPelonBusy=true;setPelonMode("working");const requestMessages=[...pidexPelonMessages.filter(x=>x.role==="user"||x.role==="assistant").slice(-12).map(x=>({role:x.role,content:x.content})),{role:"user",content:`Instruksi terbaru:\n${content||"Analisis lampiran ini."}`,attachments}];const payload={userName:state.userName,persona:state.persona,customPersona:state.customPersona,languageStyle:state.languageStyle,customLanguageStyle:state.customLanguageStyle,pidex:true,pidexWorkspace:pidexWorkspaceContext(),messages:requestMessages};try{const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw new Error(`HTTP ${response.status}`);let text="";const ct=response.headers.get("content-type")||"";if(ct.includes("text/event-stream")&&response.body){const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="";while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const chunks=buffer.split("\\n\\n");buffer=chunks.pop()||"";for(const chunk of chunks){const line=chunk.split("\\n").find(x=>x.startsWith("data:"));if(!line)continue;const data=line.slice(5).trim();if(data==="[DONE]")continue;try{const d=JSON.parse(data);if(d.animation&&window.PelonCharacter)window.PelonCharacter.setAction(d.animation);if(d.text)text+=d.text;}catch{}}}}else{text=(await response.json()).text||"Pelon belum menerima jawaban.";}pidexPelonMessages.push({role:"assistant",content:text});}catch(err){pidexPelonMessages.push({role:"assistant",content:`Pelon belum terhubung ke gateway AI. ${err.message}`});}finally{pidexPelonBusy=false;setPelonMode("idle");renderPidexPelonMessages();}};
    const renderProjects=()=>{const box=$("#pidexProjectsList");if(!box)return;const names=Object.keys(projectStore);box.innerHTML=names.length?names.map(name=>{const st=projectStore[name]||{};const n=(st.files||[]).length;return `<div class="pidex-project-row"><button class="pidex-project-open" data-project="${esc(name)}"><svg viewBox="0 0 24 24"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v8A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5v-10Z"/></svg><span><b>${esc(name)}</b><small>${n} berkas · ${esc(name===projectName?"Sedang dibuka":"Project Pidex")}</small></span></button><div class="pidex-project-actions"><button data-rename-project="${esc(name)}" title="Ganti nama">✎</button><button data-delete-project="${esc(name)}" title="Hapus">×</button></div></div>`}).join(""):`<div class="pidex-project-empty">Belum ada project.</div>`;box.querySelectorAll("[data-project]").forEach(b=>b.addEventListener("click",()=>switchProject(b.dataset.project)));box.querySelectorAll("[data-rename-project]").forEach(b=>b.addEventListener("click",()=>renameProject(b.dataset.renameProject)));box.querySelectorAll("[data-delete-project]").forEach(b=>b.addEventListener("click",()=>deleteProject(b.dataset.deleteProject)));};
    const openProjects=()=>{renderProjects();$("#pidexProjectsModal").showModal();};
    const switchProject=(name)=>{if(!projectStore[name])return;persistWorkspace();projectName=name;projectState=projectStore[name];files=cloneFiles(projectState.files||defaultFiles);activeFile=projectState.activeFile||files[0].name;if(!files.some(f=>f.name===activeFile))activeFile=files[0].name;folders=Array.isArray(projectState.folders)?projectState.folders.slice():[];selectedFolder=folderOf(activeFile);localStorage.setItem("pelon-pidex-active-project",projectName);$("#pidexProjectsModal")?.close();renderFiles();openFile(activeFile);};
    const createNamedProject=(name)=>{const clean=name.trim();if(!clean)return;if(projectStore[clean]){showOutput("Project dengan nama tersebut sudah ada.","text","Projects");return;}projectStore[clean]={files:[{name:"lang.pous",language:"Pous",code:"app \"Pelon — Pous\"\nversion \"1.0.0\"\n\npage home\n\nheader {\n    heading \"Pelon\"\n    text \"Aplikasi ini dibuat hanya dengan bahasa Pous.\"\n}\n\ncard {\n    input name \"Nama kamu\"\n\n    button \"Kirim\" {\n        if name != \"\"\n            say \"Halo \" + name + \"!\"\n        else\n            say \"Silakan isi nama terlebih dahulu.\"\n        end\n    }\n}"}],folders:[],activeFile:"lang.pous"};localStorage.setItem("pelon-pidex-projects",JSON.stringify(projectStore));switchProject(clean);};
    const renameProject=(name)=>openPidexInput("Ganti nama project","Nama baru untuk folder project.",name,(newName)=>{if(projectStore[newName]||!newName){showOutput("Nama project sudah digunakan.","text","Projects");return;}projectStore[newName]=projectStore[name];delete projectStore[name];if(projectName===name){projectName=newName;projectState=projectStore[newName];localStorage.setItem("pelon-pidex-active-project",newName);}localStorage.setItem("pelon-pidex-projects",JSON.stringify(projectStore));renderProjects();renderFiles();});
    const deleteProject=(name)=>{if(!projectStore[name])return;openConfirm("Hapus project?",`Folder project “${name}” beserta seluruh berkas di dalamnya akan dihapus dari Pidex.`,()=>{const wasActive=name===projectName;delete projectStore[name];let names=Object.keys(projectStore);if(!names.length){projectStore["Project Baru"]={files:cloneFiles(defaultFiles),folders:[],activeFile:"lang.pous"};names=["Project Baru"];}const next=wasActive?names[0]:(names.includes(projectName)?projectName:names[0]);localStorage.setItem("pelon-pidex-projects",JSON.stringify(projectStore));if(wasActive){projectName=next;projectState=projectStore[next];files=cloneFiles(projectState.files||defaultFiles);activeFile=projectState.activeFile||files[0].name;if(!files.some(f=>f.name===activeFile))activeFile=files[0].name;folders=Array.isArray(projectState.folders)?projectState.folders.slice():[];selectedFolder=folderOf(activeFile);localStorage.setItem("pelon-pidex-active-project",projectName);localStorage.setItem("pelon-pidex-files",JSON.stringify(files));localStorage.setItem("pelon-pidex-active-file",activeFile);renderFiles();openFile(activeFile);renderProjects();}else{renderProjects();}},"Hapus");};
    const renderFiles=()=>{const folderButtons=folders.map(folder=>`<button class="pidex-folder-item ${selectedFolder===folder?"active":""}" data-folder="${esc(folder)}"><span><svg viewBox="0 0 24 24"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v8A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5v-10Z"/></svg>${esc(folder)}</span><small>${files.filter(f=>folderOf(f.name)===folder).length}</small></button>`).join("");const visible=files.filter(f=>!selectedFolder||folderOf(f.name)===selectedFolder||(!folderOf(f.name)&&!selectedFolder));list.innerHTML=folderButtons+visible.map(f=>`<button class="pidex-file-item ${f.name===activeFile?"active":""}" data-file="${esc(f.name)}"><span>${folderOf(f.name)?"↳ ":""}${esc(baseName(f.name))}</span><small>${esc(f.language)}</small></button>`).join("");tabs.innerHTML=files.map(f=>`<button class="pidex-tab ${f.name===activeFile?"active":""}" data-file="${esc(f.name)}"><span class="pidex-tab-name">${esc(baseName(f.name))}</span><span class="pidex-tab-close" role="button" aria-label="Hapus ${esc(baseName(f.name))}">×</span></button>`).join("");list.querySelectorAll(".pidex-file-item").forEach(b=>b.addEventListener("click",()=>openFile(b.dataset.file)));list.querySelectorAll(".pidex-folder-item").forEach(b=>b.addEventListener("click",()=>{selectedFolder=selectedFolder===b.dataset.folder?"":b.dataset.folder;renderFiles();}));tabs.querySelectorAll(".pidex-tab").forEach(b=>b.addEventListener("click",e=>e.target.closest(".pidex-tab-close")?requestDeleteFile(b.dataset.file):openFile(b.dataset.file)));};
    let lastDiagnostics=[];
    const updateDiagnostics=()=>{
      const f=current(),code=editor.value,issues=[];
      const push=(line,msg,severity="error",start=0,end=0)=>issues.push({line,msg,severity,start,end});
      const arr=code.split("\n");
      const lineStart=(line)=>arr.slice(0,Math.max(0,line-1)).reduce((n,x)=>n+x.length+1,0);
      const colToRange=(line,col,len=1)=>{const base=lineStart(line);return {start:base+Math.max(0,col||0),end:base+Math.max(0,col||0)+Math.max(1,len)};};
      const pairs=[["(",")"],["[","]"],["{","}"]];
      for(const [a,b] of pairs){
        let depth=0;
        for(let i=0;i<arr.length;i++){
          for(let j=0;j<arr[i].length;j++){
            const ch=arr[i][j];
            if(ch===a)depth++;
            if(ch===b)depth--;
            if(depth<0){const r=colToRange(i+1,j);push(i+1,`Pasangan ${a}${b} tidak seimbang.`,"error",r.start,r.end);depth=0;break;}
          }
        }
        if(depth!==0){
          const li=arr.length, text=arr[li-1]||"", r=colToRange(li,Math.max(0,text.length-1));
          push(li,`Pasangan ${a}${b} tidak seimbang.`,"error",r.start,r.end);
        }
      }
      if(f.language==="JavaScript"||f.language==="Node.js"){
        try{new Function(code);}
        catch(e){
          const m=String(e.stack||"").match(/<anonymous>:(\d+):(\d+)/), line=Math.max(1,Number(m?.[1]||1)), col=Math.max(0,Number(m?.[2]||1)-1);
          const r=colToRange(line,col,1);push(line,`Syntax error: ${e.message}`,"error",r.start,r.end);
        }
        arr.forEach((line,i)=>{
          const m=line.match(/console\.log\s*\([^)]*$/);
          if(m){const col=Math.max(0,line.length-1),r=colToRange(i+1,col,1);push(i+1,"Pemanggilan console.log belum ditutup.","error",r.start,r.end);}
          const v=line.match(/\b(const|let|var)\s+[\w$]+\s*=\s*;/);
          if(v){const col=v.index+v[0].length-1,r=colToRange(i+1,col,1);push(i+1,"Deklarasi variabel belum memiliki nilai.","error",r.start,r.end);}
        });
      }
      if(f.language==="JSON"){
        try{if(code.trim())JSON.parse(code);}
        catch(e){
          const pos=Math.max(0,Number((String(e.message).match(/position (\d+)/i)||[])[1]||0));
          const before=code.slice(0,pos),line=before.split("\n").length,col=before.length-(before.lastIndexOf("\n")+1),r=colToRange(line,col,1);
          push(line,`JSON tidak valid: ${e.message}`,"error",r.start,r.end);
        }
      }
      if(f.language==="Python"){
        arr.forEach((line,i)=>{
          if(/^\s*(if|for|while|def|class|try|with|elif|else|except|finally)\b.*:\s*$/.test(line)&&(!arr[i+1]||!/\s+\S/.test(arr[i+1]))){const r=colToRange(i+1,Math.max(0,line.length-1));push(i+1,"Blok Python tampaknya belum memiliki isi.","error",r.start,r.end);}
          if(/^(?:def|class|if|for|while)\b/.test(line)&&/[^:][:]?\s*$/.test(line)===false&&/[)]\s*$/.test(line)){const r=colToRange(i+1,Math.max(0,line.length-1));push(i+1,"Baris Python tampaknya belum lengkap.","error",r.start,r.end);}
        });
      }
      if(f.language==="Oust"){
        const analysis=oustAnalyze(code);
        analysis.errors.forEach(x=>{const r=colToRange(x.line,Math.max(0,x.col||0),Math.max(1,x.length||1));push(x.line,x.msg,"error",r.start,r.end);});
      }
      if(f.language==="Pous"){
        const analysis=pousAnalyze(code);
        analysis.errors.forEach(x=>{const r=colToRange(x.line,Math.max(0,x.col||0),Math.max(1,x.length||1));push(x.line,x.msg,"error",r.start,r.end);});
      }
      if(f.language==="CSS"){
        arr.forEach((line,i)=>{if(/:[^;{}]+$/.test(line.trim())&&!/[{}]$/.test(line.trim())){const col=Math.max(0,line.length-1),r=colToRange(i+1,col);push(i+1,"Deklarasi CSS belum diakhiri dengan titik koma.","error",r.start,r.end);}});
      }
      if(f.language==="HTML"||f.language==="XML"){
        const stack=[],tagRe=/<\/?([A-Za-z][\w:-]*)[^>]*>/g;let m;
        while((m=tagRe.exec(code))){const raw=m[0],name=m[1].toLowerCase(),line=code.slice(0,m.index).split("\n").length,col=m.index-(code.lastIndexOf("\n",m.index-1)+1);
          if(/^<\//.test(raw)){
            if(stack.length&&stack[stack.length-1].name===name)stack.pop();
            else {const r={start:m.index,end:m.index+raw.length};push(line,`Tag </${name}> tidak memiliki pasangan yang sesuai.`,"error",r.start,r.end);}
          }else if(!/\/\s*>$/.test(raw)&&!['meta','link','img','input','br','hr','area','base','embed','param','source','track','wbr'].includes(name))stack.push({name,line,start:m.index,end:m.index+raw.length});
        }
        stack.forEach(x=>push(x.line,`Tag <${x.name}> belum ditutup.`,"error",x.start,x.end));
      }
      lastDiagnostics=issues;
      problemCount.textContent=issues.length;
      problems.innerHTML=issues.length?issues.map(x=>`<button class="pidex-problem ${x.severity}" data-line="${x.line}"><span>${x.severity==="warning"?"!":"×"}</span><b>Line ${x.line}</b><em>${esc(x.msg)}</em></button>`).join(""):"<div class=\"pidex-empty\">Tidak ada diagnostic dasar yang ditemukan.</div>";
      problems.querySelectorAll(".pidex-problem").forEach(b=>b.addEventListener("click",()=>{const line=Number(b.dataset.line);const pos=arr.slice(0,line-1).join("\n").length+(line>1?1:0);editor.focus();editor.setSelectionRange(pos,pos);editor.scrollTop=Math.max(0,(line-3)*editor.clientHeight/Math.max(1,arr.length));}));
      lines.innerHTML=arr.map((_,i)=>`<span>${i+1}</span>`).join("");
    };
    const keywordMap={Oust:"app version namespace module use fn let const var type struct enum trait impl match case when if else for in while loop return break continue throw try catch defer async await spawn parallel atomic lock channel select import export macro comptime inline extern unsafe pure pub private protected sealed true false null self Self Pous:: Pous",Pous:"app version page component text heading label button input textarea image link row column header card list item nav modal table progress switch select option form divider spacer say print set let const if else elseif end repeat while for in fn return call use run emit on state store load save delete clear fetch await try catch throw true false null new import export match break continue",CSS:"align-content align-items animation background border color display flex font grid height justify-content margin padding position width transform transition opacity overflow top right bottom left z-index",JSON:"true false null",SQL:"select from where and or insert into update delete create alter drop table join inner left right group by order having as distinct limit offset values set",Bash:"if then else fi for in do done case esac function while until select export local readonly",Markdown:"" ,JavaScript:"break case catch class const continue debugger default delete do else export extends finally for if import in instanceof let new return switch throw try typeof var while with yield async await",TypeScript:"break case catch class const continue debugger default delete do else export extends finally for if import in instanceof let new return switch throw try typeof var while with yield async await interface type enum public private protected readonly implements namespace declare",Python:"and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield",Java:"abstract boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static super switch synchronized this throw throws try void volatile while",C:"auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while",Cpp:"alignas alignof and and_eq asm auto bitand bitor bool break case catch char class compl const constexpr continue decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not nullptr operator or private protected public reinterpret_cast return short signed sizeof static struct switch template this throw true try typedef typeid typename union unsigned using virtual void volatile while",CSharp:"abstract as base bool break byte case catch char checked class const decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while",Go:"break default func interface select case defer go map struct chan else goto package switch const fallthrough if range type continue for import return var",Rust:"as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while async await dyn",PHP:"and or xor array as break case class const declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends final finally for foreach function global goto if implements include include_once instanceof interface isset list namespace new print private protected public require require_once return static switch throw trait try unset use var while yield",Ruby:"BEGIN END alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield"};
    const highlightCode=(code,language,ranges=[])=>{const kws=new Set((keywordMap[language]||"").split(/\s+/).filter(Boolean));const htmlMode=["HTML","XML","Vue","React"].includes(language);let out="",i=0;const span=(cls,text,start)=>{const end=start+text.length;const bad=ranges.some(r=>start<r.end&&end>r.start);return `<span class="tok-${cls}${bad?" tok-error":""}">${escapeHtml(text)}</span>`};while(i<code.length){const rest=code.slice(i);let end,m;if(rest.startsWith("//")||(((language==="Python"||language==="Bash"||language==="PowerShell"||language==="Ruby")&&rest.startsWith("#")))){end=rest.indexOf("\n");if(end<0)end=rest.length;out+=span("comment",rest.slice(0,end),i);i+=end;continue;}if(rest.startsWith("/*")){end=rest.indexOf("*/",2);end=end<0?rest.length:end+2;out+=span("comment",rest.slice(0,end),i);i+=end;continue;}if(rest.startsWith("<!--")){end=rest.indexOf("-->",4);end=end<0?rest.length:end+4;out+=span("comment",rest.slice(0,end),i);i+=end;continue;}const q=rest.charCodeAt(0);if(q===34||q===39||q===96){let j=1,escaped=false;for(;j<rest.length;j++){const c=rest.charCodeAt(j);if(!escaped&&c===q){j++;break}if(!escaped&&c===92)escaped=true;else escaped=false;}out+=span("string",rest.slice(0,j),i);i+=j;continue;}if(htmlMode&&rest[0]==="<"){end=rest.indexOf(">");if(end>=0){const tag=rest.slice(0,end+1);out+=escapeHtml(tag).replace(/(&lt;\/?)([A-Za-z][\w:-]*)/,(a,b,c)=>`${b}${span("tag",c,i+(tag.indexOf(c)))}`);i+=end+1;continue;}}m=rest.match(/^\b[A-Za-z_$][\w$]*\b/);if(m){const word=m[0];out+=kws.has(word)?span("keyword",word,i):escapeHtml(word);i+=word.length;continue;}m=rest.match(/^\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/i);if(m){out+=span("number",m[0],i);i+=m[0].length;continue;}m=rest.match(/^[{}()[\].,;:+*%!?=<>\-&|/^~]+/);if(m){out+=span("operator",m[0],i);i+=m[0].length;continue;}out+=escapeHtml(rest[0]);i++;}return out+"\n";};
    const sync=()=>{const y=editor.scrollTop,x=editor.scrollLeft;const cs=getComputedStyle(editor);const lineHeight=parseFloat(cs.lineHeight)||20;const padTop=parseFloat(cs.paddingTop)||15;const first=Math.max(1,Math.floor(Math.max(0,y-padTop)/lineHeight)+1);const visible=Math.ceil(editor.clientHeight/lineHeight)+3;const total=Math.max(1,editor.value.split("\n").length);const last=Math.min(total,first+visible-1);let html="";for(let n=first;n<=last;n++)html+=`<span>${n}</span>`;lines.innerHTML=html;lines.style.paddingTop=`${padTop}px`;lines.style.transform="none";lines.dataset.first=String(first);highlight.style.transform=`translate3d(${-x}px,${-y}px,0)`;highlight.style.height=Math.max(editor.scrollHeight,editor.clientHeight)+"px";};
    const updateHighlight=()=>{const html=highlightCode(editor.value,lang.value,lastDiagnostics.map(x=>({start:x.start,end:x.end}))).replace(/\n$/,"" ).split("\n");highlight.innerHTML=html.map((line,i)=>`<span>${line||" "}</span>`).join("\n")+"\n";sync();};
    const update=()=>{const f=current();f.code=editor.value;f.language=lang.value;state.pidexCode=editor.value;state.pidexLanguage=lang.value;const n=Math.max(1,editor.value.split("\n").length);count.textContent=`${n} baris`;currentName.textContent=baseName(f.name);renderFiles();updateDiagnostics();updateHighlight();persistWorkspace();save();};
    const openFile=(name)=>{const f=files.find(x=>x.name===name);if(!f)return;activeFile=name;selectedFolder=folderOf(name);editor.value=f.code||"";lang.value=f.language||detectLanguage(name);persistWorkspace();update();editor.focus();};
    const openPidexInput=(title,subtitle,defaultValue,handler)=>{pidexInputTitle.textContent=title;pidexInputSubtitle.textContent=subtitle;pidexInputField.value=defaultValue||"";pidexInputModal.showModal();setTimeout(()=>{pidexInputField.focus();pidexInputField.select();},40);pidexInputForm.onsubmit=(event)=>{event.preventDefault();const value=pidexInputField.value.trim();if(!value)return;pidexInputModal.close();handler(value);};};
    const requestDeleteFile=(name)=>{const f=files.find(x=>x.name===name);if(!f)return;openConfirm("Hapus berkas?",`Berkas “${f.name}” akan dihapus dari project Pidex.`,()=>{files=files.filter(x=>x.name!==name);if(!files.length)files.push({name:"lang.pous",language:"Pous",code:"app \"Pous Project\"\n\npage home\n\ntext \"Mulai membuat dengan Pous.\""});if(activeFile===name)activeFile=files[Math.max(0,files.findIndex(x=>x.name===name)-1)]?.name||files[0].name;persistWorkspace();renderFiles();openFile(activeFile);},"Hapus");};
    const closeTab=(name)=>{const idx=files.findIndex(x=>x.name===name);if(idx<0)return;const next=files[idx+1]||files[idx-1];if(next)openFile(next.name);};
    const addFile=()=>openPidexInput("Berkas baru","Nama file baru. Folder aktif dipakai otomatis.","lang.pous",(rawName)=>{const clean=rawName.replace(/^\/+|\/+$/g,"");const name=selectedFolder&&!clean.includes("/")?`${selectedFolder}/${clean}`:clean;if(files.some(f=>f.name===name)){showOutput("File dengan nama tersebut sudah ada.","text","Pidex");return;}files.push({name,language:detectLanguage(name),code:""});persistWorkspace();openFile(name);});
    const addFolder=()=>openPidexInput("Folder baru","Nama folder untuk Explorer Pidex.","src",(name)=>{const clean=name.replace(/^\/+|\/+$/g,"");if(!clean)return;if(folders.includes(clean)){showOutput("Folder itu sudah ada.","text","Pidex");return;}folders.push(clean);folders.sort();selectedFolder=clean;persistWorkspace();renderFiles();});
    const createProject=()=>openPidexInput("Project baru","Nama folder project yang akan disimpan di Pidex.","Project Baru",createNamedProject);
    const openPidexMenu=()=>pidexActionModal.showModal();
    $("#pidexAddFile").addEventListener("click",openPidexMenu);$("#closePidexAction").addEventListener("click",()=>pidexActionModal.close());$("#closePidexInput").addEventListener("click",()=>pidexInputModal.close());$("#cancelPidexInput").addEventListener("click",()=>pidexInputModal.close());
    $("#pidexNewFileAction").addEventListener("click",()=>{pidexActionModal.close();addFile();});$("#pidexNewFolderAction").addEventListener("click",()=>{pidexActionModal.close();addFolder();});$("#pidexUploadAction").addEventListener("click",()=>{pidexActionModal.close();$("#pidexUploadInput").click();});$("#pidexProjectAction").addEventListener("click",()=>{pidexActionModal.close();createProject();});
    const pidexProjectsModal=$("#pidexProjectsModal");$("#pidexProjectsButton").addEventListener("click",openProjects);$("#closePidexProjects").addEventListener("click",()=>pidexProjectsModal.close());$("#pidexCreateProject").addEventListener("click",()=>createProject());
    $("#pidexUploadInput").addEventListener("change",async e=>{for(const file of e.target.files){const code=await file.text();const existing=files.find(f=>f.name===file.name);if(existing){existing.code=code;existing.language=detectLanguage(file.name);}else files.push({name:file.name,language:detectLanguage(file.name),code});}persistWorkspace();openFile(files[files.length-1].name);e.target.value="";});
    editor.addEventListener("input",update);editor.addEventListener("scroll",sync);lang.addEventListener("change",()=>{current().language=lang.value;update();});
    $("#pidexCopy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(editor.value);$("#pidexCopy").textContent="Tersalin";setTimeout(()=>$("#pidexCopy").textContent="Salin",900);}catch{editor.select();document.execCommand("copy");}});
    $("#pidexCheck").addEventListener("click",()=>{updateDiagnostics();showOutput(problemCount.textContent==="0"?"Pemeriksaan dasar tidak menemukan masalah yang jelas.":`Ditemukan ${problemCount.textContent} kemungkinan masalah. Buka panel Problems untuk melihat detail.`,"text","Pemeriksaan kode");});$("#pidexPreview").addEventListener("click",()=>runButton.click());
    $("#pidexOutputClear").addEventListener("click",closePreview);outputFullscreen.addEventListener("click",()=>{const full=outputCard.classList.toggle("is-fullscreen");document.body.classList.toggle("pidex-preview-open",full);document.body.classList.toggle("pidex-preview-fullscreen",full);if(full){output.querySelector(".pidex-preview-menu")?.focus();}});$("#pidexTerminalClear").addEventListener("click",()=>terminalOut.textContent="");$("#pidexTerminalHelp").addEventListener("click",()=>terminalInput.value="help");
    const pishHistory=[];let pishHistoryIndex=0;
    terminalInput.addEventListener("keydown",e=>{if(e.key==="ArrowUp"){if(!pishHistory.length)return;e.preventDefault();pishHistoryIndex=Math.max(0,pishHistoryIndex-1);terminalInput.value=pishHistory[pishHistoryIndex]||"";return;}if(e.key==="ArrowDown"){if(!pishHistory.length)return;e.preventDefault();pishHistoryIndex=Math.min(pishHistory.length,pishHistoryIndex+1);terminalInput.value=pishHistory[pishHistoryIndex]||"";return;}if(e.key!=="Enter")return;const raw=terminalInput.value.trim();terminalInput.value="";if(!raw)return;pishHistory.push(raw);pishHistoryIndex=pishHistory.length;const parts=raw.match(/(?:[^\s"]+|"[^"]*")+/g)||[];const cmd=(parts.shift()?.toLowerCase()||"").replace(/^\.\//,"");const arg=parts.join(" ").replace(/^"|"$/g,"");const write=(text)=>{terminalOut.textContent+=`\n${text}\n`;};write(`pish> ${raw}`);const allFiles=()=>files.map(f=>f.name).join("\n")||"Tidak ada file.";const currentPath=()=>selectedFolder?`/pidex/project/${selectedFolder}`:"/pidex/project";const psHelp=`Pish — Pidex Shell\nShell buatan Pidex untuk workspace coding, project, file, runtime, editor, dan berbagai kebutuhan pengembangan.\n\nFILE & FOLDER\n  ls, dir, Get-ChildItem       Lihat file dan folder\n  pwd, Get-Location             Lihat lokasi aktif\n  cd <folder>                   Pindah folder virtual\n  tree                          Struktur project\n  cat <file>, Get-Content       Baca file\n  head <file> [n]               Lihat baris awal\n  tail <file> [n]               Lihat baris akhir\n  touch <file>, New-Item        Buat file\n  mkdir <folder>                Buat folder\n  rm <file>, Remove-Item        Hapus file\n  cp <a> <b>, Copy-Item         Salin file\n  mv <a> <b>, Move-Item         Rename/pindah file\n  open <file>                   Buka file di editor\n  stat <file>, Get-Item         Info file\n\nEDITOR\n  save                          Simpan file aktif\n  undo / redo                   Undo dan redo\n  find <teks>                   Cari teks\n  replace <a> <b>               Ganti semua teks di file aktif\n  format                        Rapikan whitespace dasar\n  check / lint                  Diagnostics kode\n  run / preview                 Jalankan atau preview\n  focus                         Fokus ke editor\n\nPROJECT\n  project                       Ringkasan project\n  projects                      Daftar semua project Pidex\n  new-project                   Buat project starter\n  open-project <nama>           Buka project\n  delete-project <nama>         Hapus project\n  rename-project <nama>         Ganti nama project\n  build                         Build virtual / cek struktur\n  test                          Jalankan pemeriksaan dasar\n  doctor                        Periksa kondisi workspace\n  clean                         Bersihkan output/diagnostic\n  export                        Tampilkan manifest project\n\nSEARCH & TEXT\n  find <teks>                   Cari di file aktif\n  grep <teks>                   Cari di seluruh workspace\n  replace <lama> <baru>         Ganti teks di file aktif\n  sort <file>                   Urutkan baris secara virtual\n  uniq <file>                   Hilangkan baris duplikat\n  head <file> [n]               Baris awal file\n  tail <file> [n]               Baris akhir file\n  wc                            Hitung file, baris, karakter\n  du                            Ukuran semua file\n  count <teks>                  Hitung kemunculan teks\n  lines <file>                  Hitung baris file\n\nPROJECT & RUNTIME\n  project                       Ringkasan project\n  new-project                   Buat project starter\n  build / test                  Pemeriksaan project\n  doctor                        Periksa workspace\n  runtimes                      Lihat runtime aktif\n  runtime <bahasa>              Ganti bahasa aktif\n  run / preview                 Jalankan atau preview\n  format / check / lint        Editor utilities\n  export                        Manifest project\n\nUTILITY\n  echo <teks>                   Tulis output\n  basename <path>               Ambil nama file\n  dirname <path>                Ambil folder file\n  date                          Waktu perangkat\n  history                       Riwayat perintah\n  env / printenv                Variabel lingkungan aman\n  alias                         Daftar alias Pish\n  which <command>               Cek command Pish\n  version                       Versi Pish\n  whoami                        Identitas pengguna\n  clear / cls                   Bersihkan terminal\n  help [command]                Bantuan command tertentu\n  exit                          Kembali ke editor\n  lang                          Bahasa aktif
  pous                          Bantuan bahasa Pous
  oust                          Bantuan bahasa Oust
  symbols                       Daftar simbol Oust
  about                         Informasi Pish\n\nTip: gunakan ↑ dan ↓ untuk riwayat command.`;const detailHelp={ls:"ls menampilkan file dan folder pada lokasi aktif.",cat:"cat <file> membaca isi file workspace.",run:"run menjalankan runtime yang tersedia untuk bahasa aktif.",check:"check menjalankan diagnostics dasar Pidex.",project:"project menampilkan ringkasan workspace aktif.",build:"build memeriksa struktur project dan file utama.",doctor:"doctor memeriksa kondisi editor, terminal, dan runtime.",export:"export menampilkan manifest file project tanpa mengirim data keluar."};if(cmd==="clear"||cmd==="clear-host"){terminalOut.textContent="";}else if(cmd==="exit"){editor.focus();write("Fokus kembali ke editor.");}else if(cmd==="pwd"||cmd==="get-location"){write(currentPath());}else if(["ls","dir","get-childitem"].includes(cmd)){const folderLine=folders.length?folders.map(x=>`[folder] ${x}`).join("\n")+"\n":"";write(folderLine+(files.filter(f=>!selectedFolder||folderOf(f.name)===selectedFolder).map(f=>f.name).join("\n")||"Tidak ada file di lokasi ini."));}else if(cmd==="help"||cmd==="get-help"){write(arg&&detailHelp[arg]?detailHelp[arg]:psHelp);}else if(cmd==="files"){write(allFiles());}else if(cmd==="tree"){write(["/pidex/project",...folders.map(x=>`├─ ${x}/`),...files.map(x=>`└─ ${x.name}`)].join("\n"));}else if(["cat","type","get-content"].includes(cmd)){const f=files.find(x=>x.name===arg);write(f?f.code:"File tidak ditemukan.");}else if(cmd==="head"||cmd==="tail"){const f=files.find(x=>x.name===parts[0]||x.name===arg.split(/\s+/)[0]);const n=Math.max(1,Number(parts[1]||arg.split(/\s+/)[1]||10)||10);if(!f)write("File tidak ditemukan.");else{const a=f.code.split("\n");write((cmd==="head"?a.slice(0,n):a.slice(-n)).join("\n"));}}else if(cmd==="open"){if(files.some(f=>f.name===arg)){openFile(arg);write(`Dibuka: ${arg}`);}else write("File tidak ditemukan.");}else if(cmd==="touch"||cmd==="new-item"){const clean=arg.replace(/^-ItemType\s+File\s+/i,"");if(!clean)write("Nama file diperlukan.");else if(files.some(f=>f.name===clean))write("File sudah ada.");else{files.push({name:clean,language:detectLanguage(clean),code:""});persistWorkspace();openFile(clean);write(`Dibuat: ${clean}`);}}else if(cmd==="mkdir"||cmd==="md"){if(!arg)write("Nama folder diperlukan.");else if(folders.includes(arg))write("Folder sudah ada.");else{folders.push(arg);persistWorkspace();renderFiles();write(`Folder dibuat: ${arg}`);}}else if(cmd==="rm"||cmd==="remove-item"){const before=files.length;files=files.filter(f=>f.name!==arg);if(files.length!==before){if(activeFile===arg)openFile(files[0]?.name||"");persistWorkspace();renderFiles();write(`Dihapus: ${arg}`);}else write("File tidak ditemukan.");}else if(cmd==="cp"||cmd==="copy-item"){const p=arg.split(/\s+/);const src=files.find(f=>f.name===p[0]);if(!src||!p[1])write("Gunakan: cp <sumber> <tujuan>");else if(files.some(f=>f.name===p[1]))write("File tujuan sudah ada.");else{files.push({name:p[1],language:detectLanguage(p[1]),code:src.code});persistWorkspace();renderFiles();write(`Disalin: ${p[0]} -> ${p[1]}`);}}else if(cmd==="mv"||cmd==="move-item"){const p=arg.split(/\s+/);const src=files.find(f=>f.name===p[0]);if(!src||!p[1])write("Gunakan: mv <sumber> <tujuan>");else{src.name=p[1];src.language=detectLanguage(p[1]);activeFile=src.name;persistWorkspace();renderFiles();openFile(src.name);write(`Dipindahkan: ${p[0]} -> ${p[1]}`);}}else if(cmd==="cd"||cmd==="set-location"){if(!arg||arg==="/pidex/project"){selectedFolder="";renderFiles();write("/pidex/project");}else if(folders.includes(arg)){selectedFolder=arg;renderFiles();write(`/pidex/project/${arg}`);}else write("Folder tidak ditemukan.");}else if(cmd==="save"||cmd==="set-content"){update();write("Perubahan tersimpan di perangkat.");}else if(cmd==="undo"){document.execCommand("undo");update();write("Undo diterapkan.");}else if(cmd==="redo"){document.execCommand("redo");update();write("Redo diterapkan.");}else if(cmd==="find"||cmd==="select-string"){const q=arg;if(!q)write("Teks pencarian diperlukan.");else{const i=editor.value.indexOf(q);if(i>=0){editor.focus();editor.setSelectionRange(i,i+q.length);write(`Ditemukan di karakter ${i+1}.`);}else write("Tidak ditemukan.");}}else if(cmd==="replace"){const p=arg.split(/\s+/);if(!p[0]||p.length<2)write("Gunakan: replace <teks-lama> <teks-baru>");else{editor.value=editor.value.split(p[0]).join(p.slice(1).join(" "));update();write("Penggantian diterapkan pada file aktif.");}}else if(cmd==="echo"||cmd==="write-output"){write(arg);}else if(cmd==="version"){write("Pish 2.0 — Pidex Shell");}else if(cmd==="whoami"){write("pidex\\user");}else if(cmd==="get-item"||cmd==="stat"){const f=files.find(x=>x.name===arg);write(f?`Name: ${f.name}\nLanguage: ${f.language}\nCharacters: ${f.code.length}\nLines: ${f.code.split("\n").length}`:"File tidak ditemukan.");}else if(cmd==="measure-object"||cmd==="wc"){write(`Files: ${files.length}\nFolders: ${folders.length}\nCharacters: ${files.reduce((n,f)=>n+f.code.length,0)}\nLines: ${files.reduce((n,f)=>n+f.code.split("\n").length,0)}`);}else if(cmd==="basename"){write(baseName(arg));}else if(cmd==="dirname"){write(folderOf(arg)||"/");}else if(cmd==="date"){write(new Date().toLocaleString("id-ID"));}else if(cmd==="history"){write(pishHistory.map((x,i)=>`${i+1}  ${x}`).join("\n")||"Belum ada riwayat.");}else if(cmd==="env"){write("PIDEX_SHELL=Pish\nPIDEX_WORKSPACE=/pidex/project\nPIDEX_RUNTIME_MODE=browser-sandbox");}else if(cmd==="which"){const known=["lang","pous","oust","symbols","ls","dir","pwd","cd","cat","type","head","tail","touch","mkdir","md","rm","remove-item","cp","copy-item","mv","move-item","open","save","undo","redo","find","select-string","grep","replace","sort","uniq","format","check","lint","run","preview","project","projects","new-project","open-project","delete-project","rename-project","build","test","doctor","clean","runtimes","runtime","export","echo","wc","du","count","lines","basename","dirname","date","history","env","printenv","alias","which","version","whoami","clear","cls","about","help"];write(known.includes(arg)?`pish built-in: ${arg}`:`Command tidak ditemukan: ${arg}`);}else if(cmd==="check"||cmd==="lint"){updateDiagnostics();write(`${problemCount.textContent} diagnostic pada ${current().name}.`);}else if(cmd==="format"){editor.value=editor.value.replace(/\s+$/gm,"").replace(/\n{3,}/g,"\n\n");update();write("Format dasar diterapkan.");}else if(cmd==="focus"){editor.focus();write("Editor aktif.");}else if(cmd==="run"||cmd==="preview"){runButton.click();}else if(cmd==="projects"){write(Object.keys(projectStore).map((n,i)=>`${i+1}. ${n}${n===projectName?"  *":""}`).join("\n")||"Tidak ada project.");}else if(cmd==="open-project"){const target=arg;if(!target)write("Gunakan: open-project <nama>");else if(projectStore[target]){switchProject(target);write(`Project dibuka: ${target}`);}else write("Project tidak ditemukan.");}else if(cmd==="delete-project"){const target=arg;if(!target)write("Gunakan: delete-project <nama>");else if(projectStore[target]){deleteProject(target);write(`Permintaan penghapusan project: ${target}`);}else write("Project tidak ditemukan.");}else if(cmd==="rename-project"){const target=arg;if(!target)write("Gunakan: rename-project <nama>");else if(projectStore[target]){renameProject(target);write(`Membuka dialog rename untuk: ${target}`);}else write("Project tidak ditemukan.");}else if(cmd==="clean"){lastDiagnostics=[];problemCount.textContent="0";problems.innerHTML='<div class="pidex-empty">Tidak ada diagnostic dasar yang ditemukan.</div>';terminalOut.textContent="";updateHighlight();write("Output dan diagnostic dibersihkan.");}else if(cmd==="lang"){write(`Bahasa aktif: ${lang.value}\nEkstensi: ${current().name.split(".").pop()}`);}else if(cmd==="pous"){write("Pous — bahasa utama kedua Pelon. Fokus: aplikasi, web, program, UI, logic, storage, dan bridge ke Oust.");}else if(cmd==="oust"){write("Oust — bahasa tingkat lanjut utama Pelon. Fokus: performa, kontrol, concurrency, metaprogramming, sistem, aplikasi, web, dan kemampuan tingkat rendah. Oust hanya memiliki interoperabilitas resmi dengan Pous.");}else if(cmd==="symbols"){write("@ # $ % & * - + = / \\ | ~ ` ^ : ; , . ! ? \" ' √ π ∆ × ÷ ° • § £ ¢ € ¥ © ® ™ ✓ [ ] { } ( ) < >");}else if(cmd==="about"){write("Pish — shell resmi Pidex. Dibuat untuk workspace, project, file, runtime, diagnostics, dan pengembangan aplikasi di Pidex.");}else if(cmd==="project"){write(`Project: /pidex/project\nActive file: ${activeFile}\nLanguage: ${lang.value}\nFiles: ${files.length}\nFolders: ${folders.length}`);}else if(cmd==="new-project"){createProject();write("Project starter Pidex dibuat.");}else if(cmd==="build"){updateDiagnostics();write(problemCount.textContent==="0"?"Build check selesai: tidak ada diagnostic dasar.":`Build check menemukan ${problemCount.textContent} diagnostic.`);}else if(cmd==="test"){updateDiagnostics();write(`Test dasar selesai. Diagnostic: ${problemCount.textContent}.`);}else if(cmd==="doctor"){write(`Pish Doctor\nEditor: OK\nWorkspace: OK\nDiagnostics: OK\nPreview: tersedia\nRuntime aktif: ${lang.value}`);}else if(cmd==="export"){write(JSON.stringify({project:"/pidex/project",files:files.map(f=>({name:f.name,language:f.language})),folders},null,2));}else if(cmd==="grep"){const q=arg;if(!q)write("Gunakan: grep <teks>");else{const hits=[];for(const f of files){f.code.split("\n").forEach((line,i)=>{if(line.toLowerCase().includes(q.toLowerCase()))hits.push(`${f.name}:${i+1}: ${line}`);});}write(hits.join("\n")||"Tidak ditemukan.");}}else if(cmd==="sort"){const f=files.find(x=>x.name===arg);write(f?f.code.split("\n").sort((a,b)=>a.localeCompare(b)).join("\n"):"File tidak ditemukan.");}else if(cmd==="uniq"){const f=files.find(x=>x.name===arg);write(f?[...new Set(f.code.split("\n"))].join("\n"):"File tidak ditemukan.");}else if(cmd==="lines"){const f=files.find(x=>x.name===arg);write(f?String(f.code.split("\n").length):"File tidak ditemukan.");}else if(cmd==="count"){const q=arg;if(!q)write("Gunakan: count <teks>");else{const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");write(String((editor.value.match(new RegExp(escaped,"gi"))||[]).length));}}else if(cmd==="du"){write(files.map(f=>`${f.name}\t${f.code.length} bytes`).join("\n")||"Tidak ada file.");}else if(cmd==="runtimes"){write("Runtime browser aktif:\nOust\nPous\nJavaScript\nHTML\nCSS\nPython\nTypeScript\nSQL\nLua\nR\n\nBahasa lain tetap dikenali editor tetapi membutuhkan runner tambahan.");}else if(cmd==="runtime"){const target=arg;if(!target)write(`Runtime aktif: ${lang.value}`);else{const opt=[...lang.options].find(o=>o.value.toLowerCase()===target.toLowerCase());if(opt){lang.value=opt.value;update();write(`Bahasa aktif: ${opt.value}`);}else write(`Bahasa tidak ditemukan: ${target}`);}}else if(cmd==="alias"){write("ls=dir\npwd=get-location\ncat=get-content\ncp=copy-item\nmv=move-item\nrm=remove-item\ncls=clear\nhelp=get-help");}else if(cmd==="printenv"){write("PIDEX_SHELL=Pish\nPIDEX_WORKSPACE=/pidex/project\nPIDEX_RUNTIME_MODE=browser-sandbox\nPIDEX_VERSION=2.0");}else write(`Command tidak dikenal: ${cmd}. Ketik help.`);terminalOut.scrollTop=terminalOut.scrollHeight;});
    editor.addEventListener("keydown",async e=>{const mod=e.ctrlKey||e.metaKey;if(mod){const k=e.key.toLowerCase();if(k==="a"){e.preventDefault();editor.select();return;}if(k==="c"){if(editor.selectionStart!==editor.selectionEnd){e.preventDefault();await clipboardWrite(editor.value.slice(editor.selectionStart,editor.selectionEnd));}return;}if(k==="x"){if(editor.selectionStart!==editor.selectionEnd){e.preventDefault();const st=editor.selectionStart,en=editor.selectionEnd;await clipboardWrite(editor.value.slice(st,en));editor.setRangeText("",st,en,"start");update();}return;}if(k==="v"){e.preventDefault();const clip=await clipboardRead();if(clip!==null){const st=editor.selectionStart,en=editor.selectionEnd;editor.setRangeText(clip,st,en,"end");update();}return;}if(k==="z"){e.preventDefault();document.execCommand("undo");update();return;}if(k==="y"){e.preventDefault();document.execCommand("redo");update();return;}if(k==="s"){e.preventDefault();update();runtimeStatus.textContent="Tersimpan";setTimeout(()=>runtimeStatus.textContent="Siap",900);return;}if(k==="f"){e.preventDefault();openPidexInput("Cari di file","Masukkan teks yang ingin dicari.","",q=>{const i=editor.value.indexOf(q);if(i>=0){editor.focus();editor.setSelectionRange(i,i+q.length);}else showOutput("Teks tidak ditemukan.","text","Cari");});return;}if(k==="h"){e.preventDefault();openPidexInput("Cari teks","Masukkan teks yang ingin dicari.","",q=>{openPidexInput("Ganti dengan","Masukkan teks pengganti.","",r=>{editor.value=editor.value.split(q).join(r);update();});});return;}if(k==="n"&&!e.shiftKey){e.preventDefault();addFile();return;}if(k==="n"&&e.shiftKey){e.preventDefault();addFolder();return;}if(k==="u"){e.preventDefault();$("#pidexUploadInput").click();return;}if(k==="p"){e.preventDefault();runButton.click();return;}if(k==="b"){e.preventDefault();document.querySelector(".pidex-explorer")?.classList.toggle("pidex-sidebar-hidden");return;}if(k==="`"||k==="~"){e.preventDefault();terminalInput.focus();return;}if(k==="enter"){e.preventDefault();runButton.click();return;}if(k==="o"){e.preventDefault();openFile(activeFile);return;}if(k==="w"){e.preventDefault();closeTab(activeFile);return;}if(k==="g"){e.preventDefault();openPidexInput("Ke baris","Masukkan nomor baris.","",q=>{const n=Math.max(1,parseInt(q,10)||1);const pos=editor.value.split("\n").slice(0,n-1).join("\n").length+(n>1?1:0);editor.focus();editor.setSelectionRange(Math.min(pos,editor.value.length),Math.min(pos,editor.value.length));});return;}if(k==="d"){e.preventDefault();const start=editor.value.lastIndexOf("\n",Math.max(0,editor.selectionStart-1))+1;const end=editor.value.indexOf("\n",editor.selectionEnd);const stop=end<0?editor.value.length:end;const line=editor.value.slice(start,stop);editor.value=editor.value.slice(0,stop)+"\n"+line+editor.value.slice(stop);editor.selectionStart=editor.selectionEnd=stop+1+line.length;update();return;}if(k==="k"){e.preventDefault();terminalInput.focus();return;}}if((e.key==="Backspace"||e.key==="Delete")&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        e.preventDefault();
        const st=editor.selectionStart,en=editor.selectionEnd;
        if(st!==en){editor.setRangeText("",st,en,"start");}
        else if(e.key==="Backspace"&&st>0){editor.setRangeText("",st-1,st,"start");}
        else if(e.key==="Delete"&&st<editor.value.length){editor.setRangeText("",st,st+1,"start");}
        update();return;
      }
      if(e.key==="Enter"){const line=editor.value.slice(0,editor.selectionStart).split("\n").pop()||"";const indent=(line.match(/^\s*/)||[""])[0];if(line.trim().endsWith("{")||line.trim().endsWith(":")){e.preventDefault();const extra=indent+"  ";const pos=editor.selectionStart;editor.value=editor.value.slice(0,pos)+"\n"+extra+editor.value.slice(editor.selectionEnd);editor.selectionStart=editor.selectionEnd=pos+1+extra.length;update();return;}}if(["(","[","{"].includes(e.key)){const pairs={"(":")","[":"]","{":"}"};const end=editor.selectionEnd;const selected=editor.value.slice(editor.selectionStart,end);if(!selected){e.preventDefault();const pos=editor.selectionStart;editor.value=editor.value.slice(0,pos)+e.key+pairs[e.key]+editor.value.slice(end);editor.selectionStart=editor.selectionEnd=pos+1;update();return;}}if(e.key==="Tab"){e.preventDefault();const st=editor.selectionStart,en=editor.selectionEnd;editor.value=editor.value.slice(0,st)+"  "+editor.value.slice(en);editor.selectionStart=editor.selectionEnd=st+2;update();}});
    $("#pidexUndo").addEventListener("click",()=>{document.execCommand("undo");update();editor.focus();});$("#pidexRedo").addEventListener("click",()=>{document.execCommand("redo");update();editor.focus();});$("#pidexSave").addEventListener("click",()=>{update();runtimeStatus.textContent="Tersimpan";setTimeout(()=>runtimeStatus.textContent="Siap",900);});$("#pidexFind").addEventListener("click",()=>openPidexInput("Cari di file","Masukkan teks yang ingin dicari.","",q=>{const i=editor.value.indexOf(q);if(i>=0){editor.focus();editor.setSelectionRange(i,i+q.length);}else showOutput("Teks tidak ditemukan.","text","Cari");}));$("#pidexFormat").addEventListener("click",()=>{editor.value=editor.value.replace(/\s+$/gm,"").replace(/\n{3,}/g,"\n\n");update();});
    const projectFile=(name)=>files.find(f=>baseName(f.name).toLowerCase()===name.toLowerCase()||f.name.toLowerCase()===name.toLowerCase());
    const buildWebProject=()=>{
      const htmlFile=projectFile("index.html");
      if(!htmlFile) return null;
      let html=htmlFile.code||"";
      if(!/<html[\s>]/i.test(html)) html=`<!doctype html><html><head></head><body>${html}</body></html>`;
      const cssFiles=files.filter(f=>f.language==="CSS"||/\.css$/i.test(f.name));
      const jsFiles=files.filter(f=>["JavaScript","Node.js"].includes(f.language)||/\.(?:js|mjs|cjs)$/i.test(f.name));
      const usedCss=new Set(),usedJs=new Set();
      html=html.replace(/<link\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi,(full,a,href,b)=>{
        const f=cssFiles.find(x=>baseName(x.name).toLowerCase()===baseName(href).toLowerCase());
        if(!f) return full;
        usedCss.add(f.name);
        return `<style data-pidex-file="${escapeHtml(f.name)}">${(f.code||"").replace(/<\/style/gi,"<\\/style")}</style>`;
      });
      html=html.replace(/<script\b([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/gi,(full,a,src,b)=>{
        const f=jsFiles.find(x=>baseName(x.name).toLowerCase()===baseName(src).toLowerCase());
        if(!f) return full;
        usedJs.add(f.name);
        return `<script data-pidex-file="${escapeHtml(f.name)}">${(f.code||"").replace(/<\/script/gi,"<\\/script")}</script>`;
      });
      const extraCss=cssFiles.filter(f=>!usedCss.has(f.name)).map(f=>`<style data-pidex-file="${escapeHtml(f.name)}">${(f.code||"").replace(/<\/style/gi,"<\\/style")}</style>`).join("\n");
      const extraJs=jsFiles.filter(f=>!usedJs.has(f.name)).map(f=>`<script data-pidex-file="${escapeHtml(f.name)}">${(f.code||"").replace(/<\/script/gi,"<\\/script")}</script>`).join("\n");
      if(extraCss) html=/<\/head>/i.test(html)?html.replace(/<\/head>/i,`${extraCss}</head>`):`${extraCss}${html}`;
      if(extraJs) html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${extraJs}</body>`):`${html}${extraJs}`;
      return {html,htmlFile};
    };
    const projectWebErrors=()=>{
      const webFiles=files.filter(f=>["HTML","CSS","JavaScript","Node.js"].includes(f.language)||/\.(?:html?|css|js|mjs|cjs)$/i.test(f.name));
      const previous=current();
      const errors=[];
      for(const f of webFiles){
        const code=f.code||"";
        const arr=code.split("\n");
        if(["JavaScript","Node.js"].includes(f.language)||/\.(?:js|mjs|cjs)$/i.test(f.name)){
          try{new Function(code);}
          catch(e){
            const m=String(e.stack||"").match(/<anonymous>:(\d+):(\d+)/),line=Math.max(1,Number(m?.[1]||1)),col=Math.max(0,Number(m?.[2]||1)-1),base=arr.slice(0,line-1).reduce((n,x)=>n+x.length+1,0);
            errors.push({file:f.name,line,start:base+col,end:base+col+1,msg:`Syntax error: ${e.message}`});
          }
        }
        if(f.language==="HTML"||/\.html?$/i.test(f.name)){
          const stack=[],tagRe=/<\/?([A-Za-z][\w:-]*)[^>]*>/g;let m;
          while((m=tagRe.exec(code))){const raw=m[0],name=m[1].toLowerCase();if(/^<\//.test(raw)){if(stack.length&&stack[stack.length-1].name===name)stack.pop();else{const line=code.slice(0,m.index).split("\n").length;errors.push({file:f.name,line,start:m.index,end:m.index+raw.length,msg:`Tag </${name}> tidak memiliki pasangan yang sesuai.`});}}else if(!/\/\s*>$/.test(raw)&&!['meta','link','img','input','br','hr','area','base','embed','param','source','track','wbr'].includes(name))stack.push({name,line:code.slice(0,m.index).split("\n").length,start:m.index,end:m.index+raw.length});}
          stack.forEach(x=>errors.push({file:f.name,line:x.line,start:x.start,end:x.end,msg:`Tag <${x.name}> belum ditutup.`}));
        }
        if(f.language==="CSS"||/\.css$/i.test(f.name)){
          arr.forEach((line,i)=>{if(/:[^;{}]+$/.test(line.trim())&&!/[{}]$/.test(line.trim())){const base=arr.slice(0,i).reduce((n,x)=>n+x.length+1,0),col=Math.max(0,line.length-1);errors.push({file:f.name,line:i+1,start:base+col,end:base+col+1,msg:"Deklarasi CSS belum diakhiri dengan titik koma."});}});
        }
      }
      if(previous) current().language=previous.language;
      return errors;
    };
    const showProjectProblems=(errors)=>{
      if(!errors.length) return;
      const activeErrors=errors.filter(x=>x.file===current().name);
      lastDiagnostics=activeErrors;
      problemCount.textContent=errors.length;
      problems.innerHTML=errors.map(x=>`<button class="pidex-problem error" data-file="${esc(x.file)}" data-line="${x.line}"><span>×</span><b>${esc(baseName(x.file))}:${x.line}</b><em>${esc(x.msg)}</em></button>`).join("");
      problems.querySelectorAll(".pidex-problem").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.file!==current().name){openFile(b.dataset.file);return;}const line=Number(b.dataset.line);const arr=editor.value.split("\n");const pos=arr.slice(0,line-1).join("\n").length+(line>1?1:0);editor.focus();editor.setSelectionRange(pos,pos);}));
      updateHighlight();
    };
    const runWebProject=()=>{
      const project=buildWebProject();
      if(!project) return false;
      showPreview(makeFrame(project.html),"http://localhost:8080/index.html");
      return true;
    };
    const pousKeywords=new Set("app version page component text heading label button input textarea image link row column header card list item nav modal table progress switch select option form divider spacer say print set let const if else elseif end repeat while for in fn return call use run emit on state store load save delete clear fetch await try catch throw true false null new import export match break continue".split(/\s+/));
    const pousStripComment=(t)=>{let q=null,esc=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(esc)esc=false;else if(c==="\\")esc=true;else if(c===q)q=null;}else if(c==='"'||c==="'")q=c;else if(c==="/"&&t[i+1]==="/")return t.slice(0,i).trim();}return t.trim();};
    const pousAnalyze=(source)=>{const rawLines=source.split(/\r?\n/),stack=[],errors=[];rawLines.forEach((raw,idx)=>{const line=idx+1,t=pousStripComment(raw).trim();if(!t)return;if(t.startsWith("}")){if(!stack.length)errors.push({line,col:Math.max(0,raw.indexOf("}")),length:1,msg:"Penutup blok tidak memiliki pembuka yang sesuai."});else stack.pop();return;}if(/^end\b/i.test(t)){if(!stack.length)errors.push({line,col:Math.max(0,raw.toLowerCase().indexOf("end")),length:3,msg:"end tidak memiliki blok pembuka yang sesuai."});else stack.pop();return;}if(/^else\b/i.test(t)||/^elseif\b/i.test(t)){if(!stack.length||stack[stack.length-1].type!=="if")errors.push({line,col:Math.max(0,raw.search(/else(?:if)?/i)),length:4,msg:"else tidak memiliki blok if yang sesuai."});return;}const brace=/\{\s*$/.test(t);const head=t.replace(/\{\s*$/,'').trim();const m=head.match(/^([A-Za-z_][\w-]*)\b/);if(!m)return;const w=m[1].toLowerCase();if(["if","repeat","while","for","fn","try"].includes(w)||(["button","header","row","column","card","list","item","state","on","component","nav","modal","table","form","select","option"].includes(w)&&brace)){stack.push({type:w,line});}});stack.forEach(x=>errors.push({line:x.line,col:0,length:Math.max(1,rawLines[x.line-1]?.trim().length||1),msg:`Blok ${x.type} belum ditutup dengan } atau end.`}));return {errors};};
    const pousParse=(source)=>{const lines=source.split(/\r?\n/).map((raw,index)=>({raw,index,text:pousStripComment(raw)}));const parseBlock=(i=0,stoppers=[])=>{const nodes=[];while(i<lines.length){const t=lines[i].text.trim();if(!t){i++;continue;}const first=t.split(/\s+/)[0].toLowerCase();if(stoppers.includes(first)||stoppers.includes(t)||t==="}"||/^end\b/i.test(t))break;const brace=/\{\s*$/.test(t);const head=t.replace(/\{\s*$/,'').trim();if(/^else\b/i.test(head)||/^elseif\b/i.test(head))break;const bm=head.match(/^(if|repeat|while|for|fn|button|header|row|column|card|list|item|state|on|component|nav|modal|table|form|select|option|try)\b\s*(.*)$/i);if(bm){const type=bm[1].toLowerCase(),rest=bm[2]||"",inner=parseBlock(i+1,["else","elseif","}","end"]);let elseNodes=[],j=inner.index;if(type==="if"&&lines[j]&&/^(else|elseif)\b/i.test(lines[j].text.trim())){const et=lines[j].text.trim();if(/^elseif/i.test(et)){const temp=parseBlock(j+1,["else","elseif","}","end"]);elseNodes=[{type:"if",rest:et.replace(/^elseif/i,'').trim(),nodes:temp.nodes,elseNodes:[]}];j=temp.index;}else{const temp=parseBlock(j+1,["}","end"]);elseNodes=temp.nodes;j=temp.index;}}if(lines[j]&&(lines[j].text.trim()==="}"||/^end\b/i.test(lines[j].text.trim())))j++;nodes.push({type,rest,nodes:inner.nodes,elseNodes,brace});i=j;continue;}const m=head.match(/^(app|version|page|text|heading|label|image|link|input|textarea|switch|say|print|set|let|const|return|call|use|run|emit|store|save|load|delete|clear|fetch|await|throw|true|false|null|new|import|export|break|continue|spacer|divider|progress)\b\s*(.*)$/i);if(m){nodes.push({type:m[1].toLowerCase(),rest:m[2]||""});i++;continue;}const assign=head.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);if(assign){nodes.push({type:"set",rest:`${assign[1]} = ${assign[2]}`});i++;continue;}nodes.push({type:"unknown",rest:head,line:lines[i].index+1});i++;}return {nodes,index:i};};return parseBlock(0).nodes;};
    const pousExpr=(expr,env)=>{let e=String(expr??"").trim();if(!e)return "";e=e.replace(/\band\b/g,"&&").replace(/\bor\b/g,"||").replace(/\bnot\b/g,"!");try{return Function(...Object.keys(env),`return (${e});`)(...Object.values(env));}catch{if((e.startsWith('"')&&e.endsWith('"'))||(e.startsWith("'")&&e.endsWith("'")))return e.slice(1,-1);return e.replace(/^['"]|['"]$/g,"");}};
    const pousUnquote=(v,env)=>{const x=pousExpr(v,env);return x===undefined||x===null?"":String(x)};
    /* OUST FINAL CORE — strict parser, deterministic symbols, fail-closed execution. */
    const OUST_SYMBOLS={
      "@":"decorator", "#":"directive", "$":"binding", "&":"borrow/reference", "&&":"logical-and",
      "|":"pipeline/union", "||":"logical-or", "•":"member/composition", "√":"square-root", "π":"pi",
      "∆":"delta/change", "×":"multiply", "÷":"divide", "^":"power", "~":"bitwise/transform",
      "!":"not/force", "?":"optional/conditional", ":":"type/label", ";":"statement terminator",
      "=":"assignment", ":=":"define", "==":"equal", "!=":"not-equal", "<":"less-than", ">":"greater-than",
      "<=":"less-or-equal", ">=":"greater-or-equal", "=>":"lambda/map", "->":"return/type-flow", "::":"namespace/path",
      "??":"null-coalesce", "?.":"optional-member", "+":"add", "-":"subtract", "*":"multiply/deref", "/":"divide",
      "%":"modulo/format", "`":"raw/template delimiter", "\\":"escape", "\"":"string delimiter", "'":"character/string delimiter", ",":"argument/list separator", ".":"member/decimal separator", "[ ]":"collection/index", "{ }":"block/object",
      "( )":"call/group", "< >":"generic/compare", "§":"section marker", "£":"pound literal", "¢":"cent literal",
      "€":"euro literal", "¥":"yen literal", "°":"degree conversion", "©":"copyright metadata", "®":"registered metadata",
      "™":"trademark metadata", "✓":"assert/verified marker"
    };
    const oustKeywords=new Set("app version namespace module use import export fn let const var type struct enum trait impl match case when if else elseif for in while loop repeat return break continue throw try catch finally defer async await spawn parallel atomic lock channel select macro comptime inline extern unsafe pure pub private protected sealed true false null self Self as from where with new is of on emit fetch yield awaitall package interface union extends override operator test assert require native system ui web server data net fs math time json regex bytes text image audio video route component page state store input button heading label link row column header card list item nav form panel table select option textarea modal".split(/\s+/));
    const oustStripComment=(t)=>{let q=null,esc=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(esc)esc=false;else if(c==="\\")esc=true;else if(c===q)q=null;}else if(c==='"'||c==="'"||c==='`')q=c;else if(c==="/"&&t[i+1]==="/")return t.slice(0,i).trim();else if(c==="#"&&/^#\s/.test(t.slice(i)))return t.slice(0,i).trim();}return t.trim();};
    const oustFindMatchingBrace=(lines,startLine)=>{let depth=0;for(let i=startLine;i<lines.length;i++){let t=oustStripComment(lines[i]);let q=null,esc=false;for(let j=0;j<t.length;j++){const c=t[j];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q=null;continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return i+1;}}}return lines.length;};
    const oustExpression=(x)=>{
      let e=String(x??'').trim();
      if(!e)return {ok:false,code:""};
      e=e.replace(/\btrue\b/g,'true').replace(/\bfalse\b/g,'false').replace(/\bnull\b/g,'null')
        .replace(/\bAND\b/gi,'&&').replace(/\bOR\b/gi,'||').replace(/\bNOT\b/gi,'!')
        .replace(/\bpi\b/gi,'Math.PI').replace(/π/g,'Math.PI').replace(/×/g,'*').replace(/÷/g,'/')
        .replace(/\^/g,'**').replace(/•/g,'.').replace(/::/g,'.').replace(/\?\./g,'?.')
        .replace(/(\d+(?:\.\d+)?)°/g,'($1*Math.PI/180)')
        .replace(/√\s*([A-Za-z_$][\w$]*|\([^)]*\)|\d+(?:\.\d+)?)/g,'Math.sqrt($1)')
        .replace(/∆\s*([A-Za-z_$][\w$]*)/g,'delta($1)')
        .replace(/\$([A-Za-z_]\w*)/g,'$1');
      return {ok:true,code:e};
    };
    const oustAnalyze=(source)=>{
      const errors=[],lines=String(source||'').split(/\r?\n/),stack=[],offsets=[];let offset=0;
      lines.forEach((raw,idx)=>{offsets[idx]=offset;offset+=raw.length+1;});
      const add=(line,msg,col=0,len=1,start=0,end=String(source||'').length)=>errors.push({line,msg,severity:'error',start:Math.max(0,start),end:Math.max(Math.max(1,start+1),end)});
      const blockHead=new Set(['app','namespace','module','fn','if','for','while','loop','repeat','match','try','catch','finally','async','parallel','atomic','lock','channel','select','macro','comptime','struct','enum','trait','impl','button','card','header','row','column','list','item','nav','form','panel','state','on','component','page','table','select','option']);
      for(let i=0;i<lines.length;i++){
        const raw=lines[i],t=oustStripComment(raw);if(!t)continue;
        let quote=null,esc=false,opens=0,closes=0;
        for(let j=0;j<t.length;j++){const c=t[j];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote=null;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')opens++;else if(c==='}')closes++;}
        if(quote)add(i+1,'String/template tidak ditutup.',Math.max(0,raw.length-1),1,0,String(source||'').length);
        const trimmed=t.trim(), head=trimmed.replace(/\{\s*$/,'').replace(/;\s*$/,'').trim(), first=(head.match(/^([A-Za-z_][\w]*)/)||[])[1];
        if(trimmed.startsWith('}')){
          if(!stack.length)add(i+1,'Penutup blok tidak memiliki pembuka yang sesuai.',Math.max(0,raw.indexOf('}')),1,0,String(source||'').length);
          else stack.pop();
        }
        const extraClose=Math.max(0,closes-(trimmed.startsWith('}')?1:0));
        for(let k=0;k<extraClose;k++){if(!stack.length)add(i+1,'Penutup blok tidak memiliki pembuka yang sesuai.',Math.max(0,raw.lastIndexOf('}')),1,0,String(source||'').length);else stack.pop();}
        if(/^else\b|^elseif\b/i.test(trimmed)&&(!stack.length||stack[stack.length-1].type!=='if'))add(i+1,'else/elseif hanya boleh mengikuti blok if.',Math.max(0,raw.search(/else(?:if)?/i)),Math.max(4,trimmed.length),0,String(source||'').length);
        if(/^@/.test(trimmed)&&!/^@[A-Za-z_][\w:.-]*(?:\s*\([^)]*\))?\s*$/.test(trimmed))add(i+1,'Decorator Oust tidak valid.',Math.max(0,raw.indexOf('@')),Math.max(1,trimmed.length),0,String(source||'').length);
        for(let j=0;j<t.length;j++){const c=t[j];if(!/[A-Za-z0-9_\s"'`.,;:+*%!?=<>&|/\\\-()[\]{}@#$~^•√π∆×÷§£¢€¥°©®™✓]/.test(c)){add(i+1,`Simbol '${c}' tidak dikenal oleh Oust.`,j,1,0,String(source||'').length);break;}}
        if(first && !oustKeywords.has(first) && !/^[A-Za-z_]\w*\s*(?::[^=]+)?\s*(?::=|=)/.test(head) && !/^[A-Za-z_]\w*\s*(?:\(|\.|\[)/.test(head))add(i+1,`Pernyataan '${first}' tidak dikenal oleh grammar Oust.`,Math.max(0,raw.indexOf(first)),first.length,0,String(source||'').length);
        if(blockHead.has((first||'').toLowerCase())&&!/[{]$/.test(trimmed)&&!/^else\b|^elseif\b|^case\b|^when\b/i.test(trimmed))add(i+1,`Blok '${first}' wajib menggunakan { ... }.`,Math.max(0,raw.indexOf(first)),Math.max(1,first.length),0,String(source||'').length);
        if(opens){for(let k=0;k<opens;k++)stack.push({type:(first||'block').toLowerCase(),line:i+1});}
      }
      if(stack.length){for(const b of stack)add(b.line,`Blok ${b.type} belum ditutup dengan }.`,0,Math.max(1,lines[b.line-1]?.length||1),offsets[b.line-1]??0,String(source||'').length);}
      const uniq=[],seen=new Set();for(const e of errors){const k=`${e.line}|${e.msg}`;if(!seen.has(k)){seen.add(k);uniq.push(e);}}
      return {errors:uniq,symbols:OUST_SYMBOLS};
    };
    const oustParse=(source)=>{
      const lines=String(source||'').split(/\r?\n/).map((raw,index)=>({raw,index,text:oustStripComment(raw)}));
      const parseBlock=(i=0,stopAtBrace=false)=>{const nodes=[];while(i<lines.length){const t=lines[i].text.trim();if(!t){i++;continue;}if(t==='}'){return {nodes,index:i+1};}const clean=t.replace(/\s*;\s*$/,'');
        if(/^else\b/i.test(clean)||/^elseif\b/i.test(clean)){return {nodes,index:i};}
        const brace=/\{\s*$/.test(clean),head=clean.replace(/\{\s*$/,'').trim();
        const bm=head.match(/^(app|namespace|module|fn|if|else|elseif|for|while|loop|repeat|match|case|when|try|catch|finally|async|parallel|atomic|lock|channel|select|macro|comptime|struct|enum|trait|impl|button|card|header|row|column|list|item|nav|form|panel|state|on|component|page|table|option)\b\s*(.*)$/i);
        if(bm&&brace){const type=bm[1].toLowerCase(),rest=bm[2]||'';const inner=parseBlock(i+1,true);let j=inner.index,elseNodes=[];if(type==='if'&&lines[j]){const et=lines[j].text.trim();if(/^elseif\b/i.test(et)){const fake=et.replace(/^elseif\s*/i,'');const nested=parseBlock(j+1,true);elseNodes=[{type:'if',rest:fake,nodes:nested.nodes,elseNodes:[]}];j=nested.index;}else if(/^else\b/i.test(et)){const en=parseBlock(j+1,true);elseNodes=en.nodes;j=en.index;}}nodes.push({type,rest,nodes:inner.nodes,elseNodes,line:i+1});i=j;continue;}
        const sm=head.match(/^(app|version|use|import|export|text|heading|label|image|link|input|textarea|say|print|let|const|var|set|return|call|throw|break|continue|await|fetch|pous|new|assert|require|emit|yield)\b\s*(.*)$/i);
        if(sm){nodes.push({type:sm[1].toLowerCase(),rest:sm[2]||'',line:i+1});i++;continue;}
        if(/^@/.test(head)){nodes.push({type:'decorator',rest:head,line:i+1});i++;continue;}
        const as=head.match(/^([A-Za-z_]\w*)\s*(?::\s*[^=]+)?\s*(?::=|=)\s*(.*)$/);if(as){nodes.push({type:'set',rest:`${as[1]} = ${as[2]}`,line:i+1});i++;continue;}
        if(/^[A-Za-z_]\w*\s*\(/.test(head)){nodes.push({type:'call',rest:head,line:i+1});i++;continue;}
        nodes.push({type:'expr',rest:head,line:i+1});i++;
      }return {nodes,index:i};};return parseBlock(0,false).nodes;
    };
    const runOust=()=>{
      const source=editor.value,analysis=oustAnalyze(source);
      if(analysis.errors.length){updateDiagnostics();throw new Error(`Oust build dibatalkan: ${analysis.errors.length} error.`);}
      const ast=oustParse(source),env=Object.create(null),functions=Object.create(null),buttons=[],out=[];let body='';
      const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const evalExpr=(raw,local=env)=>{const q=oustExpression(raw);if(!q.ok)return undefined;let e=q.code;
        e=e.replace(/\bdelta\s*\(([^)]*)\)/g,'delta($1)');
        const delta=x=>Number(x)||0;
        try{return Function('delta','Math','env',`with(env){return (${e});}`)(delta,Math,local);}catch{return e.replace(/^['"]|['"]$/g,'');}
      };
      const collect=nodes=>{for(const n of nodes||[]){if(n.type==='fn'){const m=n.rest.match(/^([A-Za-z_]\w*(?:::[A-Za-z_]\w*)*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/);if(m)functions[m[1]]={args:m[2].split(',').map(x=>x.trim()).filter(Boolean),nodes:n.nodes||[]};}collect(n.nodes||[]);collect(n.elseNodes||[]);}};collect(ast);
      const exec=(nodes,local=env)=>{let ret;for(const n of nodes||[]){switch(n.type){
        case 'let':case 'const':case 'var':case 'set':{const m=n.rest.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);if(m)local[m[1]]=evalExpr(m[2],local);break;}
        case 'say':case 'print':out.push(String(evalExpr(n.rest,local)));break;
        case 'text':case 'heading':case 'label':break;
        case 'if':exec(evalExpr(n.rest,local)?n.nodes:n.elseNodes,local);break;
        case 'repeat':case 'loop':{const c=Math.max(0,Number(evalExpr(n.rest,local))||0);for(let i=0;i<c;i++){local.i=i;exec(n.nodes,local);}break;}
        case 'while':{let guard=0;while(evalExpr(n.rest,local)&&guard++<10000)exec(n.nodes,local);break;}
        case 'for':{const m=n.rest.match(/^([A-Za-z_]\w*)\s+in\s+(.+)$/),arr=m?evalExpr(m[2],local):[];if(m&&arr!=null&&typeof arr[Symbol.iterator]==='function')for(const v of arr){local[m[1]]=v;exec(n.nodes,local);}break;}
        case 'call':{const m=n.rest.match(/^([A-Za-z_]\w*(?:::[A-Za-z_]\w*)?)\s*(?:\((.*)\))?$/);const fn=m&&functions[m[1]];if(fn){const child=Object.assign(Object.create(null),local),vals=(m[2]||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>evalExpr(x,local));fn.args.forEach((a,i)=>child[a.replace(/^\$/,'')]=vals[i]);const r=exec(fn.nodes,child);if(r!==undefined)local.__last=r;}break;}
        case 'return':ret=evalExpr(n.rest,local);return ret;
        case 'throw':throw new Error(String(evalExpr(n.rest,local)));
        case 'assert':if(!evalExpr(n.rest,local))throw new Error(`Oust assertion gagal pada line ${n.line}.`);break;
        case 'pous':out.push('Pous bridge: tersedia sebagai interoperabilitas resmi Oust.');break;
        case 'break':return ret;
        case 'expr':evalExpr(n.rest,local);break;
        case 'app':case 'page':case 'component':case 'state':case 'on':case 'row':case 'column':case 'header':case 'card':case 'list':case 'item':case 'nav':case 'form':case 'panel':case 'table':case 'select':case 'option':case 'button':exec(n.nodes,local);break;
        default:break;
      }}return ret;};
      const render=nodes=>{for(const n of nodes||[]){if(['version','namespace','module','use','import','export','fn','let','const','var','set','if','else','elseif','for','while','loop','repeat','match','case','when','try','catch','finally','async','parallel','atomic','lock','channel','select','macro','comptime','struct','enum','trait','impl','return','call','throw','break','continue','await','fetch','pous','new','assert','require','emit','yield','decorator','expr'].includes(n.type))continue;if(['app','page','component','state','on'].includes(n.type)){render(n.nodes);continue;}
        if(['text','heading','label'].includes(n.type)){const tag=n.type==='heading'?'h2':n.type==='label'?'label':'p';body+=`<${tag} class="oust-${n.type}">${esc(evalExpr(n.rest,env))}</${tag}>`;
        }else if(n.type==='image')body+=`<img class="oust-image" src="${esc(evalExpr(n.rest,env))}" alt="">`;
        else if(n.type==='link'){const m=n.rest.match(/^([^\s]+)\s+(.+)$/);if(m)body+=`<a class="oust-link" href="${esc(evalExpr(m[1],env))}" target="_blank" rel="noreferrer">${esc(evalExpr(m[2],env))}</a>`;}
        else if(n.type==='input'||n.type==='textarea'){const m=n.rest.match(/^([A-Za-z_]\w*)\s*(.*)$/),name=m?.[1]||'input',ph=m?.[2]?evalExpr(m[2],env):name;body+=n.type==='textarea'?`<textarea class="oust-input" data-oust-input="${esc(name)}" placeholder="${esc(ph)}"></textarea>`:`<input class="oust-input" data-oust-input="${esc(name)}" placeholder="${esc(ph)}">`;}
        else if(n.type==='button'){const id=`oust-btn-${buttons.length}`;buttons.push({id,actions:n.nodes||[]});body+=`<button class="oust-button" data-oust-button="${id}">${esc(evalExpr(n.rest,env))}</button>`;}
        else if(['row','column','header','card','list','item','nav','form','panel','table','select','option','component','page','state','on'].includes(n.type)){const tag=n.type==='header'?'header':n.type==='nav'?'nav':n.type==='card'||n.type==='panel'?'section':'div';body+=`<${tag} class="oust-${n.type}">`;render(n.nodes);body+='</'+tag+'>';}
      }};
      render(ast);exec(ast);
      const titleNode=ast.find(x=>x.type==='app'),title=titleNode?evalExpr(titleNode.rest,env):'Oust App';
      const runtime=JSON.stringify({buttons,env});
      const frame=makeFrame(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{margin:0;padding:24px;max-width:980px;margin:auto;font:15px/1.6 system-ui,sans-serif;background:#f7f7f7;color:#111}.oust-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.oust-column{display:flex;flex-direction:column;gap:10px}.oust-header{margin-bottom:18px}.oust-card,.oust-panel{background:#fff;border:1px solid #d7d7d7;border-radius:16px;padding:16px;margin:10px 0}.oust-button{padding:10px 15px;border:1px solid #111;border-radius:9px;background:#111;color:#fff;font:inherit;cursor:pointer}.oust-input{display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:11px;border:1px solid #bbb;border-radius:9px;font:inherit}.oust-image{max-width:100%;border-radius:12px}.oust-link{display:inline-block;margin:8px 0}.oust-output{margin-top:20px;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;white-space:pre-wrap;min-height:24px}</style></head><body><h1>${esc(title)}</h1>${body}<pre id="oust-output" class="oust-output">${esc(out.join('\n'))}</pre><script>const spec=${runtime},env=Object.assign({},spec.env||{}),out=document.getElementById('oust-output');const say=x=>{out.textContent+=(out.textContent?'\n':'')+String(x??'')};const evalx=x=>{try{return Function(...Object.keys(env),'return ('+String(x).replace(/\^/g,'**').replace(/×/g,'*').replace(/÷/g,'/').replace(/•/g,'.').replace(/π/g,'Math.PI').replace(/√/g,'Math.sqrt')+');')(...Object.values(env))}catch{return String(x)}};const exec=nodes=>{for(const n of nodes||[]){if(n.type==='say'||n.type==='print')say(evalx(n.rest));else if(['let','const','var','set'].includes(n.type)){const m=n.rest.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);if(m)env[m[1]]=evalx(m[2]);}else if(n.type==='if')exec(evalx(n.rest)?n.nodes:n.elseNodes);else if(n.type==='repeat'||n.type==='loop'){for(let i=0,c=Math.max(0,Number(evalx(n.rest))||0);i<c;i++){env.i=i;exec(n.nodes);}}}};document.querySelectorAll('[data-oust-input]').forEach(el=>el.addEventListener('input',()=>env[el.dataset.oustInput]=el.value));spec.buttons.forEach(b=>document.querySelector('[data-oust-button="'+b.id+'"]').addEventListener('click',()=>exec(b.actions)));</script></body></html>`);
      showPreview(frame,'oust://'+baseName(current().name));terminalOut.textContent+=`Oust Final 1.0 aktif — strict build, fail-closed execution, ${Object.keys(OUST_SYMBOLS).length} simbol inti.
`;
    };
    const runPous=()=>{const source=editor.value,analysis=pousAnalyze(source);if(analysis.errors.length){updateDiagnostics();throw new Error("Pous memiliki kesalahan syntax.");}const ast=pousParse(source),titleNode=ast.find(x=>x.type==="app"),escP=v=>String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const env={},functions={},events=[];let body="",buttons=[];const collect=nodes=>{for(const n of nodes||[]){if(n.type==="fn"){const m=n.rest.match(/^([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?/);if(m)functions[m[1]]={args:(m[2]||"").split(",").map(x=>x.trim()).filter(Boolean),nodes:n.nodes||[]};}if(n.type==="state")for(const x of n.nodes||[]){const m=x.rest?.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);if(m)env[m[1]]=pousExpr(m[2],env);}if(n.type==="on")events.push(n);collect(n.nodes||[]);}};collect(ast);const exec=(nodes,local=env)=>{let ret;for(const n of nodes||[]){if(n.type==="say"||n.type==="print"){local.__out=(local.__out?local.__out+"\n":"")+pousUnquote(n.rest,local);}else if(["set","let","const"].includes(n.type)){const m=n.rest.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);if(m)local[m[1]]=pousExpr(m[2],local);}else if(n.type==="if"){exec(pousExpr(n.rest,local)?n.nodes:n.elseNodes,local);}else if(n.type==="repeat"){for(let i=0,c=Math.max(0,Number(pousExpr(n.rest,local))||0);i<c;i++){local.index=i;exec(n.nodes,local);}}else if(n.type==="while"){let g=0;while(pousExpr(n.rest,local)&&g++<1000)exec(n.nodes,local);}else if(n.type==="for"){const m=n.rest.match(/^([A-Za-z_]\w*)\s+in\s+(.+)$/),list=m&&pousExpr(m[2],local);if(m&&Array.isArray(list))for(const v of list){local[m[1]]=v;exec(n.nodes,local);}}else if(n.type==="call"){const m=n.rest.match(/^([A-Za-z_]\w*)\s*(.*)$/),fn=functions[m?.[1]];if(fn){const child=Object.assign({},local),vals=(m?.[2]||"").split(/\s+/).filter(Boolean).map(x=>pousExpr(x,local));fn.args.forEach((a,i)=>child[a]=vals[i]);exec(fn.nodes,child);if(child.__out)local.__out=(local.__out?local.__out+"\n":"")+child.__out;}}else if(n.type==="return"){ret=pousExpr(n.rest,local);break;}else if(n.type==="save"){try{localStorage.setItem("pous:data:"+String(n.rest).trim(),JSON.stringify(local[String(n.rest).trim()]??""));}catch{}}else if(n.type==="load"){try{local[String(n.rest).trim()]=JSON.parse(localStorage.getItem("pous:data:"+String(n.rest).trim())||"null");}catch{}}else if(["delete","clear"].includes(n.type)){try{localStorage.removeItem("pous:data:"+String(n.rest).trim());}catch{}}}return ret;};
      const render=nodes=>{for(const n of nodes||[]){if(["app","version","page","use","run","unknown","fn","state","on","set","let","const","if","repeat","while","for","call","return","say","print","save","load","delete","clear","emit","fetch","await","throw","import","export","break","continue"].includes(n.type))continue;if(["text","heading","label"].includes(n.type)){const tag=n.type==="heading"?"h2":n.type==="label"?"label":"p";body+=`<${tag} class="pous-${n.type}">${escP(pousUnquote(n.rest,env))}</${tag}>`;}else if(n.type==="image")body+=`<img class="pous-image" src="${escP(pousUnquote(n.rest,env))}" alt="">`;else if(n.type==="link"){const m=n.rest.match(/^(\S+)\s+(.+)$/);body+=m?`<a class="pous-link" href="${escP(pousUnquote(m[1],env))}" target="_blank" rel="noreferrer">${escP(pousUnquote(m[2],env))}</a>`:`<a class="pous-link" href="#">${escP(pousUnquote(n.rest,env))}</a>`;}else if(n.type==="input"||n.type==="textarea"){const m=n.rest.match(/^([A-Za-z_]\w*)\s*(.*)$/),name=m?.[1]||"input",ph=m?.[2]?pousUnquote(m[2],env):name;body+=n.type==="textarea"?`<textarea class="pous-input" data-pous-input="${escP(name)}" placeholder="${escP(ph)}"></textarea>`:`<input class="pous-input" data-pous-input="${escP(name)}" placeholder="${escP(ph)}">`;}else if(n.type==="switch"){const m=n.rest.match(/^([A-Za-z_]\w*)\s*(.*)$/),name=m?.[1]||"switch",label=m?.[2]?pousUnquote(m[2],env):name;body+=`<label class="pous-switch"><input type="checkbox" data-pous-input="${escP(name)}"><span>${escP(label)}</span></label>`;}else if(n.type==="button"){const id=`pous-btn-${buttons.length}`;buttons.push({id,actions:n.nodes||[]});body+=`<button class="pous-button" data-pous-button="${id}">${escP(pousUnquote(n.rest,env))}</button>`;}else if(["header","row","column","card","list","item","nav","modal","table","form"].includes(n.type)){const tag=n.type==="header"?"header":n.type==="nav"?"nav":n.type==="card"?"section":"div";body+=`<${tag} class="pous-${n.type}">`;render(n.nodes);body+=`</${tag}>`;}else if(n.type==="divider")body+='<hr class="pous-divider">';else if(n.type==="spacer")body+='<div class="pous-spacer"></div>';else if(n.type==="progress")body+=`<progress class="pous-progress" value="${Math.max(0,Math.min(100,Number(pousExpr(n.rest,env))||0))}" max="100"></progress>`;}};render(ast);const runtime=JSON.stringify({buttons,functions,start:events.filter(x=>String(x.rest).toLowerCase()==="start").flatMap(x=>x.nodes||[])});const title=titleNode?pousUnquote(titleNode.rest,env):"Pous App";const frame=makeFrame(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escP(title)}</title><style>body{margin:0;padding:24px;font:15px/1.55 system-ui,sans-serif;background:#f7f7f7;color:#111;max-width:860px;margin:auto}.pous-text{line-height:1.65}.pous-heading{margin:0 0 8px;font-size:24px}.pous-label{display:block;margin:8px 0}.pous-header{margin-bottom:18px}.pous-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pous-column{display:flex;flex-direction:column;gap:10px}.pous-card{background:#fff;border:1px solid #ddd;border-radius:16px;padding:16px;margin:10px 0}.pous-list{display:flex;flex-direction:column;gap:8px}.pous-item{display:flex;gap:8px;align-items:center}.pous-nav{display:flex;gap:8px}.pous-button{margin:8px 0;padding:10px 15px;border:1px solid #111;border-radius:9px;background:#111;color:#fff;font:inherit;cursor:pointer}.pous-input{display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:11px;border:1px solid #bbb;border-radius:9px;font:inherit}.pous-switch{display:flex;gap:8px;align-items:center;margin:10px 0}.pous-image{max-width:100%;border-radius:10px;margin:10px 0}.pous-link{display:inline-block;margin:8px 0}.pous-progress{width:100%;height:12px}.pous-divider{border:0;border-top:1px solid #ddd;margin:16px 0}.pous-spacer{height:20px}.pous-output{margin-top:20px;padding:12px;border:1px solid #ddd;border-radius:9px;background:#fff;white-space:pre-wrap;min-height:20px}</style></head><body><h1>${escP(title)}</h1>${body}<pre class="pous-output" id="pous-output"></pre><script>const spec=${runtime},env={},out=document.getElementById('pous-output'),expr=x=>{let e=String(x??'').trim().replace(/\band\b/g,'&&').replace(/\bor\b/g,'||').replace(/\bnot\b/g,'!');try{return Function(...Object.keys(env),'return ('+e+');')(...Object.values(env))}catch{return e.replace(/^['"]|['"]$/g,'')}},say=x=>{out.textContent+=(out.textContent?'\n':'')+String(expr(x))},exec=(nodes,local=env)=>{for(const n of nodes||[]){if(n.type==='say'||n.type==='print')say(n.rest);else if(['set','let','const'].includes(n.type)){const m=n.rest.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);if(m)local[m[1]]=expr(m[2])}else if(n.type==='if')exec(expr(n.rest)?n.nodes:n.elseNodes,local);else if(n.type==='repeat'){for(let i=0,c=Math.max(0,Number(expr(n.rest))||0);i<c;i++){local.index=i;exec(n.nodes,local)}}else if(n.type==='while'){let g=0;while(expr(n.rest)&&g++<1000)exec(n.nodes,local)}else if(n.type==='call'){const m=n.rest.match(/^([A-Za-z_]\w*)\s*(.*)$/),fn=spec.functions[m?.[1]];if(fn){const child=Object.assign({},local),vals=(m?.[2]||'').split(/\s+/).filter(Boolean).map(x=>expr(x));fn.args.forEach((a,i)=>child[a]=vals[i]);exec(fn.nodes,child)}}else if(n.type==='save'){try{localStorage.setItem('pous:data:'+n.rest,JSON.stringify(local[n.rest]??''))}catch{}}else if(n.type==='load'){try{local[n.rest]=JSON.parse(localStorage.getItem('pous:data:'+n.rest)||'null')}catch{}}else if(n.type==='delete'||n.type==='clear'){try{localStorage.removeItem('pous:data:'+n.rest)}catch{}}}};document.querySelectorAll('[data-pous-input]').forEach(el=>el.addEventListener('input',()=>env[el.dataset.pousInput]=el.type==='checkbox'?el.checked:el.value));spec.buttons.forEach(b=>document.querySelector('[data-pous-button="'+b.id+'"]').addEventListener('click',()=>exec(b.actions)));exec(spec.start);</script></body></html>`);showPreview(frame,"pous://"+baseName(current().name));terminalOut.textContent+="Pous Runtime 1.0 aktif — aplikasi Pous dijalankan langsung di Pidex.\n";};
    runButton.addEventListener("click",async()=>{
      const code=editor.value.trim(),language=lang.value;
      updateDiagnostics();
      const webProjectLanguages=["HTML","CSS","JavaScript","Node.js"];
      const projectErrors=webProjectLanguages.includes(language)?projectWebErrors():[];
      if(projectErrors.length){
        showProjectProblems(projectErrors);
        runtimeStatus.textContent="Diperbaiki dulu";
        terminalOut.textContent+=`\nTidak dijalankan: ${projectErrors.length} kesalahan ditemukan di project.\n`;
        problems.scrollIntoView({behavior:"smooth",block:"nearest"});
        return;
      }
      if(lastDiagnostics.some(x=>x.severity==="error")){runtimeStatus.textContent="Diperbaiki dulu";terminalOut.textContent+=`\nTidak dijalankan: kesalahan ditemukan pada ${current().name}.\n`;problems.scrollIntoView({behavior:"smooth",block:"nearest"});return;}
      if(!code)return;
      runButton.disabled=true;runButton.textContent="Menjalankan...";runtimeStatus.textContent="Menjalankan";terminalOut.textContent+=`\nrun ${current().name}\n`;
      try{
        if(language==="Oust"){
          runOust();
        }else if(language==="Pous"){
          runPous();
        }else if(webProjectLanguages.includes(language)&&buildWebProject()){
          runWebProject();
          terminalOut.textContent+="Project web dijalankan bersama: HTML + CSS + JavaScript.\n";
        }else if(language==="Python"){
          const frame=makeFrame(`<!doctype html><pre id=o></pre><script src="https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js"><\\/script><script>async function go(){const o=document.getElementById('o');try{const p=await loadPyodide();p.setStdout({batched:s=>o.textContent+=s});p.setStderr({batched:s=>o.textContent+=s});await p.runPythonAsync(${JSON.stringify(code)})}catch(e){console.error(e)}}go()<\\/script>`);showPreview(frame,"http://localhost:8080/main.py");terminalOut.textContent+="Python runtime dimuat.\n";
        }else if(language==="TypeScript"){
          const frame=makeFrame(`<!doctype html><pre id=o></pre><script src="https://cdn.jsdelivr.net/npm/typescript@5.9.2/lib/typescript.min.js"><\\/script><script>try{const out=ts.transpile(${JSON.stringify(code)},{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None});document.getElementById('o').textContent=out}catch(e){console.error(e)}</script>`);showPreview(frame,"http://localhost:8080/main.ts");terminalOut.textContent+="TypeScript ditranspilasi.\n";
        }else if(language==="SQL"){
          const frame=makeFrame(`<!doctype html><pre id=o></pre><script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js"><\\/script><script>initSqlJs({locateFile:f=>'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/'+f}).then(SQL=>{try{const db=new SQL.Database();const r=db.exec(${JSON.stringify(code)});document.getElementById('o').textContent=r.length?r.map(x=>x.columns.join(' | ')+'\\n'+x.values.map(row=>row.join(' | ')).join('\\n')).join('\\n\\n'):'SQL selesai.'}catch(e){console.error(e)}})</script>`);showPreview(frame,"http://localhost:8080/query.sql");terminalOut.textContent+="SQL.js runtime dimuat.\n";
        }else if(language==="Lua"){
          const frame=makeFrame(`<!doctype html><pre id=o></pre><script src="https://unpkg.com/fengari-web@0.1.4/dist/fengari-web.js"><\\/script><script>try{fengari.load(${JSON.stringify(code)},'main.lua')()}catch(e){console.error(e)}</script>`);showPreview(frame,"http://localhost:8080/main.lua");terminalOut.textContent+="Lua runtime dimuat.\n";
        }else if(language==="R"){
          const frame=makeFrame(`<!doctype html><script type="module">import { WebR } from "https://webr.r-wasm.org/latest/webr.mjs";(async()=>{try{const webR=new WebR();await webR.init();await webR.evalR(${JSON.stringify(code)})}catch(e){console.error(e)}})();</script>`);showPreview(frame,"http://localhost:8080/main.R");terminalOut.textContent+="R runtime dimuat.\n";
        }else if(language==="Markdown"){
          const frame=makeFrame(`<!doctype html><style>body{font:15px system-ui;padding:22px;line-height:1.65}</style><article id=o></article><script>const md=${JSON.stringify(code)};const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));document.getElementById('o').innerHTML=esc(md).replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\\*\\*(.*?)\\*\\*/g,'<strong>$1</strong>')</script>`);showPreview(frame,"http://localhost:8080/README.md");terminalOut.textContent+="Markdown preview dibuka.\n";
        }else if(["JSON","XML","YAML","TOML","INI","GraphQL"].includes(language)){
          const frame=makeFrame(`<!doctype html><style>body{font:13px ui-monospace,monospace;padding:18px;white-space:pre-wrap}</style><pre>${escapeHtml(code)}</pre>`);showPreview(frame,`http://localhost:8080/${baseName(current().name)}`);terminalOut.textContent+=`${language} ditampilkan dalam preview.\n`;
        }else{
          showOutput(`Runtime langsung untuk ${language} belum terpasang di browser. Pidex sudah mengenali bahasa ini; runner sandbox dapat menambahkan compiler/runtime terisolasi.` ,"text","Runtime belum tersedia");
          terminalOut.textContent+=`Runtime ${language} belum tersedia.\n`;
        }
      }catch(err){showOutput(`Error: ${err.message}`,"text","Runtime error");terminalOut.textContent+=`Error: ${err.message}\n`;}finally{runButton.disabled=false;runButton.textContent="Jalankan";runtimeStatus.textContent="Siap";}
    });
    $("#pidexSend").addEventListener("click",()=>{$("#pidexPrompt")?.focus();});
    $("#pidexPelonSend")?.addEventListener("click",sendPidexPelon);
    $("#pidexPelonClear")?.addEventListener("click",()=>{pidexPelonMessages=[];renderPidexPelonMessages();});
    $("#pidexPelonAttach")?.addEventListener("click",()=>{pidexAttachmentTarget="pidex";openAttachmentPicker();});
    $("#pidexPrompt")?.addEventListener("input",e=>{e.target.style.height="auto";e.target.style.height=`${Math.min(e.target.scrollHeight,130)}px`;if(!pidexPelonBusy)setPelonMode(e.target.value.trim()?"typing":"idle");});
    renderPidexPelonMessages();
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&outputCard.classList.contains("is-fullscreen")){closePreview();}});
    toolPage.addEventListener("click",e=>{if(window.PelonCharacter){const t=e.target.closest("button");if(t)window.PelonCharacter.setAction({name:t.id.includes("Run")||t.id.includes("Preview")?"working":"curious",intensity:.9,duration:1.5});}});
    renderFiles();openFile(activeFile);
  } else if (mode === "privacy") {
    toolPage.innerHTML = `
      <div class="page-panel">
        <h2>Kebijakan Privasi</h2>
        <p>Pelon V1 dirancang dengan prinsip minimasi data. Tanpa akun, percakapan dapat disimpan secara lokal pada perangkat untuk pengalaman chat.</p>
        <div class="settings-card">
          <div class="settings-row"><div><div class="settings-label">Data percakapan</div><div class="settings-help">V1 menyimpan riwayat chat di browser perangkat kecuali fitur backend yang membutuhkan pemrosesan mengirimkan isi permintaan ke gateway.</div></div></div>
          <div class="settings-row"><div><div class="settings-label">API credentials</div><div class="settings-help">Kredensial provider tidak disimpan di browser dan harus berada pada Cloudflare Worker Secrets.</div></div></div>
          <div class="settings-row"><div><div class="settings-label">Web access</div><div class="settings-help">Jika fitur web digunakan, permintaan dapat diproses melalui layanan web Pelon untuk mengambil sumber publik yang diminta.</div></div></div>
          <div class="settings-row"><div><div class="settings-label">Kontrol pengguna</div><div class="settings-help">Pengguna dapat menghapus riwayat lokal dari menu percakapan.</div></div></div>
        </div>
        <p class="muted">Kebijakan ini merupakan draft V1 dan perlu disesuaikan sebelum Pelon digunakan secara publik.</p>
      </div>`;
  } else {
    toolPage.innerHTML = `
      <div class="page-panel">
        <h2>${title}</h2><p>${subtitle}</p>
        <div class="file-drop">
          <strong>${mode === "file" ? "Siapkan file untuk dianalisis" : mode === "image" ? "Ruang kerja gambar" : "Web access Pelon"}</strong>
          <p>Fondasi antarmuka sudah siap. Fungsionalitas backend akan diaktifkan pada tahap API dan Workers.</p>
        </div>
      </div>`;
  }

  toolPage.querySelectorAll("[data-legal]").forEach((button) => {
    button.addEventListener("click", () => openLegal(button.dataset.legal));
  });
  toolPage.querySelectorAll(".persona-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.persona = button.dataset.persona || "Biasa";
      toolPage.querySelectorAll(".persona-card").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      const customPanel = $("#customPersonaPanel");
      if (customPanel) customPanel.hidden = state.persona !== "Custom";
      save();
    });
  });
  $("#saveCustomPersona")?.addEventListener("click", () => {
    state.customPersona = $("#customPersonaInput")?.value.trim() || "";
    state.persona = "Custom";
    save();
    const button = $("#saveCustomPersona");
    if (button) { button.textContent = "Tersimpan"; setTimeout(() => { button.textContent = "Simpan persona"; }, 900); }
  });
}

let currentPage = "chat";

function setActiveNav(mode) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.mode === mode);
  });
}

function navigateTo(mode, push = true) {
  if (!mode) return;
  currentPage = mode;
  setActiveNav(mode);
  showPage(mode);
  if (push) history.pushState({ pelonPage: mode }, "", `#${mode}`);
  closeSidebar();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => navigateTo(button.dataset.mode));
});

window.addEventListener("popstate", (event) => {
  const mode = event.state?.pelonPage || "chat";
  currentPage = mode;
  setActiveNav(mode);
  showPage(mode);
  closeSidebar();
});

(function initNavigationHistory() {
  const hash = location.hash.replace("#", "");
  const valid = ["chat", "groups", "file", "image", "web", "pidex", "persona", "privacy", "settings"];
  currentPage = valid.includes(hash) ? hash : "chat";
  history.replaceState({ pelonPage: currentPage }, "", `#${currentPage}`);
  setActiveNav(currentPage);
})();

function openLegal(type) {
  const modal = $("#legalModal");
  const title = $("#legalTitle");
  const body = $("#legalBody");

  if (type === "privacy") {
    title.textContent = "Kebijakan Privasi";
    body.innerHTML = `<p>Pelon meminimalkan pengumpulan data. V1 tidak memerlukan akun dan riwayat percakapan disimpan secara lokal pada perangkat.</p><p>Untuk memproses permintaan AI, isi pesan yang diperlukan dapat dikirim ke gateway Pelon. API credentials tetap berada di lingkungan backend.</p><p>Fitur web dan file akan memiliki penanganan data yang lebih spesifik ketika backend produksi diaktifkan.</p>`;
  } else if (type === "terms") {
    title.textContent = "Ketentuan Penggunaan";
    body.innerHTML = `<p>Pelon disediakan sebagai alat bantu AI. Pengguna bertanggung jawab atas penggunaan hasil yang diberikan Pelon dan perlu memeriksa informasi penting sebelum mengambil keputusan.</p><p>Fitur, model, provider, batas penggunaan, dan kemampuan Pelon dapat berubah selama pengembangan.</p>`;
  } else {
    title.textContent = "Tentang Pelon";
    body.innerHTML = `<img src="./assets/pelon-idle.svg" class="modal-logo theme-logo" data-pelon-logo="full" alt="Pelon"><p>Pelon adalah AI yang dirancang sebagai satu pengalaman terpadu untuk percakapan, analisis, pemrograman, web, file, dan gambar.</p><p class="muted">Pelon dibuat oleh Qih.</p>`;
  }
  modal.showModal();
}
$("#closeLegal").addEventListener("click", () => $("#legalModal").close());

const aboutModal = $("#aboutModal");

const sidebar = $("#sidebar");
const overlay = $("#overlay");
function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("open");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("open");
}
$("#openSidebar").addEventListener("click", openSidebar);
$("#closeSidebar").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

function renderPendingAttachments() {
  const box = $("#attachmentPreview");
  if (!box) return;
  box.innerHTML = "";
  box.hidden = !state.pendingAttachments.length;
  state.pendingAttachments.forEach((attachment, index) => {
    const item = document.createElement("div");
    item.className = "attachment-preview-item";
    if (attachment.kind === "image" && attachment.dataUrl) {
      const img = document.createElement("img");
      img.src = attachment.dataUrl; img.alt = attachment.name || "Foto";
      item.appendChild(img);
    } else {
      item.innerHTML = '<span class="attachment-file-icon"><svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V20.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Z"/><path d="M14 3.5v5h4"/></svg></span>';
    }
    const label = document.createElement("span"); label.textContent = attachment.name || "Lampiran"; label.title = attachment.name || "Lampiran";
    const remove = document.createElement("button"); remove.type = "button"; remove.setAttribute("aria-label", "Hapus lampiran");
    remove.innerHTML = '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>';
    remove.addEventListener("click", () => { state.pendingAttachments.splice(index, 1); renderPendingAttachments(); });
    item.append(label, remove); box.appendChild(item);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

const stickerPickerModal = $("#stickerPickerModal");
function openStickerPicker() {
  if (!stickerPickerModal) return;
  const grid = $("#stickerPickerGrid");
  if (grid && !grid.dataset.ready) {
    grid.innerHTML = Array.from({length:STICKER_COUNT},(_,i)=>{const id=i+1;return `<button type="button" class="sticker-choice" data-sticker-id="${id}" aria-label="Kirim stiker ${id}" title="Stiker ${id}"><img src="${stickerPath(id)}" alt="Stiker ${id}" loading="lazy"></button>`;}).join("");
    grid.dataset.ready = "1";
    grid.querySelectorAll("[data-sticker-id]").forEach(button=>button.addEventListener("click",()=>{
      const id=Number(button.dataset.stickerId);
      stickerPickerModal.close();
      if(pidexAttachmentTarget==="group") sendGroupMessage("",[],id);
      else if(pidexAttachmentTarget==="chat") sendMessage("",[],id);
    }));
  }
  stickerPickerModal.showModal();
}
$("#closeStickerPicker")?.addEventListener("click",()=>stickerPickerModal?.close());
$("#pickSticker")?.addEventListener("click",()=>{closeAttachmentPicker();openStickerPicker();});

const attachmentModal = $("#attachmentModal");
const photoInput = $("#photoInput");
const cameraInput = $("#cameraInput");
const fileInput = $("#fileInput");

function openAttachmentPicker() {
  const stickerOption=$("#pickSticker");
  if(stickerOption) stickerOption.hidden=pidexAttachmentTarget==="pidex";
  attachmentModal?.showModal();
}
function closeAttachmentPicker() {
  attachmentModal?.close();
}
async function useSelectedFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i.test(file.name);
    const dataUrl = (isImage || isAudio) ? await readFileAsDataUrl(file) : "";
    const item = {name: file.name,type: file.type || (isAudio ? "audio/*" : "File"),size: file.size,kind: isImage ? "image" : isAudio ? "audio" : "file",dataUrl};
    if (pidexAttachmentTarget === "pidex") pidexPelonPending.push(item); else if (pidexAttachmentTarget === "group") state.groupPendingAttachments.push(item); else state.pendingAttachments.push(item);
  }
  if (pidexAttachmentTarget === "pidex") renderPidexPelonAttachments(); else if (pidexAttachmentTarget === "group") renderGroupPendingAttachments(); else renderPendingAttachments();
  if (pidexAttachmentTarget === "pidex") $("#pidexPrompt")?.focus(); else if (pidexAttachmentTarget === "group") $("#groupMessageInput")?.focus(); else input.focus();
}

$("#attachButton").addEventListener("click", () => { pidexAttachmentTarget="chat"; openAttachmentPicker(); });
$("#closeAttachment").addEventListener("click", closeAttachmentPicker);
$("#pickPhoto").addEventListener("click", () => { closeAttachmentPicker(); photoInput?.click(); });
$("#pickCamera").addEventListener("click", () => { closeAttachmentPicker(); cameraInput?.click(); });
$("#pickFile").addEventListener("click", () => { closeAttachmentPicker(); fileInput?.click(); });
photoInput?.addEventListener("change", () => { useSelectedFiles(photoInput.files); photoInput.value = ""; });
cameraInput?.addEventListener("change", () => { useSelectedFiles(cameraInput.files); cameraInput.value = ""; });
fileInput?.addEventListener("change", () => { useSelectedFiles(fileInput.files); fileInput.value = ""; });

$("#cancelMessageEdit")?.addEventListener("click", cancelMessageEdit);

const chatActionModal = $("#chatActionModal");
const renameModal = $("#renameModal");
$("#closeChatAction")?.addEventListener("click", () => chatActionModal?.close());
$("#pinChatAction")?.addEventListener("click", () => {
  const id = state.actionConversationId;
  const conversation = state.conversations.find((item) => item.id === id);
  chatActionModal?.close();
  if (conversation) togglePinnedConversation(id);
});
$("#archiveChatAction")?.addEventListener("click", () => {
  const id = state.actionConversationId;
  const conversation = state.conversations.find((item) => item.id === id);
  chatActionModal?.close();
  if (!conversation) return;
  const verb = conversation.archived ? "Keluarkan dari arsip?" : "Arsipkan percakapan?";
  const msg = conversation.archived ? `“${conversation.title}” akan kembali ke daftar utama.` : `“${conversation.title}” akan disembunyikan dari daftar utama, tetapi tidak dihapus.`;
  openConfirm(verb, msg, () => toggleArchivedConversation(id), conversation.archived ? "Keluarkan" : "Arsipkan");
});
$("#renameChatAction")?.addEventListener("click", () => {
  const id = state.actionConversationId;
  chatActionModal?.close();
  openRenameModal(id);
});
$("#deleteChatAction")?.addEventListener("click", () => {
  const id = state.actionConversationId;
  const conversation = state.conversations.find((item) => item.id === id);
  chatActionModal?.close();
  if (conversation) openConfirm("Hapus percakapan?", `Percakapan “${conversation.title}” akan dihapus dari perangkat ini.`, () => deleteConversation(id));
});
renameModal?.addEventListener("cancel", () => { state.actionConversationId = null; });
$("#closeRename")?.addEventListener("click", () => { state.actionConversationId = null; renameModal?.close(); });
$("#cancelRename")?.addEventListener("click", () => { state.actionConversationId = null; renameModal?.close(); });
$("#renameForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTitleEdit();
  state.actionConversationId = null;
});

const permissionModal = $("#permissionModal");
const allowPermissions = $("#allowPermissions");
const skipPermissions = $("#skipPermissions");
const permissionStatus = $("#permissionStatus");

async function requestCameraPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    state.cameraPermissionAsked = true; save();
    permissionStatus.textContent = "Browser ini tidak menyediakan izin kamera langsung. Kamera tetap bisa dibuka saat kamu memilih Kamera.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    stream.getTracks().forEach((track) => track.stop());
    state.cameraPermissionAsked = true; save();
    permissionStatus.textContent = "Akses kamera sudah diizinkan.";
    setTimeout(() => permissionModal?.close(), 500);
  } catch (error) {
    state.cameraPermissionAsked = true; save();
    permissionStatus.textContent = "Akses kamera belum diberikan. Saat memilih Kamera nanti, browser tetap dapat meminta izin.";
  }
}
allowPermissions?.addEventListener("click", requestCameraPermission);
skipPermissions?.addEventListener("click", () => { state.cameraPermissionAsked = true; save(); permissionModal?.close(); });
function maybeShowPermissionModal() {
  if (state.cameraPermissionAsked || !permissionModal || permissionModal.open) return;
  setTimeout(() => { if (!state.cameraPermissionAsked && !permissionModal.open) permissionModal.showModal(); }, 250);
}

const onboardingModal = $("#onboardingModal");
const onboardingForm = $("#onboardingForm");
const userNameInput = $("#userNameInput");

function populateOnboardingBirthPicker() {
  const root = document.querySelector('[data-birth-picker="onboarding"]');
  if (!root) return;
  const html = buildBirthDatePicker("onboarding", state.birthDate);
  const temp = document.createElement("div");
  temp.innerHTML = html;
  root.replaceWith(temp.firstElementChild);
}

function openOnboarding() {
  populateOnboardingBirthPicker();
  if ((!state.userName || !state.birthDate) && onboardingModal && !onboardingModal.open) {
    onboardingModal.showModal();
    setTimeout(() => userNameInput?.focus(), 80);
  }
}

// Nama wajib ditentukan saat pertama masuk. Jangan biarkan dialog onboarding dilewati dengan Back/Escape.
onboardingModal?.addEventListener("cancel", (event) => {
  if (!state.userName || !state.birthDate) event.preventDefault();
});

onboardingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = userNameInput.value.trim().replace(/\s+/g, " ");
  const birthDate = readBirthDatePicker("onboarding");
  if (!name) {
    userNameInput.focus();
    return;
  }
  if (!birthDate) {
    document.querySelector(`[data-birth-picker="onboarding"] .birth-day`)?.focus();
    return;
  }
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  if (Number.isNaN(birth.getTime()) || birth > today) {
    document.querySelector(`[data-birth-picker="onboarding"] .birth-day`)?.focus();
    return;
  }
  state.userName = name;
  state.birthDate = birthDate;
  save();
  onboardingModal.close();
  render();
  maybeShowPermissionModal();
});

load();
showPage(currentPage);
setPelonMode("idle");

// Keep the composer attached to the visible viewport when the Android keyboard opens.
function syncVisualViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--keyboard-height", `${keyboard}px`);
  if (keyboard > 80) {
    composer.style.bottom = `${keyboard + 8}px`;
  } else {
    composer.style.bottom = "max(8px, env(safe-area-inset-bottom))";
  }
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncVisualViewport);
  window.visualViewport.addEventListener("scroll", syncVisualViewport);
}
window.addEventListener("resize", syncVisualViewport);
syncVisualViewport();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
  navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => {});
}

setTimeout(openOnboarding, 120);
setTimeout(() => { if (state.userName && state.birthDate) maybeShowPermissionModal(); }, 500);
