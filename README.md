# Inline Image Paste Plus (Thunderbird)

Pastes clipboard images inline in Thunderbird compose windows.

## Features
- Intercepts paste when clipboard contains an image
- Modes: Off, Auto (PNG if transparent, else JPG), PNG, JPG (white background)
- Resize limits and max size handling (optional, depending on your build)
- Toolbar button with menu popup to choose mode per compose window

## Install (Development)
1. Thunderbird: Tools → Add-ons and Themes
2. Gear icon → Debug Add-ons
3. Load Temporary Add-on → select `manifest.json`

## Notes
- This is a MailExtension for Thunderbird ESR.
- The add-on registers compose scripts at runtime via `browser.composeScripts.register()`.

## License
MIT (or whichever you choose)
