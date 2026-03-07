var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WordOrbPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiKey: "",
  defaultTone: "neutral",
  preferredLanguages: "es,fr,de,ja",
  dailyNoteWordOfDay: false,
  dailyNoteFolder: ""
};
var API_BASE = "https://api.wordorb.ai";
var CACHE_TTL = 60 * 60 * 1e3;
var cache = /* @__PURE__ */ new Map();
async function apiRequest(path, apiKey, params = {}) {
  if (!apiKey) {
    throw new Error("WordOrb API key not configured. Set it in plugin settings.");
  }
  const queryString = Object.entries(params).filter(([, v]) => v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const url = queryString ? `${API_BASE}${path}?${queryString}` : `${API_BASE}${path}`;
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  const response = await (0, import_obsidian.requestUrl)({
    url,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
      "User-Agent": "WordOrb-Obsidian/1.0.0"
    }
  });
  if (response.status >= 400) {
    const body = response.json;
    throw new Error((body == null ? void 0 : body.error) || `API error ${response.status}`);
  }
  const data = response.json;
  cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
  return data;
}
async function lookupWord(apiKey, word) {
  return apiRequest(`/api/word/${encodeURIComponent(word.toLowerCase())}`, apiKey);
}
async function getLesson(apiKey, day, track = "learn", age = "adult") {
  return apiRequest("/api/lesson", apiKey, { day: String(day), track, age });
}
async function getQuizRandom(apiKey, count = 5, track = "learn") {
  return apiRequest("/api/quiz/random", apiKey, { count: String(count), track, type: "mc" });
}
var WordOrbPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings", DEFAULT_SETTINGS);
  }
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("book-open", "WordOrb: Look up word", () => {
      new WordLookupModal(this.app, this).open();
    });
    this.addCommand({
      id: "lookup-word",
      name: "Look up word",
      callback: () => {
        new WordLookupModal(this.app, this).open();
      }
    });
    this.addCommand({
      id: "lookup-selection",
      name: "Look up selected word",
      editorCallback: (editor) => {
        const selection = editor.getSelection().trim();
        if (!selection) {
          new import_obsidian.Notice("Select a word first.");
          return;
        }
        const word = selection.toLowerCase().replace(/[^a-z'-]/g, "");
        if (!word) {
          new import_obsidian.Notice("No valid word in selection.");
          return;
        }
        this.showWordModal(word);
      }
    });
    this.addCommand({
      id: "insert-word-card",
      name: "Insert word card",
      editorCallback: async (editor) => {
        const word = await this.promptForWord();
        if (!word) return;
        try {
          const data = await lookupWord(this.settings.apiKey, word);
          const markdown = this.formatWordCardMarkdown(data);
          editor.replaceSelection(markdown);
          new import_obsidian.Notice(`Inserted card for "${data.word}".`);
        } catch (err) {
          new import_obsidian.Notice(`WordOrb: ${err.message}`);
        }
      }
    });
    this.addCommand({
      id: "generate-vocabulary-note",
      name: "Generate vocabulary note",
      callback: async () => {
        const word = await this.promptForWord();
        if (!word) return;
        try {
          await this.generateVocabularyNote(word);
        } catch (err) {
          new import_obsidian.Notice(`WordOrb: ${err.message}`);
        }
      }
    });
    this.addCommand({
      id: "daily-word",
      name: "Show daily word",
      callback: async () => {
        try {
          const dayOfYear = this.getDayOfYear();
          const lesson = await getLesson(this.settings.apiKey, dayOfYear);
          new LessonModal(this.app, lesson).open();
        } catch (err) {
          new import_obsidian.Notice(`WordOrb: ${err.message}`);
        }
      }
    });
    this.addCommand({
      id: "take-quiz",
      name: "Take a vocabulary quiz",
      callback: async () => {
        try {
          const quiz = await getQuizRandom(this.settings.apiKey, 5);
          new QuizModal(this.app, quiz).open();
        } catch (err) {
          new import_obsidian.Notice(`WordOrb: ${err.message}`);
        }
      }
    });
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processWordOrbLinks(el);
    });
    if (this.settings.dailyNoteWordOfDay) {
      this.app.workspace.onLayoutReady(() => {
        this.appendDailyWord();
      });
    }
    this.addSettingTab(new WordOrbSettingTab(this.app, this));
  }
  onunload() {
    cache.clear();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // -- Helpers --
  getDayOfYear() {
    const now = /* @__PURE__ */ new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1e3 * 60 * 60 * 24;
    return Math.min(Math.floor(diff / oneDay), 365);
  }
  async promptForWord() {
    return new Promise((resolve) => {
      const modal = new WordInputModal(this.app, (word) => {
        resolve(word);
      });
      modal.open();
    });
  }
  showWordModal(word) {
    lookupWord(this.settings.apiKey, word).then((data) => {
      new WordDetailModal(this.app, data).open();
    }).catch((err) => {
      new import_obsidian.Notice(`WordOrb: ${err.message}`);
    });
  }
  formatWordCardMarkdown(data) {
    const lines = [];
    lines.push(`> [!info] ${data.word}`);
    if (data.ipa) lines.push(`> **IPA:** ${data.ipa}`);
    if (data.pos) lines.push(`> **Part of Speech:** ${data.pos}`);
    lines.push(`>`);
    if (data.def) lines.push(`> ${data.def}`);
    if (data.etym) {
      lines.push(`>`);
      lines.push(`> **Etymology:** ${data.etym}`);
    }
    if (data.langs && data.langs.length > 0) {
      const preferredLangs = this.settings.preferredLanguages.split(",").map((l) => l.trim().toLowerCase()).filter((l) => l.length > 0);
      const filtered = preferredLangs.length > 0 ? data.langs.filter((l) => preferredLangs.includes(l.lang.toLowerCase())) : data.langs.slice(0, 6);
      if (filtered.length > 0) {
        lines.push(`>`);
        lines.push(`> **Translations:**`);
        for (const entry of filtered) {
          lines.push(`> - **${entry.lang.toUpperCase()}:** ${entry.translation}`);
        }
      }
    }
    lines.push("");
    return lines.join("\n");
  }
  async generateVocabularyNote(word) {
    new import_obsidian.Notice(`Generating vocabulary note for "${word}"...`);
    const [wordData, lessonData, quizData] = await Promise.allSettled([
      lookupWord(this.settings.apiKey, word),
      getLesson(this.settings.apiKey, this.getDayOfYear()),
      getQuizRandom(this.settings.apiKey, 3)
    ]);
    const lines = [];
    lines.push(`---`);
    lines.push(`word: ${word}`);
    lines.push(`created: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`);
    lines.push(`source: wordorb`);
    lines.push(`tags: [vocabulary]`);
    lines.push(`---`);
    lines.push("");
    lines.push(`# ${word}`);
    lines.push("");
    if (wordData.status === "fulfilled") {
      const w = wordData.value;
      if (w.ipa) lines.push(`**IPA:** ${w.ipa}`);
      if (w.pos) lines.push(`**Part of Speech:** ${w.pos}`);
      lines.push("");
      lines.push(`## Definition`);
      lines.push("");
      if (w.def) lines.push(w.def);
      lines.push("");
      if (w.etym) {
        lines.push(`## Etymology`);
        lines.push("");
        lines.push(w.etym);
        lines.push("");
      }
      if (w.langs && w.langs.length > 0) {
        lines.push(`## Translations`);
        lines.push("");
        lines.push("| Language | Translation |");
        lines.push("|----------|-------------|");
        for (const entry of w.langs.slice(0, 10)) {
          lines.push(`| ${entry.lang.toUpperCase()} | ${entry.translation} |`);
        }
        lines.push("");
      }
    }
    if (lessonData.status === "fulfilled") {
      const l = lessonData.value;
      lines.push(`## Daily Lesson`);
      lines.push("");
      if (l.title) lines.push(`**${l.title}**`);
      if (l.theme) lines.push(`*Theme: ${l.theme}*`);
      lines.push("");
      const phaseOrder = ["hook", "story", "wonder", "action", "wisdom"];
      for (const phase of phaseOrder) {
        if (l.phases[phase]) {
          lines.push(`### ${phase.charAt(0).toUpperCase() + phase.slice(1)}`);
          lines.push("");
          lines.push(l.phases[phase]);
          lines.push("");
        }
      }
    }
    if (quizData.status === "fulfilled" && quizData.value.interactions.length > 0) {
      lines.push(`## Quick Quiz`);
      lines.push("");
      for (const q of quizData.value.interactions) {
        lines.push(`**Q:** ${q.prompt}`);
        if (q.choices && Array.isArray(q.choices)) {
          for (const c of q.choices) {
            const label = typeof c === "string" ? c : c.text || c.label || "";
            lines.push(`- [ ] ${label}`);
          }
        }
        lines.push("");
        lines.push(`> [!tip]- Answer`);
        lines.push(`> ${q.answer}`);
        if (q.explanation) {
          lines.push(`> ${q.explanation}`);
        }
        lines.push("");
      }
    }
    lines.push("---");
    lines.push(`*Generated by [WordOrb](https://wordorb.ai) on ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.*`);
    const content = lines.join("\n");
    const filename = `${word}.md`;
    const existingFile = this.app.vault.getAbstractFileByPath(filename);
    if (existingFile && existingFile instanceof import_obsidian.TFile) {
      await this.app.vault.modify(existingFile, content);
    } else {
      await this.app.vault.create(filename, content);
    }
    const file = this.app.vault.getAbstractFileByPath(filename);
    if (file && file instanceof import_obsidian.TFile) {
      await this.app.workspace.getLeaf().openFile(file);
    }
    new import_obsidian.Notice(`Vocabulary note created: ${filename}`);
  }
  // -- Wikilink Processor: [[wordorb:word]] --
  processWordOrbLinks(el) {
    const links = el.querySelectorAll("a.internal-link");
    links.forEach((link) => {
      const href = link.getAttribute("data-href") || link.textContent || "";
      if (href.startsWith("wordorb:")) {
        const word = href.replace("wordorb:", "").trim().toLowerCase();
        if (!word) return;
        const span = document.createElement("span");
        span.addClass("wordorb-inline");
        span.textContent = word;
        span.setAttribute("title", "Click to look up on WordOrb");
        span.style.cursor = "pointer";
        span.style.borderBottom = "1px dashed var(--text-accent)";
        span.style.color = "var(--text-accent)";
        span.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showWordModal(word);
        });
        link.replaceWith(span);
      }
    });
  }
  // -- Daily Note Integration --
  async appendDailyWord() {
    var _a, _b;
    if (!this.settings.apiKey || !this.settings.dailyNoteWordOfDay) return;
    try {
      const dayOfYear = this.getDayOfYear();
      const lesson = await getLesson(this.settings.apiKey, dayOfYear);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const folder = this.settings.dailyNoteFolder ? `${this.settings.dailyNoteFolder}/` : "";
      const dailyNotePath = `${folder}${today}.md`;
      const file = this.app.vault.getAbstractFileByPath(dailyNotePath);
      if (!file || !(file instanceof import_obsidian.TFile)) return;
      const content = await this.app.vault.read(file);
      const marker = "<!-- wordorb-daily -->";
      if (content.includes(marker)) return;
      const hook = ((_a = lesson.phases) == null ? void 0 : _a.hook) || "";
      const snippet = hook.length > 200 ? hook.substring(0, 200) + "..." : hook;
      const appendText = [
        "",
        marker,
        `## Word of the Day`,
        "",
        lesson.title ? `**${lesson.title}**` : "",
        lesson.theme ? `*${lesson.theme}*` : "",
        "",
        snippet,
        "",
        `> [!quote] Wisdom`,
        `> ${((_b = lesson.phases) == null ? void 0 : _b.wisdom) || ""}`,
        ""
      ].filter((line) => line !== void 0).join("\n");
      await this.app.vault.modify(file, content + appendText);
    } catch (e) {
    }
  }
};
var WordInputModal = class extends import_obsidian.Modal {
  constructor(app, callback) {
    super(app);
    __publicField(this, "callback");
    this.callback = callback;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Enter a word" });
    const input = contentEl.createEl("input", {
      type: "text",
      placeholder: "courage"
    });
    input.style.width = "100%";
    input.style.padding = "8px";
    input.style.marginBottom = "12px";
    input.style.fontSize = "1rem";
    input.focus();
    const submitBtn = contentEl.createEl("button", { text: "Look Up" });
    submitBtn.style.padding = "6px 16px";
    const submit = () => {
      const word = input.value.trim().toLowerCase().replace(/[^a-z'-]/g, "");
      if (word) {
        this.callback(word);
        this.close();
      }
    };
    submitBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WordLookupModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "WordOrb: Look Up Word" });
    const input = contentEl.createEl("input", {
      type: "text",
      placeholder: "Enter a word..."
    });
    input.style.width = "100%";
    input.style.padding = "8px";
    input.style.marginBottom = "12px";
    input.style.fontSize = "1rem";
    input.focus();
    const resultDiv = contentEl.createDiv({ cls: "wordorb-result" });
    const search = async () => {
      const word = input.value.trim().toLowerCase().replace(/[^a-z'-]/g, "");
      if (!word) return;
      resultDiv.empty();
      resultDiv.createEl("p", { text: "Looking up..." });
      try {
        const data = await lookupWord(this.plugin.settings.apiKey, word);
        resultDiv.empty();
        this.renderWordResult(resultDiv, data);
      } catch (err) {
        resultDiv.empty();
        resultDiv.createEl("p", { text: `Error: ${err.message}`, cls: "wordorb-error" });
      }
    };
    const submitBtn = contentEl.createEl("button", { text: "Look Up" });
    submitBtn.style.padding = "6px 16px";
    submitBtn.addEventListener("click", search);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") search();
    });
  }
  renderWordResult(container, data) {
    const header = container.createDiv({ cls: "wordorb-word-header" });
    header.createEl("h2", { text: data.word });
    if (data.ipa) {
      header.createEl("span", { text: data.ipa, cls: "wordorb-ipa" });
    }
    if (data.pos) {
      header.createEl("span", { text: data.pos, cls: "wordorb-pos" });
    }
    if (data.def) {
      container.createEl("p", { text: data.def, cls: "wordorb-def" });
    }
    if (data.etym) {
      const etymDiv = container.createDiv({ cls: "wordorb-etym" });
      etymDiv.createEl("strong", { text: "Etymology: " });
      etymDiv.createEl("span", { text: data.etym });
    }
    if (data.langs && data.langs.length > 0) {
      const langsDiv = container.createDiv({ cls: "wordorb-langs" });
      langsDiv.createEl("strong", { text: "Translations" });
      const list = langsDiv.createEl("ul");
      for (const entry of data.langs.slice(0, 8)) {
        const li = list.createEl("li");
        li.createEl("strong", { text: `${entry.lang.toUpperCase()}: ` });
        li.createEl("span", { text: entry.translation });
      }
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WordDetailModal = class extends import_obsidian.Modal {
  constructor(app, data) {
    super(app);
    __publicField(this, "data");
    this.data = data;
  }
  onOpen() {
    const { contentEl } = this;
    const data = this.data;
    const header = contentEl.createDiv({ cls: "wordorb-word-header" });
    header.createEl("h2", { text: data.word });
    if (data.ipa) header.createEl("span", { text: data.ipa, cls: "wordorb-ipa" });
    if (data.pos) header.createEl("span", { text: data.pos, cls: "wordorb-pos" });
    if (data.def) contentEl.createEl("p", { text: data.def, cls: "wordorb-def" });
    if (data.etym) {
      const etymDiv = contentEl.createDiv({ cls: "wordorb-etym" });
      etymDiv.createEl("strong", { text: "Etymology: " });
      etymDiv.createEl("span", { text: data.etym });
    }
    if (data.langs && data.langs.length > 0) {
      const langsDiv = contentEl.createDiv({ cls: "wordorb-langs" });
      langsDiv.createEl("strong", { text: "Translations" });
      const list = langsDiv.createEl("ul");
      for (const entry of data.langs.slice(0, 10)) {
        const li = list.createEl("li");
        li.createEl("strong", { text: `${entry.lang.toUpperCase()}: ` });
        li.createEl("span", { text: entry.translation });
      }
    }
    const footer = contentEl.createDiv({ cls: "wordorb-footer" });
    footer.createEl("a", { text: "Powered by WordOrb", href: "https://wordorb.ai" });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var LessonModal = class extends import_obsidian.Modal {
  constructor(app, data) {
    super(app);
    __publicField(this, "data");
    this.data = data;
  }
  onOpen() {
    const { contentEl } = this;
    const data = this.data;
    if (data.title) contentEl.createEl("h2", { text: data.title });
    const meta = contentEl.createDiv({ cls: "wordorb-meta" });
    meta.createEl("span", { text: `Day ${data.day}`, cls: "wordorb-badge" });
    meta.createEl("span", { text: data.track, cls: "wordorb-badge" });
    if (data.theme) meta.createEl("span", { text: data.theme, cls: "wordorb-badge" });
    const phaseOrder = ["hook", "story", "wonder", "action", "wisdom"];
    const phaseLabels = {
      hook: "Hook",
      story: "Story",
      wonder: "Wonder",
      action: "Action",
      wisdom: "Wisdom"
    };
    const tabBar = contentEl.createDiv({ cls: "wordorb-tabs" });
    const panels = [];
    phaseOrder.forEach((phase, i) => {
      if (!data.phases[phase]) return;
      const tab = tabBar.createEl("button", {
        text: phaseLabels[phase],
        cls: `wordorb-tab${i === 0 ? " wordorb-tab--active" : ""}`
      });
      const panel = contentEl.createDiv({
        cls: `wordorb-panel${i === 0 ? " wordorb-panel--active" : ""}`
      });
      panel.createEl("p", { text: data.phases[phase] });
      panels.push(panel);
      tab.addEventListener("click", () => {
        tabBar.querySelectorAll(".wordorb-tab").forEach((t) => t.removeClass("wordorb-tab--active"));
        panels.forEach((p) => p.removeClass("wordorb-panel--active"));
        tab.addClass("wordorb-tab--active");
        panel.addClass("wordorb-panel--active");
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var QuizModal = class extends import_obsidian.Modal {
  constructor(app, data) {
    super(app);
    __publicField(this, "data");
    this.data = data;
  }
  onOpen() {
    const { contentEl } = this;
    const interactions = this.data.interactions;
    if (interactions.length === 0) {
      contentEl.createEl("p", { text: "No quiz questions available." });
      return;
    }
    contentEl.createEl("h2", { text: "Vocabulary Quiz" });
    let current = 0;
    let score = 0;
    const answered = {};
    const progressEl = contentEl.createEl("p", { cls: "wordorb-progress" });
    const questionContainer = contentEl.createDiv({ cls: "wordorb-question-container" });
    const navDiv = contentEl.createDiv({ cls: "wordorb-quiz-nav" });
    const prevBtn = navDiv.createEl("button", { text: "Previous", cls: "wordorb-btn" });
    const nextBtn = navDiv.createEl("button", { text: "Next", cls: "wordorb-btn" });
    const scoreDiv = contentEl.createDiv({ cls: "wordorb-score" });
    scoreDiv.style.display = "none";
    const renderQuestion = (index) => {
      questionContainer.empty();
      progressEl.textContent = `Question ${index + 1} of ${interactions.length}`;
      const q = interactions[index];
      questionContainer.createEl("p", { text: q.prompt, cls: "wordorb-prompt" });
      if (q.choices && Array.isArray(q.choices)) {
        const choicesDiv = questionContainer.createDiv({ cls: "wordorb-choices" });
        q.choices.forEach((c, ci) => {
          const label = typeof c === "string" ? c : c.text || c.label || "";
          const value = typeof c === "string" ? String.fromCharCode(65 + ci) : c.key || String.fromCharCode(65 + ci);
          const btn = choicesDiv.createEl("button", {
            text: `${value}. ${label}`,
            cls: "wordorb-choice"
          });
          if (answered[index]) {
            btn.addClass("wordorb-choice--disabled");
          }
          btn.addEventListener("click", () => {
            if (answered[index]) return;
            answered[index] = true;
            const correct = (q.answer || "").toUpperCase();
            const choiceBtns = choicesDiv.querySelectorAll(".wordorb-choice");
            choiceBtns.forEach((b) => {
              var _a;
              b.addClass("wordorb-choice--disabled");
              const bVal = ((_a = b.textContent) == null ? void 0 : _a.charAt(0).toUpperCase()) || "";
              if (bVal === correct) {
                b.addClass("wordorb-choice--correct");
              }
            });
            if (value.toUpperCase() === correct) {
              btn.addClass("wordorb-choice--correct");
              score++;
            } else {
              btn.addClass("wordorb-choice--incorrect");
            }
            if (q.explanation) {
              const explDiv = questionContainer.createDiv({ cls: "wordorb-explanation" });
              explDiv.createEl("p", { text: q.explanation });
            }
          });
        });
      }
      prevBtn.disabled = index === 0;
      nextBtn.textContent = index === interactions.length - 1 ? "Finish" : "Next";
    };
    prevBtn.addEventListener("click", () => {
      if (current > 0) {
        current--;
        renderQuestion(current);
      }
    });
    nextBtn.addEventListener("click", () => {
      if (current < interactions.length - 1) {
        current++;
        renderQuestion(current);
      } else {
        questionContainer.empty();
        progressEl.textContent = "";
        navDiv.style.display = "none";
        scoreDiv.style.display = "block";
        scoreDiv.createEl("h3", { text: "Results" });
        scoreDiv.createEl("p", {
          text: `${score} / ${Object.keys(answered).length} correct`,
          cls: "wordorb-score-text"
        });
      }
    });
    renderQuestion(0);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WordOrbSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "WordOrb Vocabulary Settings" });
    new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Your WordOrb API key (starts with wo_). Get one at wordorb.ai.").addText(
      (text) => text.setPlaceholder("wo_...").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
        this.plugin.settings.apiKey = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Default Tone").setDesc("Default tone for word lookups.").addDropdown(
      (dropdown) => dropdown.addOption("neutral", "Neutral").addOption("formal", "Formal").addOption("playful", "Playful").addOption("poetic", "Poetic").addOption("academic", "Academic").setValue(this.plugin.settings.defaultTone).onChange(async (value) => {
        this.plugin.settings.defaultTone = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Preferred Languages").setDesc("Comma-separated language codes for translation display (e.g., es,fr,de,ja).").addText(
      (text) => text.setPlaceholder("es,fr,de,ja").setValue(this.plugin.settings.preferredLanguages).onChange(async (value) => {
        this.plugin.settings.preferredLanguages = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Daily Note: Word of the Day").setDesc("Automatically append word of the day to your daily note.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.dailyNoteWordOfDay).onChange(async (value) => {
        this.plugin.settings.dailyNoteWordOfDay = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Daily Note Folder").setDesc("Folder where daily notes are stored (leave empty for vault root).").addText(
      (text) => text.setPlaceholder("Daily Notes").setValue(this.plugin.settings.dailyNoteFolder).onChange(async (value) => {
        this.plugin.settings.dailyNoteFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    const testDiv = containerEl.createDiv({ cls: "wordorb-settings-test" });
    const testBtn = testDiv.createEl("button", { text: "Test Connection", cls: "mod-cta" });
    testBtn.style.marginTop = "12px";
    const testResult = testDiv.createEl("p");
    testBtn.addEventListener("click", async () => {
      testResult.textContent = "Testing...";
      try {
        const health = await apiRequest("/api/health", this.plugin.settings.apiKey || "test");
        if (health && health.status === "ok") {
          testResult.textContent = "Connected to WordOrb API.";
          testResult.style.color = "var(--text-success)";
        } else {
          testResult.textContent = "API returned unexpected response.";
          testResult.style.color = "var(--text-error)";
        }
      } catch (err) {
        testResult.textContent = `Error: ${err.message}`;
        testResult.style.color = "var(--text-error)";
      }
    });
  }
};
