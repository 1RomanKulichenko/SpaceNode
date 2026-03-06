# Changelog

All notable changes to this project will be documented in this file.

v1.0.2
- **fix:** `watch` mode + imperative API (`setRoute`, `addModule`, etc.)
  - **Before:** `createApp({ watch: true })` returned a watcher object — `setRoute` and other methods threw `TypeError`
  - **Now:** `createApp()` always returns `SuperApp`, watch logic moved to `listen()`


v1.0.1
- Updated README.md