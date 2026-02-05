# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
A web-based Markdown editor (Markdown在线编辑器) using browser-native APIs. Hosted at md.qing.tk.

Key technologies:
- **File System Access API** - Local directory/file read/write with user permission
- **StackEdit.js** - Markdown editing component (loaded from CDN)
- **Netlify** - Static site hosting (no build step)

## Development

### Local Development
Serve the static files with any HTTP server:
```powershell
npx serve .
```
Or open `draft/index.html` directly (some features require HTTP due to File System Access API).

### Deployment
Push to `main` branch. Netlify auto-deploys from repository root (see `netlify.toml`).

## Architecture
```
draft/
  index.html    - Entry point with VSCode-style dark theme UI
  main.js       - Core application logic
  manifest.json - PWA manifest for installable app
```

### Current Implementation (draft/main.js)
- `dirHandle` - File System Access API handle for opened directory
- `openFiles` Map - Tracks open files: path → { handle, content, originalContent, modified }
- `activeFilePath` - Currently active tab/file
- File tree rendering with folder collapse/expand
- Multi-file tabs with modified indicator (●)
- Auto-save every 5 seconds for all modified files
- Keyboard shortcut: Ctrl/Cmd+S to save

### Implemented Features
1. ✅ File tree sidebar (VSCode-style with File System Access API)
2. ✅ Multi-file tabs with close and modified indicators
3. ✅ Auto-save (5 second interval)
4. ✅ StackEdit.js Markdown editing
5. ✅ PWA manifest (basic)
6. ⬜ GitHub sync via API (not yet implemented)

## Design Guidelines
- 界面设计要相当简洁和紧凑 (UI must be very clean and compact)
