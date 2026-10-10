# Drawply 0.3.6

Draw feedback directly on an AI result, then continue in the same chat. Available as a standalone skill or a plugin containing the same self-contained skill. MIT licensed.

## Install using Codex
Open [Drawply’s website](https://pokericabra.com/drawply/) and choose **Install using Codex**, or download the skill ZIP from [GitHub Releases](https://github.com/jasonz2008/drawply/releases/latest). Give Codex the downloaded file or its URL and ask:

> Inspect this Drawply skill ZIP, check inline visualization support, then install it as a personal skill. Do not overwrite an existing Drawply skill or plugin without asking me.

The standalone ZIP contains a drawply/ folder with SKILL.md, scripts and assets. The entire folder belongs in the personal skill directory selected by Codex (normally $CODEX_HOME/skills/drawply). Do not copy only SKILL.md. No command installer or Drawply server is needed.

After installation, Drawply is selected automatically for visual-result work in supported hosts. You should not need to type its name each time. This is an agent default, not a guaranteed image hook. If needed, ask: Use $drawply to show this result for review.

## Plugin option
The plugin ZIP includes .agents/plugins/marketplace.json and plugins/drawply/. Ask Codex to inspect it, extract it to a persistent folder and register the local catalog without installing it. Then open Plugins, select the Drawply source and click Install. Keep that extracted catalog folder. This does not create a public directory listing.

Choose either the standalone skill or the plugin to avoid duplicate discovery. When switching, ask Codex to inspect the existing installation and remove only the old Drawply entry after approval; do not delete generated reviews, drawings or chats.

## Requirements and boundaries
- A Codex host with inline visualize capability. Packaging does not add this capability or intercept every image.
- Node.js 20+ available to the agent for the renderer. You do not need to type renderer commands yourself.
- Local PNG under 700 KB; at least 32 by 32 and at most 32 million pixels. The agent can prepare a review copy.
- Annotation-state delivery is best-effort. Add to chat copies the marked image when clipboard access is allowed; click the chat composer and paste (Ctrl+V / Command+V). Automatic pasting is not supported. If clipboard access is blocked, use Save drawing and attach the PNG.
- Pen, arrow, box, editable text, colors, undo/redo, undoable clear, image copying and PNG export. AI applies changes to the underlying source afterward.

## Source and privacy
The skill's scripts/render-inline.mjs reads a selected PNG and writes HTML with the original image and local path. assets/inline-review.html implements the drawing UI. Generated files should remain private unless intentionally published. Marks are not secure redaction. Host widget state and chats follow the host's data policies. See PRIVACY.md and LICENSE.

## Remove
Ask Codex to remove only the personal Drawply skill, or uninstall the plugin through Plugins. For a plugin, the optional catalog can also be removed afterward. Saved drawings and conversations remain yours.

## GitHub
Maintainer: https://github.com/jasonz2008
Source: https://github.com/jasonz2008/drawply

Website and interactive demo: https://pokericabra.com/drawply/

The standalone installable skill is `plugins/drawply/skills/drawply`. Report bugs and suggest improvements through [GitHub Issues](https://github.com/jasonz2008/drawply/issues). Do not include private images or credentials.

Drawing has no point or mark cap. The live canvas and PNG export retain full detail. Saved chat state is compact and may simplify or omit marks in very large drawings; a reloaded review can restore only that compact reference. Export a PNG before closing when exact detail matters.
