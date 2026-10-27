# ❤️‍🔥 LOVE BATTLE — FIGHT FOR LOVE
### Complete Online Multiplayer 1v1 Fighting Game & Installable PWA for Couples
> *"Two Hearts. One Arena. Endless Battles."*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## 🌟 1. Game Vision & Identity

**LOVE BATTLE — FIGHT FOR LOVE** is an authoritative, real-time online 1v1 arcade fighting game designed exclusively for couples. Two partners connect through a private secret battle code, pick their romantic fighters, and settle every couple debate with pure skill across cosmic arenas.

- **Visual Theme**: Romantic fantasy meets high-intensity arcade combat. Deep midnight cosmic purples (`#0a061c`, `#150d30`), fiery neon rose (`#ff2a85`), electric violet (`#a855f7`), and cupid gold (`#ffd166`).
- **Engine**: Powered by Phaser 3 (60 FPS arcade physics) + React 18 frontend + Node.js Socket.IO authoritative combat backend + SQLite / PostgreSQL persistence.
- **PWA Mobile First**: Installable on Android & iOS with touch joystick, combat action buttons, safe-area adaptation, and haptic feedback.
- **Strict Online-Only**: Real-time hitboxes, blocking calculations, and Heart Clash collisions are validated on the server with anti-cheat protection.

---

## 🥊 2. Romantic Fighter Roster

| Fighter | Archetype | Signature Move | Passive / Playstyle |
| :--- | :--- | :--- | :--- |
| **Heart Knight** | Noble Crusader | **Heartwave Slash**: Sweeping crescent wave of starlight affection | High survivability, wide reach, balanced defense |
| **Cupid Spark** | Nimble Archer | **Love Arrow Volley**: Penetrating golden arrow | High speed, quick frame data, evasion combos |
| **Shadow Valentine** | Stealth Assassin | **Midnight Rose Blossom**: Teleports and strikes vital heartpoints | Fast dash, high burst damage, requires precision |
| **Crystal Rose** | Defensive Mage | **Prismatic Barrier Shock**: Crystal thorns reflect physical force | Counter-attack specialist, high knockback |

---

## ⚔️ 3. Authoritative Combat Mechanics

1. **Light & Heavy Attacks**:
   - `Light Attack` (Key `J` / Blue Button): Fast execution (300ms cooldown), builds Heart Energy.
   - `Heavy Attack` (Key `K` / Purple Button): High damage (22 DMG, 650ms cooldown), breaks light spacing.
2. **Dynamic Blocking (Key `S` / `Down` / Shield Button)**:
   - Holding block reduces incoming physical damage by **75%**.
   - Defenders gain comeback energy while absorbing strikes.
3. **Invulnerability Dodge (Key `Shift` / Wing Button)**:
   - Dashes backward with invulnerability frames to whiff-punish aggressive attacks.
4. **Heart Clash System**:
   - When both players unleash their 100% Heart Energy Ultimate Special within **450ms** of each other, the arena triggers a **Heart Clash**!
   - Camera zooms, action freezes with chromatic aberration, and a dual shockwave knocks both players back.
5. **Best-of-3 Round Match**:
   - 60-second round timer.
   - First player to win 2 rounds claims victory and earns EXP, level progression, and match history records.

---

## 📱 4. Installable Mobile PWA

- **Web App Manifest**: Valid `manifest.webmanifest` configured for standalone fullscreen mobile display.
- **Service Worker (`sw.js`)**: Fast caching for game assets with cache invalidation and zero API/token caching.
- **Touch Fight HUD**: Dynamic movement thumbstick on the left, tactile Light/Heavy/Special/Block/Dodge buttons on the right.
- **Haptic Feedback**: Subtle vibration triggers on punches, blocks, and Heart Clash.

---

## 🚀 5. Deployment Guide

### A. Deploy Authoritative Backend (Render / Railway / Fly.io)
1. Fork or clone this repository: `https://github.com/Kowshiek/Our-Little-Universe.git`
2. Connect to **Render**:
   - **Root Directory**: `server`
   - **Build Command**: `npm install; npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: `4000`
     - `JWT_SECRET`: `<your-random-jwt-secret>`
     - `CORS_ORIGIN`: `*`
3. Copy your live backend URL (e.g. `https://love-battle-server.onrender.com`).

### B. Deploy Frontend (Vercel)
1. In **Vercel**, import the repository:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
2. Add Environment Variable:
   - `VITE_BACKEND_URL`: `https://love-battle-server.onrender.com`
3. Click **Deploy**!
4. *(Optional)* Players can also paste their backend URL directly into the client via `localStorage.setItem('olu_backend_url', 'https://...')` for instant switching.

---

## 🧪 6. Testing & Build Verification

Run the full end-to-end automated combat test suite:

```bash
# Build server & client
npm --prefix server run build
npm --prefix client run build

# Run Love Battle E2E Test Suite
npm --prefix server test
```

Verifies:
- ✅ Cryptographic SHA-256 secret code hashing & rate-limiting protection.
- ✅ Couple capacity enforcement (strictly 2 players per room).
- ✅ Real-time Socket.IO room joining and fighter synchronization.
- ✅ Server-authoritative hit detection and distance verification.
- ✅ 75% damage mitigation on active block.
- ✅ Simultaneous ultimate special Heart Clash collision.
- ✅ Best-of-3 round progression, match conclusion, and SQLite persistence.
