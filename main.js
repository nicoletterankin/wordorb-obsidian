'use strict';

var obsidian = require('obsidian');

const API_BASE = "https://mcp.thedailylesson.com";

const LANGUAGE_OPTIONS = {
  "": "None",
  es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese",
  ja: "Japanese", zh: "Chinese (Simplified)", ko: "Korean", ru: "Russian",
  ar: "Arabic", hi: "Hindi", nl: "Dutch", pl: "Polish", tr: "Turkish",
  sv: "Swedish", no: "Norwegian", da: "Danish", fi: "Finnish", el: "Greek",
  he: "Hebrew", uk: "Ukrainian", cs: "Czech", ro: "Romanian", hu: "Hungarian",
  th: "Thai", vi: "Vietnamese", id: "Indonesian", ms: "Malay", tl: "Filipino",
  sw: "Swahili", fa: "Farsi",
};

const DEFAULT_SETTINGS = {
  apiKey: "",
  translationLang: "es",
  includeIpa: true,
  includeEtymology: true,
  includeExample: true,
  includeTranslation: true,
  insertFormat: "callout",
};

function extractDefinition(data) {
  if (data.definition) return data.definition;
  if (data.short_def) return data.short_def;
  if (Array.isArray(data.definitions) && data.definitions.length > 0) return data.definitions[0];
  return "";
}

function extractExample(data) {
  if (data.example) return data.example;
  if (data.example_sentence) return data.example_sentence;
  if (Array.isArray(data.examples) && data.examples.length > 0) return data.examples[0];
  return "";
}

function extractTranslation(data, lang) {
  if (!lang || !data.translations) return "";
  if (typeof data.translations === "object" && !Array.isArray(data.translations)) {
    return data.translations[lang] || "";
  }
  if (Array.isArray(data.translations)) {
    for (const t of data.translations) {
      if (t.lang === lang) return t.translation;
    }
  }
  return "";
}

function formatCallout(word, data, settings) {
  const def = extractDefinition(data);
  const ipa = settings.includeIpa ? (data.ipa || data.pronunciation || "") : "";
  const etym = settings.includeEtymology ? (data.etymology || "") : "";
  const ex = settings.includeExample ? extractExample(data) : "";
  const trans = settings.includeTranslation ? extractTranslation(data, settings.translationLang) : "";

  const lines = [`> [!vocab]+ **${word}**`];
  if (def) lines.push(`> **Definition:** ${def}`);
  if (ipa) lines.push(`> **IPA:** /${ipa}/`);
  if (trans) {
    const langName = LANGUAGE_OPTIONS[settings.translationLang] || settings.translationLang;
    lines.push(`> **${langName}:** ${trans}`);
  }
  if (etym) lines.push(`> **Etymology:** ${etym}`);
  if (ex) lines.push(`> **Example:** *${ex}*`);
  lines.push(`> — [wordorb.ai](https://wordorb.ai)`);
  return lines.join("\n");
}

function formatInline(word, data, settings) {
  const def = extractDefinition(data);
  const ipa = settings.includeIpa ? (data.ipa || data.pronunciation || "") : "";
  const trans = settings.includeTranslation ? extractTranslation(data, settings.translationLang) : "";
  const ex = settings.includeExample ? extractExample(data) : "";

  const parts = [`**${word}**`];
  if (ipa) parts[0] += ` /${ipa}/`;
  if (def) parts.push(def);
  if (trans) {
    const langName = LANGUAGE_OPTIONS[settings.translationLang] || settings.translationLang;
    parts.push(`*(${langName}: ${trans})*`);
  }
  if (ex) parts.push(`_${ex}_`);
  return parts.join(" — ");
}

