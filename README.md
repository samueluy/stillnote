<p align="center">
  <img src="https://i.imgur.com/OTwLFxa.png" alt="Repo Banner" width="1000"/>
</p>

# Stillnote

A cross-platform Bible study and note-taking app built with Expo and React Native. Stillnote organizes your notes into spaces and threads, auto-detects scripture references, and ships with a bundled KJV translation, full-text search, and a Strong's-style concordance — all stored locally on device with SQLite.

## 🚀 Getting Started

### 📌 Prerequisites
The following are the tech stack you must be familiar to contribute to this project.


[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

### 🏠 Running Locally

1. **Clone or use this template**
   ```bash
   git clone git@github.com:samueluy/stillnote.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npx expo run
   ```

4. **Open the app**

   Once Metro is running, you can launch Stillnote on:
   - iOS simulator (`i`)
   - Android emulator (`a`)
   - The web build (`w`)
   - A physical device using [Expo Go](https://expo.dev/go) or a development build

## 📱 Platforms

Stillnote is built on Expo Router with the New Architecture enabled and runs on:

- iOS (iPhone & iPad — `supportsTablet` is on)
- Android (with adaptive icon and edge-to-edge UI)
- Web (static export via `react-native-web`)

## ⚙️ Deployment
Native builds are produced through Expo's build pipeline (EAS Build). The web target is exported as a static site and can be deployed to any static host.

## ✨ Features

Stillnote is a modern, on-device Bible study notebook built with Expo SDK 54, React Native 0.81, React 19, and TypeScript.

- 📓 **Spaces & Threads** — organize notes into top-level spaces (Personal, Sermons, etc.) and themed threads with custom icons and accents
- 📝 **Markdown editor** with template presets, favorites, and per-note thread assignment
- 📖 **Bundled KJV Bible** seeded into SQLite on first launch, with a quick-access Bible sheet and daily verse
- 🔎 **Full-text search** across notes and verses powered by SQLite FTS
- ✝️ **Automatic verse references** — scripture mentions in notes are detected, normalized, and linked
- 📚 **Concordance lookup** — Strong's-style entries with original-language data, gloss, and lexicon definitions
- 🏷️ **Tags & smart collections** — All Notes, Favorites, and Recent views, plus tag-based filtering
- 🖼️ **Image attachments** via `expo-image-picker` with camera and library support
- 🧱 **Expo Router** file-based navigation with a custom tab bar and modal editor route
- 🗃️ **Local-first storage** with `expo-sqlite` (FTS enabled) — no account or network required
- 🎯 **React Compiler** and the New Architecture enabled for optimized performance
- 🌗 **Light & dark themes** that follow the system appearance