# Metallic Daily Journal (Local-First)

A clean, modern, elegant daily journal that saves entries locally on your device (IndexedDB),
works offline (PWA), and exports entries as HTML/Markdown/JSON. PDF export uses the browser's print dialog.

## How to run (easy)

### Option 1: Open locally
- Open `index.html` in a modern browser (Chrome/Edge/Safari).
- Note: some browsers restrict service workers for local files, so offline install may not work unless served.

### Option 2 (recommended): Run a tiny local server
From the folder:
- **Python**: `python -m http.server 8080`
- Open: `http://localhost:8080`

## Install as an app (optional)
- In Chrome/Edge: menu → **Install app**.
- On iPhone Safari: Share → **Add to Home Screen**.

## Daily flow
1. Choose a date.
2. Paste prompts (Export → Quick prompt paste) or type them.
3. Write responses (autosave happens while you type).
4. Export when ready (HTML/Markdown/JSON) or Print/PDF.

## Backups (important)
Entries live only on this device + browser profile.
Use **Backup all** weekly to download a JSON file you can store in iCloud/Drive.

## Export options
- **HTML**: a beautiful standalone snapshot of the day.
- **Markdown**: portable text for other tools.
- **JSON**: faithful backup of structured data.
- **Print/PDF**: browser print dialog → “Save as PDF”.

## Privacy note
Local storage is not encrypted. Anyone with access to this device + your browser profile could access entries.

If you want a passphrase lock (client-side encryption), we can add it.