class WordOrbModal extends obsidian.Modal {
  constructor(app, word, data, settings) {
    super(app);
    this.word = word;
    this.data = data;
    this.settings = settings;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: this.word });

    const def = extractDefinition(this.data);
    const ipa = this.data.ipa || this.data.pronunciation || "";
    const etym = this.data.etymology || "";
    const ex = extractExample(this.data);
    const trans = extractTranslation(this.data, this.settings.translationLang);
    const langName = LANGUAGE_OPTIONS[this.settings.translationLang] || this.settings.translationLang;

    if (def) contentEl.createEl("p", { text: def });
    if (ipa) {
      const el = contentEl.createEl("p", { text: `/${ipa}/` });
      el.style.cssText = "color: var(--text-muted); font-style: italic;";
    }
    if (trans) contentEl.createEl("p", { text: `${langName}: ${trans}` });
    if (ex) {
      const el = contentEl.createEl("p", { text: `"${ex}"` });
      el.style.cssText = "font-style: italic;";
    }
    if (etym) {
      const etymEl = contentEl.createEl("details");
      etymEl.createEl("summary", { text: "Etymology" });
      etymEl.createEl("p", { text: etym });
    }

    const footer = contentEl.createEl("p");
    footer.style.cssText = "font-size: 0.8em; color: var(--text-muted); margin-top: 1em;";
    const link = footer.createEl("a", { text: "wordorb.ai", href: "https://wordorb.ai" });
    link.setAttr("target", "_blank");
  }

  onClose() {
    this.contentEl.empty();
  }
}

class WordOrbSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Word Orb — Vocabulary Enricher" });

    new obsidian.Setting(containerEl)
      .setName("API Key")
      .setDesc("Get your free key at wordorb.ai (50 lookups/day free)")
      .addText((text) =>
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new obsidian.Setting(containerEl)
      .setName("Translation language")
      .setDesc("Target language for translations")
      .addDropdown((drop) => {
        for (const [code, label] of Object.entries(LANGUAGE_OPTIONS)) {
          drop.addOption(code, label);
        }
        drop.setValue(this.plugin.settings.translationLang);
        drop.onChange(async (value) => {
          this.plugin.settings.translationLang = value;
          await this.plugin.saveSettings();
        });
      });

    new obsidian.Setting(containerEl)
      .setName("Insert format")
      .setDesc("How to insert the enriched content into your note")
      .addDropdown((drop) => {
        drop.addOption("callout", "Callout block (> [!vocab])");
        drop.addOption("inline", "Inline text");
        drop.setValue(this.plugin.settings.insertFormat);
        drop.onChange(async (value) => {
          this.plugin.settings.insertFormat = value;
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("h3", { text: "Include fields" });

    new obsidian.Setting(containerEl).setName("IPA pronunciation").addToggle((t) =>
      t.setValue(this.plugin.settings.includeIpa).onChange(async (v) => {
        this.plugin.settings.includeIpa = v;
        await this.plugin.saveSettings();
      })
    );
    new obsidian.Setting(containerEl).setName("Etymology").addToggle((t) =>
      t.setValue(this.plugin.settings.includeEtymology).onChange(async (v) => {
        this.plugin.settings.includeEtymology = v;
        await this.plugin.saveSettings();
      })
    );
    new obsidian.Setting(containerEl).setName("Example sentence").addToggle((t) =>
      t.setValue(this.plugin.settings.includeExample).onChange(async (v) => {
        this.plugin.settings.includeExample = v;
        await this.plugin.saveSettings();
      })
    );
    new obsidian.Setting(containerEl).setName("Translation").addToggle((t) =>
      t.setValue(this.plugin.settings.includeTranslation).onChange(async (v) => {
        this.plugin.settings.includeTranslation = v;
        await this.plugin.saveSettings();
      })
    );

    const footer = containerEl.createEl("p", {
      text: "Free tier: 50 lookups/day. Upgrade at wordorb.ai for more.",
    });
    footer.style.cssText = "font-size: 0.85em; color: var(--text-muted); margin-top: 1em;";
  }
}

class WordOrbPlugin extends obsidian.Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "enrich-selection",
      name: "Enrich selected word",
      editorCallback: (editor) => this.enrichSelection(editor),
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "w" }],
    });

    this.addCommand({
      id: "enrich-word-at-cursor",
      name: "Enrich word at cursor",
      editorCallback: (editor) => this.enrichWordAtCursor(editor),
    });

    this.addCommand({
      id: "lookup-word",
      name: "Look up word (show in panel)",
      editorCallback: (editor) => this.lookupModal(editor),
    });

    this.addSettingTab(new WordOrbSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getWordAtCursor(editor) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const ch = cursor.ch;
    const wordChars = /[\w\-']/;
    let start = ch;
    let end = ch;
    while (start > 0 && wordChars.test(line[start - 1])) start--;
    while (end < line.length && wordChars.test(line[end])) end++;
    return line.slice(start, end).replace(/[^\w]/g, "");
  }

  async callApi(word) {
    if (!this.settings.apiKey) {
      new obsidian.Notice("Word Orb: No API key set. Go to Settings → Word Orb to configure.");
      return null;
    }
    const encoded = encodeURIComponent(word.toLowerCase().trim());
    let url = `${API_BASE}/api/words/${encoded}`;
    if (this.settings.translationLang) url += `?lang=${this.settings.translationLang}`;

    try {
      const resp = await obsidian.requestUrl({
        url,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.settings.apiKey}`,
          "User-Agent": "ObsidianPlugin-WordOrb/1.0",
        },
      });
      return resp.json;
    } catch (err) {
      const status = err && err.status;
      if (status === 401) {
        new obsidian.Notice("Word Orb: Invalid API key. Check Settings → Word Orb.");
      } else if (status === 429) {
        new obsidian.Notice("Word Orb: Daily limit reached. Upgrade at wordorb.ai.");
      } else if (status === 404) {
        new obsidian.Notice(`Word Orb: "${word}" not found.`);
      } else {
        new obsidian.Notice(`Word Orb: Connection error.`);
      }
      return null;
    }
  }

  async enrichSelection(editor) {
    const sel = editor.getSelection().trim();
    const word = sel.split(/\s+/)[0].replace(/[^\w\-']/g, "");
    if (!word) {
      new obsidian.Notice("Word Orb: Select a word first.");
      return;
    }
    new obsidian.Notice(`Word Orb: Looking up "${word}"…`);
    const data = await this.callApi(word);
    if (!data) return;

    const formatted = this.settings.insertFormat === "inline"
      ? formatInline(word, data, this.settings)
      : formatCallout(word, data, this.settings);

    const cursor = editor.getCursor("to");
    editor.replaceRange("\n\n" + formatted + "\n", cursor);
    new obsidian.Notice(`Word Orb: "${word}" enriched`);
  }

  async enrichWordAtCursor(editor) {
    const word = this.getWordAtCursor(editor);
    if (!word) {
      new obsidian.Notice("Word Orb: No word at cursor.");
      return;
    }
    new obsidian.Notice(`Word Orb: Looking up "${word}"…`);
    const data = await this.callApi(word);
    if (!data) return;

    const formatted = this.settings.insertFormat === "inline"
      ? formatInline(word, data, this.settings)
      : formatCallout(word, data, this.settings);

    const cursor = editor.getCursor();
    const lineEnd = { line: cursor.line, ch: editor.getLine(cursor.line).length };
    editor.replaceRange("\n\n" + formatted + "\n", lineEnd);
    new obsidian.Notice(`Word Orb: "${word}" enriched`);
  }

  async lookupModal(editor) {
    const sel = editor.getSelection().trim();
    const word = sel || this.getWordAtCursor(editor);
    if (!word) {
      new obsidian.Notice("Word Orb: Select or hover over a word first.");
      return;
    }
    new obsidian.Notice(`Word Orb: Looking up "${word}"…`);
    const data = await this.callApi(word);
    if (!data) return;
    new WordOrbModal(this.app, word, data, this.settings).open();
  }
}

module.exports = WordOrbPlugin;
