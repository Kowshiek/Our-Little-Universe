# 🌌 OUR LITTLE UNIVERSE
### Full-Stack Online Multiplayer Game & Installable Mobile Web App for Couples
> *"Two Hearts. One Universe."*

---

## 🌟 Game Vision & Architecture Overview

**Our Little Universe** is a private, real-time cooperative multiplayer game and installable Progressive Web App (PWA) designed exclusively for couples. Players establish a private cosmic sanctuary, customize their floating home planet (Lumina Island), collect magical starlight, complete cooperative missions, and travel through the Ancient Stargate to fight the Starlight Golem boss together in the Nebula Arena.

### ✨ Visual Theme
- **Cosmic Palette**: Deep midnight blue (`#0b081d`, `#140e36`), cosmic purple (`#2d1b69`), radiant pink (`#ec4899`, `#f472b6`), and celestial starlight gold (`#ffd166`).
- **Aesthetic**: Cute, polished 2D game graphics rendered with procedural canvas textures in Phaser 3.
- **Glassmorphism HUD**: Responsive, mobile-first overlay with safe-area support, live partner presence, and real-time cloud-sync indicators.

---

## 📱 1. Installable Mobile Web App (PWA)

Configured for standalone mobile app installation on Android and iOS devices:

- **Web App Manifest**: Valid `manifest.webmanifest` with short name `Our Universe`, theme color `#140e36`, background `#0b081d`, and standalone display mode.
- **Icon Set**: Multi-resolution icons (`icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, and `apple-touch-icon.png`).
- **Service Worker (`sw.js`)**:
  - Pre-caches static application shell (HTML, CSS, JS, fonts, icons).
  - Versioned cache lifecycle with automatic cache eviction.
  - **Strict Security**: Never caches private API endpoints or authentication tokens.
- **Platform-Specific Install Flow**:
  - **Android / Chromium**: Captures `beforeinstallprompt` and triggers a native installation dialog.
  - **iOS Safari**: Provides visual step-by-step instructions for *Share ➔ Add to Home Screen*.

---

## 🌐 2. Strict Online-Only Gameplay & Connectivity

Internet connectivity is mandatory to protect shared world integrity:

1. **Startup Verification Sequence**:
   - Checks device connectivity (`navigator.onLine`).
   - Actively probes backend `/api/health` with latency measurement.
   - Loads authorized universe and player state from the cloud.
   - Connects and authorizes Socket.IO session.
2. **Offline Interception**:
   - If the backend is unreachable at startup, displays a full-screen message:
     > *"You're offline. Connect to the internet to enter Our Little Universe."*
   - Prevents entering the playable game, offline battles, simulated saves, or offline progression.
3. **Session Interruption Recovery**:
   - If connection is lost mid-game, pauses authoritative actions, preserves local recovery data, and displays a reconnecting overlay.
   - Automatically reconnects, revalidates credentials, and reloads cloud state upon restoration.

---

## 💾 3. Mobile Storage Architecture

- **IndexedDB (via Dexie)**:
  - Table `checkpoints`: Records last confirmed safe coordinates `(lastSafeX, lastSafeY)` and timestamp.
  - Table `recoveryQueue`: Temporary pending action queue with timestamps and sync status.
  - Table `profiles`: Fast local cached player identity.
  - Requests persistent storage (`navigator.storage.persist()`) where supported.
- **Cache Storage**: Static assets, JS/CSS bundles, fonts, and icons.
- **LocalStorage**: Only small non-sensitive settings (audio volume, touch controls). Never stores progression secrets.

---

## 🔐 4. Private Couple Authentication & Invitations

1. **Account Registration**: Individual accounts with email, password (hashed with `bcrypt`), display name, and avatar suit color.
2. **Universe Creation**: First player creates universe, generating an 8-character cryptographically secure invitation code (e.g., `STAR-381850`).
3. **Cryptographic Protection**: Codes are stored in the database as SHA-256 hashes (`code_hash`).
4. **Partner Joining**: Second player enters the code. Validated on the backend with rate-limiting protection.
5. **Sanctuary Capacity Enforcement**: Restricts universe membership to exactly two partners (couple privacy).
6. **Code Rotation & Revocation**: Universe owner can rotate the invitation code at any time.

---

## ☁️ 5. Cloud Database & Save/Resume Architecture

### PostgreSQL / Supabase Schema & SQLite Compatibility
- **Database Tables**:
  - `profiles`: User accounts & astronaut styles.
  - `universes`: Couple sanctuary identity and level.
  - `universe_members`: Role-based membership (`owner` / `partner`).
  - `universe_invitations`: Hashed codes, usage limits, revocation status.
  - `player_states`: Coordinates, safe resume points `(lastSafeX, lastSafeY)`, health, energy.
  - `universe_states`: Shared stars, crystals, portal unlock status, boss defeat status, version.
  - `planet_states`: Unlocked planets and atmospheric conditions.
  - `placed_objects`: Tile-based decoration placements (trees, lamps, benches, monuments).
  - `inventory_items`: Shared and individual decorations.
  - `missions`: Cooperative quest definitions.
  - `mission_progress`: Progress counters, completed timestamps, and atomic claim timestamps.
  - `achievements`: Couple milestone records.
  - `save_versions`: Optimistic concurrency audit history.
- **Row Level Security**: Included in `supabase/migrations/20261027000000_init_our_little_universe.sql`.
- **Atomic Operations**: Database transactions prevent race conditions or duplicate reward claims.
- **Resume Flow**: Returning players spawn at their last confirmed safe coordinates instead of restarting.

---

## 🎮 6. Playable Phaser 3 Game World

### Area 1: Lumina Island (Home Planet)
- **Cozy Celestial Cottage**: Central home base with glowing windows and smoke puff.
- **Customizable Landscape**: Place and remove blossom trees, lamps, benches, fountains, and flowers.
- **5 Collectible Magical Stars**: Scattered across the island with floating animations and stardust particle effects.
- **Ancient Stargate**: Located on the eastern coast. Interactive portal awakening to Nebula Arena.
- **Collision Physics**: Safe island perimeter collision boundaries.

### Area 2: Nebula Arena (Boss Encounter)
- **Starlight Golem Boss**: Giant celestial guardian with stone fists and a pulsing starlight heart.
- **Boss Mechanics**: 300 HP, Phase 1 & Phase 2 (Cosmic Overdrive at 50% HP).
- **Cooperative Combat**: Both players fire magical stardust bursts (Space key / Mobile Attack button) to damage the boss.
- **Victory Reward**: Celebratory particle explosion, confetti, and unlock of the legendary **Heart of the Universe Monument**.

---

## ⚡ 7. Real-Time Socket.IO Multiplayer

- **Movement Synchronization**: Smooth position updates with interpolation.
- **Couple Emotes**: Real-time floating emojis (`💖 Love`, `💋 Kiss`, `🤗 Hug`, `✨ Sparkle`, `💃 Dance`, `🎉 Cheer`, `👋 Wave`).
- **Presence Tracking**: Live online/offline partner indicator in HUD.
- **Authoritative Combat**: Server tracks boss health and rewards atomically.

---

## 🕹️ 8. Mobile-First Controls

- **Virtual Touch Joystick**: Directional thumbstick with drag physics and haptic vibration feedback.
- **Action Cluster**:
  - ⚔️ **Attack**: Fires stardust burst.
  - ✋ **Interact**: Activates Stargate / talks to cottage.
  - 💖 **Emote**: Opens quick couple reaction picker.
  - 🛠️ **Build Mode**: Opens workshop to place/remove decorations.

---

## 🚀 9. Getting Started & Running Locally

### Prerequisites
- Node.js 22.5+ or Node.js 24+
- npm 10+

### Installation
```bash
npm install
```

### Run Automated E2E Test Suite
The repository includes a comprehensive end-to-end test verifying Auth, Hashed Invitations, Couple Capacity, Cloud Saves, Checkpoint Resume, Atomic Reward Claims, Shop Purchases, and Real-Time Multiplayer:
```bash
npm test
```

### Development Mode
```bash
# Start backend server (port 4000)
npm run dev:server

# Start client with Vite (port 5173 with API & WebSocket proxy)
npm run dev:client
```
Open [http://localhost:5173](http://localhost:5173) in your desktop or mobile browser.

### Production Build & Launch
```bash
# Build both client and server
npm run build

# Start production server (serves API, WebSocket, and PWA static assets on port 4000)
npm start
```
Visit [http://localhost:4000](http://localhost:4000).

---

## 🧪 10. Verification & Test Checklist

- [x] Account registration with bcrypt password hashing & JWT authentication.
- [x] Private universe creation with cryptographically secure, SHA-256 hashed invite codes.
- [x] Second partner join with invitation validation and 2-player capacity enforcement.
- [x] Rejection of invalid, revoked, or expired invitation codes.
- [x] Central cloud save architecture restoring safe coordinates upon login/reload.
- [x] Prevention of duplicate mission reward claims via atomic database transactions.
- [x] Shop purchases and collision-validated decoration placement.
- [x] Real-time Socket.IO multiplayer position synchronization and emotes.
- [x] Cooperative Starlight Golem boss fight and victory rewards.
- [x] Installable PWA manifest, service worker caching, and touch controls.
- [x] Strict online-only connection verification and graceful offline overlay.
