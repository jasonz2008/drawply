# Drawply privacy

Version 0.3.6, October 10, 2026

The renderer reads the chosen local PNG and writes HTML containing that image and its local source path. The inline editor can share annotation text, coordinates, colors and the source path with the AI host through its widget-state bridge as you edit. Host persistence and model delivery are host-controlled and best-effort. The plugin has no Drawply-operated network endpoint, telemetry, account or advertising system.

Add to chat writes the marked PNG to your system clipboard only when you click it and permission allows; it does not read the clipboard or paste automatically. Clipboard contents may be available to other apps or your OS clipboard history. Saving a PNG writes a download; it does not automatically attach it to chat. Chats, attachments and host state follow the host's terms and account settings. Do not share secrets or images you lack rights to share. Drawing over content is not secure redaction: generated HTML embeds the original image.

You control deletion of local review/export files. Uninstallation leaves them and conversations intact. Use the host's privacy controls for host-held data.

The distribution website demo has no AI connection and keeps marks only in browser memory. The supplied pages add no trackers or cookies, but GitHub Pages logs visitor IP addresses for security. Existing domain cookies and other pages have separate behavior.

Maintainer profile: https://github.com/jasonz2008 . Reports on public GitHub surfaces are public; do not post sensitive information there. This project has no private support inbox. Provider-held data requests should go through the provider's privacy channels. These arrangements do not remove legal rights or obligations.

Full website notice: https://pokericabra.com/drawply/privacy.html (available after website publication). GitHub: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement . OpenAI: https://openai.com/policies/privacy-policy/ .
