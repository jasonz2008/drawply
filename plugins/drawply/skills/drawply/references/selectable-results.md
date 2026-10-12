# Selectable results

Use Select for results prepared by Codex from editable source. Uploaded flat pictures are outside this feature's scope. No segmentation model, service, or network request is required.

## Prepare the result

Export a clean background and complete object layers from the real source. Build a hierarchy of meaningful objects: button → frame/filling/text → characters. Keep fills beneath labels. Static containers can use `selectable:false` so the first click reaches a button rather than its surrounding panel. Coordinates are relative to the parent's untransformed top-left; children inherit movement, scale, and rotation.

Each image layer must contain the whole object with transparency, not a rectangle cropped from the composed screenshot. A layer must not still contain its separately editable children. The background must not still contain the extracted objects. Preserve original art, typography, and hidden backing; do not invent obscured pixels. If the source cannot provide that decomposition, show annotation-only review and explain the limitation. Never claim a flat PNG provides editable object structure.

Create the review PNG and layer assets at the same scale. Compare the unedited layered composition to the PNG before presenting. Custom-font text or illustrated lettering should use exported transparent glyph PNGs grouped as text; generic text nodes support sans-serif, serif, and monospace and create grapheme children automatically. Multi-line text uses one text node per line under a named group. For joined scripts/ligatures, use source-exported glyph/word layers to preserve the shaping.

## Render

`node scripts/render-inline.mjs result.png review.html elements.json`

The third argument is optional. Existing two-argument rendering and drawing continue to work. Select explains when a result has no layers. The output remains a self-contained inline fragment under 1 MB. The source PNG and combined layer PNGs each must be under 700 KB; the final combined fragment limit still applies. Resize the entire scene consistently if needed; do not silently drop selectable elements.

## Element map

JSON root: `version:1`, `width`, `height` (matching the review PNG), `background` (hex color), optional `backgroundPng` (relative PNG), `children` (back-to-front).

Each node: `id` (unique letters/numbers/underscore/hyphen), `name`, `kind`, `x`, `y`, `width`, `height`, optional `selectable:false`, optional `children`.

Kinds:
- `group`: only its child layers.
- `image`: `png`, a relative transparent PNG path within the element-map directory. Use these for authored art and complex masks.
- `rect`: `color` (hex), optional `radius`.
- `text`: `text` (one line), `color`, `fontSize`, optional `fontFamily` (sans-serif/serif/monospace), `fontWeight` (400/500/700). Its children are generated character elements.

Example (all coordinates are original-image pixels):

```json
{"version":1,"width":800,"height":380,"background":"#ffffff","children":[
  {"id":"continue","name":"Continue button","kind":"group","x":200,"y":140,"width":300,"height":72,"children":[
    {"id":"fill","name":"Filling","kind":"rect","x":0,"y":0,"width":300,"height":72,"color":"#2563eb","radius":12},
    {"id":"label","name":"Button text","kind":"text","x":100,"y":20,"width":120,"height":32,"text":"Continue","fontSize":26,"fontWeight":700,"color":"#ffffff"}
  ]}
]}
```

## Interaction and feedback

Select → click an object, or drag from outside the current selection to draw a box. A box selects fully enclosed elements, keeping a selected parent together with its parts rather than selecting descendants twice. Drag either direction. Multiple selected elements move, resize, and rotate together. An empty box clears selection; Escape during the drag cancels the box.

Select → click an object. Another click within it selects its topmost child. Click outside, Escape, or Up goes back one selectable parent. Drag moves; corner handles resize proportionally (Shift permits independent axes), side handles resize one axis, the round handle rotates (Shift snaps 15°). The element picker and Size & rotation controls provide keyboard alternatives. Arrow keys move 1 pixel; Shift+arrow moves 10. Undo/redo includes object edits and drawing. Export and Add to chat omit selection handles.

Widget state carries `sceneId` and a `transforms` map by element id (`dx/dy` in parent coordinates, `sx/sy` scale, `angle` in degrees, optional `skew` in degrees to preserve affine transforms across differently transformed parents). It is feedback, not source code. Apply user-approved intent to the actual source and show a fresh review. State is best-effort and may omit transforms or strokes to stay within the host limit; `omittedTransforms/omittedMarks` explicitly record this. The current canvas and exported PNG keep the full edit. Reloaded history is not preserved. Do not imply that manipulating this review automatically changes the project.
