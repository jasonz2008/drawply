---
name: Drawply Inline Editor
description: Lightweight visual feedback inside the conversation, extended with source-layer selection.
colors:
  action-blue: "#2563eb"
  action-blue-hover: "#1d4ed8"
  action-text: "#ffffff"
spacing:
  controls: "8px"
  sections: "12px"
components:
  add-to-chat:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.action-text}"
  add-to-chat-hover:
    backgroundColor: "{colors.action-blue-hover}"
---

# Design System: Drawply Inline Editor

## Overview

**Creative North Star: "Visual feedback in the conversation"**

Extend the existing inline editor without creating a new visual identity. The image remains the main surface; the compact toolbar uses the host's controls and Lucide icons. Instructions and reference attachments belong in the native chat composer.

This document describes the shipped inline editor, not the parent website or artwork displayed inside its canvas. Authority: plugins/drawply/skills/drawply/assets/inline-review.html and selection.js; product boundaries are in PRODUCT.md.

**Key Characteristics:**
- Host-native controls with visible tool labels.
- Flexible rows around a full-width image.
- Contextual selection controls and collapsed numeric adjustments.

## Colors

### Primary

Action blue identifies Add to chat, with a darker hover state and white text. Selection outlines use the host's --blue token, falling back to action blue; handle fills use --background, falling back to white.

### Neutral

Editor and stage borders inherit --border. Other control surfaces, text, disabled states, and focus treatments come from the host stylesheet. Do not extract a permanent light-theme palette from the test screenshots.

**The Host Palette Rule.** Reuse host tokens for editor chrome; the canvas artwork has its own independent palette. Ink colors are annotation choices, not interface identity colors.

## Typography

The editor inherits the host's button, form-label, form-control, and small-status typography. There is no locally authored display face or type ramp. Tool labels, field labels, and status text provide the hierarchy; artwork text is scene content rather than UI typography.

**The Host Type Rule.** Preserve host typography instead of turning test-harness font defaults or canvas text into editor tokens.

## Layout

The editor uses a grid with section spacing; toolbar, tool groups, and selection controls are wrapping flex rows with control spacing. The toolbar reserves inline-end space (90px) for host chrome. Add to chat uses an automatic inline-start margin. Layout wraps naturally without a local media-query breakpoint.

The canvas fills available width and keeps its intrinsic aspect ratio. Selection labels can shrink and have a preferred flex basis (170px). Numeric fields fill their labels. Size & rotation uses a native details disclosure, closed initially. The contextual row is visible only while Select is enabled and editable layers have loaded.

The floating text editor is bounded by the image stage and capped at 220px or the available width. It is an annotation editor, not a replacement chat composer.

## Elevation & Depth

The full editor has a 1px host-colored border, 12px rounded corners, and 12px inner padding, with a transparent background. The stage retains its single host-colored border. No local toolbar or stage shadow is defined. Selection bounds, resize handles, and the rotation stem provide functional depth over the image; they do not become exported artwork. The text-entry card appears above the stage content through positioning and z-index, retaining host card styling.

## Shapes

Button, field, and card rounding belongs to the host. Selection uses eight square resize handles and one circular rotation handle. Their dimensions scale against displayed canvas size so controls remain visually consistent as the image resizes. Touch receives a larger handle hit area than pointer input.

## Components

### Toolbar

Select joins Pen, Arrow, Box, and Text as a labeled host button with a Lucide icon. Tool state is represented with aria-pressed. Undo remains labeled; Redo is an icon button with an accessible name. Clear marks and Save drawing retain ghost treatment. Add to chat is the primary blue action; it copies an image and then asks for manual paste in chat.

### Selection controls

The Element picker exposes the prepared hierarchy, with indentation for nested parts. Up and Escape return one selectable parent; outside click also returns one parent. Clicking inside a selected object without dragging drills into a child. Text layers expose character selections. These controls describe prepared source layers; they do not imply automatic recognition of a flat image.

Selected objects show move, resize, and rotate affordances, with descendant transforms following their parent. Corner resizing preserves aspect ratio unless Shift is held; Shift also snaps rotation. Arrow keys nudge a selection, with Shift increasing the step. Numeric width, height, and rotation remain optional inside the disclosure. Flat images retain annotation and explain how to request editable layers.

### Image stage and feedback

The canvas keeps the whole result visible and uses mouse or touch input. A polite live status explains selection, clipboard, export, and failure states. Export and copying omit handles while preserving the edited content and annotations. These previews express requested changes; Codex subsequently edits the real source.

## Do's and Don'ts

### Do:
- **Do** inherit host controls, typography, icons, focus, and neutral colors.
- **Do** keep numeric adjustments contextual and collapsed initially.
- **Do** let toolbar rows wrap while the canvas preserves its aspect ratio.
- **Do** preserve annotations and undo/redo when extending selection behavior.

### Don't:
- **Don't** introduce a separate instruction composer inside the editor.
- **Don't** imply automatic object recognition, direct source mutation, or automatic chat attachment.
- **Don't** treat sample artwork or test-harness styling as editor design tokens.

The QA harness hides host icons; its empty icon-only control is not canonized as an acceptable production appearance. Production requires the host's Lucide rendering.

## Box selection

Dragging outside the current selection draws a dashed marquee. Only fully enclosed elements are selected, with ancestors taking precedence over descendants. Multiple selection uses the existing element picker to show a count and shares one transform outline. No extra toolbar is added. Empty marquees clear selection; cancellation preserves it. Group edits are undoable and exported images omit all selection chrome.
