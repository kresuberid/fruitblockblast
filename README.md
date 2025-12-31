
<div align="center">
  <img src="https://amfnhqsrjrtcdtslpbas.supabase.co/storage/v1/object/public/images/icon-fruitblockblast.png" alt="Fruit Block Blast Icon" width="128" height="128" style="border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">

  # Fruit Block Blast
  **The Ultimate 3D Fruit Puzzle Experience**

  [![Version](https://img.shields.io/badge/version-1.2.0-blue.svg?style=flat-square)](https://fruitblockblast.vercel.app/)
  [![Status](https://img.shields.io/badge/status-production-success.svg?style=flat-square)](https://fruitblockblast.vercel.app/)
  [![License](https://img.shields.io/badge/license-Proprietary-red.svg?style=flat-square)](https://febrisuryanto.com)
  [![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA%20%7C%20Android%20%7C%20iOS-orange.svg?style=flat-square)]()

  [Play Now (Live)](https://fruitblockblast.vercel.app/) • [Developer Website](https://febrisuryanto.com)
</div>

---

## 📖 Project Definition & Description

**Fruit Block Blast** is a high-quality casual puzzle game that reimagines the classic block puzzle genre with vibrant 3D fruit visuals, smooth animations, and a modern "Glassmorphism" UI design. Built with web technologies but designed for a native-app feel, it bridges the gap between casual browser games and premium mobile store applications.

### Core Concept
The game operates on an 8x8 grid where players must strategically place varying block shapes (Tetrominoes) to clear rows and columns. Unlike traditional block games, Fruit Block Blast incorporates RPG-lite elements such as character selection with passive abilities, an in-game economy (Coins), and consumable boosters.

### Value Proposition
*   **Visual Fidelity:** 3D rendered assets and particle effects powered by high-performance CSS and Canvas animations.
*   **Progressive Difficulty:** A dynamic level system (1-100) that evolves from simple relaxing gameplay to complex strategic challenges.
*   **Accessibility:** Fully responsive design that works seamlessly on Desktop, Tablet, and Mobile devices via PWA (Progressive Web App) technology.

### Platform Status
*   **Current:** Web / PWA (Stable).
*   **In Development:** Native Android (`.apk`/`.aab`) and iOS wrappers via Capacitor/Cordova for Google Play Store and Apple App Store deployment.

---

## 🎮 Gameplay Overview

### How to Play
1.  **Drag & Drop:** Pick one of the three available block shapes from the bottom dock.
2.  **Place:** Drop the block onto the 8x8 grid.
3.  **Clear:** Fill a vertical column or horizontal row completely to clear it and earn points.
4.  **Combo:** Clear multiple lines simultaneously or consecutively to trigger "Combo" and "Blast" multipliers.
5.  **Win/Lose:** Reach the target score and line count to advance. The game ends if there is no space left for new blocks.

### Core Elements
*   **Characters:** 12 unique heroes (e.g., Apple Soldier, Nana Ninja, Dragon Master) offering passive buffs like Score Multipliers or Coin Bonuses.
*   **Boosters:**
    *   🔨 **Hammer:** Destroys a single block.
    *   💣 **Bomb:** Clears a 3x3 area.
    *   🔄 **Shuffle:** Refreshes the available block shapes.
*   **Economy:** Earn coins through gameplay, high scores, or rewarded video ads to unlock characters and buy boosters.

---

## 🚀 Changelog & Version History

**Current Version:** `v1.2.0`

### New Features
*   **Glassmorphism UI:** Complete interface overhaul featuring frosted glass effects, blurred backdrops, and refined typography for a premium look.
*   **Speedometer Bonus:** New interactive "Multiplier" mini-game for hourly rewards.
*   **Responsive Layout:** Optimized "Center-Stage" layout for Tablets and Mobile devices, ensuring the game board and controls remain ergonomic.
*   **Supabase Leaderboard:** Real-time global high-score system.

### Technical Improvements
*   **React 19 Migration:** Updated core library for better state management and rendering performance.
*   **Audio Engine:** Enhanced `SoundManager` with low-pass filter effects during pause menus.
*   **PWA Install Flow:** Improved "Add to Home Screen" prompts and service worker caching strategy for offline play.

---

## 🛠️ Technical Information

### Tech Stack
*   **Frontend Framework:** React 19 (TypeScript)
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (Utility-first), Custom CSS Animations
*   **Icons:** Lucide React
*   **Backend / Database:** Supabase (PostgreSQL) for Leaderboards
*   **Audio:** Web Audio API (Native browser implementation, no heavy libraries)
*   **Monetization:** Google AdMob / AdSense (H5 Games Ads)

### Project Structure
```bash
/
├── src/
│   ├── components/   # Reusable UI (Button, AdBanner, etc.)
│   ├── screens/      # Main Views (GameScreen, etc.)
│   ├── utils/        # Logic (Audio, Game Engine, Supabase, Ads)
│   ├── types.ts      # TypeScript Interfaces
│   ├── constants.ts  # Game Configuration (Levels, Characters)
│   ├── App.tsx       # Main Entry & Routing Logic
│   └── index.css     # Global Styles & Animations
├── public/           # Static Assets (Images, Sounds, Manifest)
└── metadata.json     # App Capabilities Configuration
```

### Identity
*   **Live URL:** `https://fruitblockblast.vercel.app/`
*   **Package Name:** `com.fruitblockblast.game`

---

## 💰 Monetization & Compliance

### Google AdMob Integration
The game integrates **Rewarded Video Ads** to monetize non-paying users while enhancing retention. Players can watch ads to:
*   Multiply their hourly rewards (2x, 3x, 4x).
*   Earn free coins for the shop.

### Compliance Standards
*   **app-ads.txt:** Properly configured at root level for authorized digital selling.
*   **GDPR / CMP:** The application is designed to support Google-certified Consent Management Platforms (CMP) for traffic from the EEA, UK, and Switzerland, adhering to TCF v2.2 frameworks.
*   **Store Policies:** The game logic and asset usage comply with Google Play "Casual Game" policies and Apple App Store guidelines regarding user data privacy and ad experiences.

---

## 👨‍💻 Developer Information

<div align="left">
  <strong>Febri Suryanto</strong><br>
  <em>Professional Web Designer & Developer</em>
</div>

*   **Website:** [https://febrisuryanto.com](https://febrisuryanto.com)
*   **Role:** Lead Developer, UI/UX Designer.
*   **Profile:** A seasoned digital professional specializing in creating immersive web experiences, high-performance applications, and intuitive user interfaces. With a deep understanding of the modern web ecosystem, Febri bridges the gap between aesthetic design and robust engineering.
*   **Expertise:** React Ecosystem, TypeScript, UI/UX Design Systems, PWA Architecture, and Game Development.

---

## 🗺️ Roadmap & Maintenance

### Upcoming Milestones
1.  **Q3 2024:** Release of Native Android APK on Google Play Store.
2.  **Q4 2024:** iOS version deployment via TestFlight/App Store.
3.  **Feature:** Social Login (Google/Apple Sign-In) to sync progress across devices.
4.  **Feature:** "Endless Mode" for hardcore players.

### Maintenance
This project allows for hot-updates via the web deployment pipeline (Vercel). Critical bugs are addressed within 24-48 hours. Leaderboard integrity is monitored weekly via Supabase RLS policies.

---

## 📄 Metadata & Copyright

**License:**
Copyright © 2024 Febri Suryanto. All Rights Reserved.
*Unauthorized redistribution, modification, or commercial use of the source code or assets is strictly prohibited without written permission.*

**Contact:**
For business inquiries, publishing opportunities, or support:
[Contact via Website](https://febrisuryanto.com)

---
<div align="center">
  <sub>Made with ❤️ and TypeScript</sub>
</div>
