# WordOrb Vocabulary -- Obsidian Plugin

Look up words, generate vocabulary notes, insert word cards, and take quizzes directly inside Obsidian. Powered by the WordOrb API (162K words, 47 languages, 226K lessons).

## Features

- **Look Up Word** -- Open a modal to search any English word. See definition, IPA, etymology, and translations.
- **Insert Word Card** -- Insert a formatted callout block with word details into your current note.
- **Generate Vocabulary Note** -- Creates a full note with frontmatter, definition, etymology, translations, lesson, and quiz questions.
- **Daily Word** -- View today's 5-phase vocabulary lesson (hook, story, wonder, action, wisdom).
- **Take a Quiz** -- Interactive multiple-choice vocabulary quiz in a modal.
- **Wikilink Integration** -- Type `[[wordorb:courage]]` and it renders as an inline definition link. Click to expand.
- **Daily Note Integration** -- Automatically appends the word of the day to your daily note.
- **Ribbon Icon** -- Quick-access icon in the left sidebar for word lookup.

## Installation

### From Community Plugins (after approval)

1. Open Obsidian Settings.
2. Go to **Community plugins** and click **Browse**.
3. Search for "WordOrb Vocabulary".
4. Click **Install**, then **Enable**.
5. Go to the plugin settings and enter your API key.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/lessonoftheday/wordorb-obsidian/releases).
2. Create a folder: `<vault>/.obsidian/plugins/wordorb-vocabulary/`
3. Place the three files inside that folder.
4. Restart Obsidian, then enable the plugin in Settings > Community plugins.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| API Key | -- | Your WordOrb API key (starts with `wo_`) |
| Default Tone | neutral | Tone for word lookups |
| Preferred Languages | es,fr,de,ja | Languages to show in word cards and notes |
| Daily Note Word of Day | Off | Auto-append today's word to your daily note |
| Daily Note Folder | -- | Folder path for daily notes |

## Commands

All commands are available via `Ctrl+P` (or `Cmd+P`):

| Command | Description |
|---------|-------------|
| WordOrb: Look up word | Open search modal |
| WordOrb: Look up selected word | Look up the word under cursor / selection |
| WordOrb: Insert word card | Insert a callout block into your note |
| WordOrb: Generate vocabulary note | Create a full vocabulary note file |
| WordOrb: Show daily word | Open today's lesson |
| WordOrb: Take a vocabulary quiz | Start an interactive quiz |

## Wikilink Syntax

Type `[[wordorb:courage]]` in any note. The plugin renders this as a clickable inline link. Clicking it opens the word detail modal.

## Generated Note Format

The `Generate vocabulary note` command creates a Markdown file like:

```markdown
---
word: courage
created: 2026-03-06
source: wordorb
tags: [vocabulary]
---

# courage

**IPA:** /ˈkɜːr.ɪdʒ/
**Part of Speech:** noun

## Definition

The ability to face danger, difficulty, uncertainty, or pain without being overcome by fear...

## Etymology

From Old French corage (modern French courage), from Latin cor ("heart")...

## Translations

| Language | Translation |
|----------|-------------|
| ES | coraje |
| FR | courage |
| DE | Mut |
...

## Daily Lesson

...5 phases of today's lesson...

## Quick Quiz

**Q:** Which of the following best describes courage?
- [ ] Physical strength
- [ ] Mental fortitude in the face of fear
...
```

## Community Plugins Submission Guide

### Prerequisites

1. **GitHub repository** -- Create a public repo for the plugin.
2. **Build system** -- Compile `main.ts` to `main.js` using the Obsidian sample plugin build setup.
3. **Release** -- Create a GitHub release with `main.js`, `manifest.json`, and `styles.css` as assets.

### Submission Steps

1. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases).

2. Edit `community-plugins.json` and add your plugin entry:
   ```json
   {
       "id": "wordorb-vocabulary",
       "name": "WordOrb Vocabulary",
       "author": "Lesson of the Day PBC",
       "description": "Look up words, generate vocabulary notes, insert word cards, and take quizzes from the WordOrb API.",
       "repo": "lessonoftheday/wordorb-obsidian"
   }
   ```

3. Submit a pull request to `obsidianmd/obsidian-releases`.

4. Wait for review (typically 1-2 weeks).

### Requirements for Approval

- [ ] Plugin ID in `manifest.json` matches the entry in `community-plugins.json`.
- [ ] No `eval()` or `new Function()` calls.
- [ ] No loading remote code (scripts, stylesheets).
- [ ] All API calls use Obsidian's `requestUrl` (not `fetch` or `XMLHttpRequest`).
- [ ] Plugin works on both desktop and mobile (`isDesktopOnly: false`).
- [ ] `manifest.json` has correct `minAppVersion` (1.0.0).
- [ ] GitHub release has `main.js`, `manifest.json`, and `styles.css`.
- [ ] README describes what the plugin does and how to set it up.

### Build Setup

Use the official Obsidian sample plugin as a template:

```bash
# Install dependencies
npm install

# Build
npm run build

# Development with hot reload
npm run dev
```

The `tsconfig.json` and `esbuild.config.mjs` from the sample plugin work out of the box.

### Updating

1. Bump version in `manifest.json` and `package.json`.
2. Update the `versions.json` file with the new version mapping.
3. Create a new GitHub release with the updated assets.

## License

MIT
