# Drawply

Drawply is a free, MIT-licensed inline visual-feedback editor for Codex users. It keeps drawing and editing in the conversation; instructions and reference attachments belong in the native chat composer.

The Select extension uses object layers prepared by Codex from editable source. It does not analyze arbitrary uploaded pictures, download recognition models, or call an external service. Flat PNGs retain annotation tools and explain why semantic selection is unavailable.

Keep the existing lightweight toolbar. Select drills from whole objects to parts, text, and characters; outside click, Escape, or Up returns one parent. Move, resize, and rotate affect selected objects and descendants. Numeric controls are optional and collapsed. Preserve full live drawings and undo/redo. Cancelled gestures must not alter history. PNG export and clipboard copying include edited content without editing handles. Add to chat still requires manual paste. Reviews express intent; Codex subsequently edits the real source.

The host must support inline visualization. Existing two-argument renderer usage remains supported. No website deployment or installed-skill replacement is implicit in source changes.

Select supports dragging a marquee around fully enclosed elements. A parent and its descendants never enter the same selection twice. Multi-selection transforms operate together, preserve exact parent-relative geometry, participate in Undo/Redo, and export without selection chrome. Cancelling a marquee preserves the previous selection.
