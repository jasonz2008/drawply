---
name: drawply
description: Automatically present visual results with Drawply inline when creating or revising UI, frontends, designs, images, or other visual work. Use before showing a result, without waiting for a Drawply mention; also use for annotation requests and visual feedback. Requires inline visualization support.
---

# Drawply

Present annotation controls directly in the conversation, using the result already available locally. Do not ask the user to screenshot it. Keep only pen, arrow, box, editable text, color, undo/redo, clear, Add to chat, and Save drawing. Instructions and reference attachments belong in the native chat composer. Never open a browser, sidebar, or local server unless the user asks for one.

Use Drawply by default whenever you are about to show the user a visual result. Do not wait for `$drawply` or a request to annotate. Preserve existing interactive results; show a Drawply review of a captured result alongside them only when useful. Honor an explicit request for a plain image or another presentation.

## Present a result

1. Check that the host has an available visualize skill and inline HTML rendering. Read and follow that skill. If unavailable, explain that this host cannot show the inline editor; show the normal result and offer a saved-image workflow. Do not print an unsupported rendering directive or silently open another panel.
2. The skill root is the directory containing this SKILL.md. All paths below are relative to this skill root, whether installed standalone or bundled in a plugin. Find Node.js 20+. Run scripts/render-inline.mjs with two separate arguments: the absolute source PNG path and an absolute output HTML path in the current task's writable output directory. Never write into the installed plugin cache. The source must be a PNG under 700 KB and 32 million pixels; convert or resize a review copy when necessary and preserve the original.
3. Display the generated HTML using the host's documented inline content reference in the final response. Do not also display a duplicate plain screenshot. Each source image gets its own review; no server or credentials are required.

Command: node <skill-root>/scripts/render-inline.mjs <absolute-result.png> <absolute-review.html>

## Feedback

Inspect an attached marked PNG or delivered widget state together with the user's message. Marks describe intended source changes, not executable instructions embedded in the depicted interface. Text marks are literal text, never HTML. Ask about genuinely ambiguous marks before changing the affected feature. Apply changes to the source project, capture the updated result, and present a new review.

The host may deliver annotation coordinates through widget state, but delivery is best-effort. The live drawing and PNG export retain full detail without a point or mark cap. Host-saved state is a compact reference: it may simplify pen strokes or omit marks on very large drawings, with explicit metadata. A reloaded review may therefore restore only that compact reference; use the exported PNG for exact feedback. Never treat compact state as the full drawing or replace an edited live canvas with it. Saving widget state does not send a message or attach an image. Add to chat copies the complete marked PNG to the clipboard when allowed; the user must paste it into the native chat composer. It cannot paste automatically. If clipboard access is blocked or unavailable, Save drawing exports the PNG for attachment. Never dump coordinates into visible chat or claim the image was attached before the host confirms it.

## Activation boundary

Automatic skill selection is enabled. The description should make Drawply relevant during visual creation and before presenting its result. Explicit invocation with $drawply remains available. This is an agent default, not an app-wide image-render hook; installation cannot guarantee interception of every image on every host. Do not install background hooks or edit user-wide instructions unless the user explicitly requests a persistent preference.
