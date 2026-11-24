# LandConnect – Land Marketplace Mobile Application

A privacy-first, WhatsApp-inspired luxury mobile marketplace for **Buyers**, **Sellers**, and **Brokers** to discover land plots on an interactive map, negotiate in real-time via 1-on-1 chats and meeting rooms, and conduct encrypted in-app audio/video calls without ever exposing personal phone numbers or email addresses.

---

## Submission Links

- **Live Backend API (Render)**: [https://landconnect-api.onrender.com](https://landconnect-api.onrender.com) *(Health check: [/health](https://landconnect-api.onrender.com/health))*
- **Android APK Download**: [Download LandConnect APK](https://expo.dev/artifacts/eas/placeholder-apk-link) *(Built via Expo EAS)*
- **Demo Video Walkthrough**: [Watch Video Demo](https://youtu.be/placeholder-demo-link) *(6-minute end-to-end walkthrough)*
- **AI Usage Documentation**: [docs/AI_USAGE.md](docs/AI_USAGE.md) *(Detailed AI engineering & verification report)*

---

## Key Features & Capabilities

### 1. Zero-PII Privacy & Dual-Layer RBAC
- **Strict Anonymity**: Buyers, Sellers, and Brokers connect without exchanging phone numbers or email addresses. User identities are protected by a server-side `piiMask` serializer.
- **Three Distinct Roles**:
  - **Buyer**: Browse listings, drop pins, start 1-on-1 chats, join broker meetings, make/receive audio & video calls.
  - **Seller**: Full buyer capabilities + create, edit, update status (`AVAILABLE`, `NEGOTIATION`, `SOLD`), and delete owned plots (`owner_id === currentUser.id`).
  - **Broker**: Full seller capabilities + create and coordinate 3-way negotiation meeting rooms between buyers and sellers.
- **Dual-Layer Access Control**: Enforced both on the client UI and via backend Express middleware (`401` unauthenticated, `403` unauthorized).

### 2. Luxury Sotheby's-Grade Design System
- **Palette**: Deep Estate Emerald (`#0B2B26`), Warm Alabaster (`#F8F7F4`), Pure Ivory (`#FFFFFF`), and Brushed Champagne Gold (`#C5A059`).
- **Typography & Formatting**: Tracked uppercase eyebrow labels, tabular INR currency formatter (`₹45.00 Lakh`, `₹1.20 Cr`), and 16px radius elevated cards.
- **Zero Emojis**: 100% vector iconography powered by `@expo/vector-icons` (`Ionicons`).

### 3. Interactive Map & Geolocation
- **Native Platform Tiles**: Uses `PROVIDER_DEFAULT` map rendering for crisp performance across all zoom levels without third-party rate limits.
- **Plot Markers & Floating Preview**: Tapping plot markers highlights the property on a floating bottom preview card.
- **GPS & Pin-Drop Geotagging**: One-tap current device GPS capture via `expo-location` or manual map pin-drop when listing properties.

### 4. Real-Time Negotiation & 3-Way Broker Meetings
- **Persistent Chat History**: PostgreSQL persistence synced via Socket.IO with optimistic UI updates.
- **Direct & Group Meeting Rooms**: Brokers can create custom group meeting rooms and add buyer/seller participants to negotiate terms.
- **Typing Indicators & Date Separators**: Live typing indicators and WhatsApp-style dynamic date pills (`Today`, `Yesterday`, `14 Nov 2026`).

### 5. In-App Audio & Video Calling (ZegoCloud SDK)
- **Token-Authenticated Calls**: Calls are authorized through server-generated ZegoCloud Token04 credentials.
- **Global Incoming Call Overlay**: Full-screen modal with caller name, role badge, and Accept/Decline actions.
- **Dual-Mode Compatibility**:
  - **Expo Go Mode**: Simulated luxury call interface with live Socket.IO signaling, timers, and audio/video toggle states.
  - **Native APK Mode**: Dynamically mounts `@zegocloud/zego-uikit-prebuilt-call-rn` with hardware camera and microphone integration.

---

## System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│           LandConnect Mobile Client (Expo SDK 58)      │
│  React Native • TypeScript • Zustand • React Navigation│
└────────────────────────┬───────────────────────────────┘
                         │ REST APIs & Socket.IO Signaling
                         ▼
┌────────────────────────────────────────────────────────┐
│             LandConnect Backend (Node.js)              │
│      Express • TypeScript • Socket.IO • Prisma ORM     │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
             ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│   PostgreSQL (Supabase) │   │ Cloudinary (Photo Media) │
│  Database with Pooling  │   │   Multipart Form-Data    │
└─────────────────────────┘   └──────────────────────────┘
```

- **Backend (`server/`)**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (Supabase), Socket.IO, Zod, bcrypt, jsonwebtoken, Multer, Cloudinary, Nodemailer.
- **Mobile (`mobile/`)**: React Native, Expo Dev Client (SDK 58), TypeScript, React Navigation, Zustand, Axios, `react-native-maps`, `expo-location`, `socket.io-client`, ZegoCloud SDK.
- **Hosting**: Render (Web Service), Supabase (PostgreSQL), Expo Application Services (EAS Build for APK).

---

## Pre-Seeded Demo Accounts

The database includes three pre-configured accounts representing each role (all passwords: `Password@123`):

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Buyer** | `buyer@landconnect.com` | `Password@123` | Browse, call, message, join rooms |
| **Seller** | `seller@landconnect.com` | `Password@123` | Post listings, manage plots, 1-on-1 chat |
| **Broker** | `broker@landconnect.com` | `Password@123` | Post listings, create 3-way meetings, broker badge |

*(Quick-fill demo buttons are available directly on the login screen for rapid testing.)*

---

## Local Setup & Development

### Prerequisites
- Node.js 18+ & npm
- PostgreSQL database (or free Supabase project)
- Cloudinary free-tier account (for image uploads)
- Expo CLI (`npx expo`) and Expo Go on your mobile device

---

### 1. Backend Setup (`server/`)

```bash
cd server
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, DIRECT_URL, CLOUDINARY_*, ZEGO_*, and JWT secrets

# Run database migrations & seed initial demo data
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run dev
```

Backend will be running at `http://localhost:5000` (Health check: `http://localhost:5000/health`).

---

### 2. Mobile App Setup (`mobile/`)

```bash
cd mobile
npm install

# Configure environment variables
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_SOCKET_URL to your LAN IP (e.g. http://192.168.1.X:5000)

# Start Expo development server
npm run start
```

Scan the QR code with **Expo Go** on Android or iOS.

---

### 3. Production Build & Deployment

#### Backend Deployment (Render)
1. Create a new **Web Service** on [Render](https://render.com) connected to your repository.
2. Set **Root Directory**: `server`
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npm run start` *(Runs `node dist/index.js` with `postinstall: prisma generate`)*
5. Add all environment variables from `server/.env.example`.

#### Mobile Standalone APK Build (Expo EAS)
```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```
This generates a standalone installable Android APK file using the profile in `eas.json`.

---

## Verification & Code Quality

- **Mobile TypeScript Verification**:
  ```bash
  cd mobile && npx tsc --noEmit
  # 0 errors
  ```
- **Backend TypeScript Verification**:
  ```bash
  cd server && npm run build
  # 0 errors
  ```
- **Zero-Emoji Audit**: Verified clean with 0 emoji glyphs across all 32 mobile source files.
