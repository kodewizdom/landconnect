# LandConnect - Real Estate Land Marketplace Mobile Application

A privacy-first, WhatsApp-inspired mobile marketplace for **Buyers**, **Owners (Sellers)**, and **Brokers** to discover UAE land plots on an interactive map, negotiate in real time via 1-on-1 chats and 3-way broker rooms, and place in-app audio and video calls without exposing personal phone numbers or email addresses[cite: 3, 5].

---

## Submission Links & Documentation

- **Live Backend API (Render):** [https://landconnect-api-yykr.onrender.com](https://landconnect-api-yykr.onrender.com) *(Health check: [/health](https://landconnect-api-yykr.onrender.com/health))*[cite: 3, 5]
- **Android APK Download (Expo EAS):** [Download LandConnect APK](https://expo.dev/accounts/kooder/projects/landconnect/builds/0eb2ba67-9a34-481b-a298-7be197b3e693)[cite: 3, 5]
- **Demo Video Walkthrough:** [https://drive.google.com/file/d/1CfRCNgaDuS5VjtaLR4Hy4bLN1_nlKbtq/view?usp=drive_link](PASTE_YOUR_GOOGLE_DRIVE_VIDEO_LINK_HERE)[cite: 5]
- **Supporting Documentation:**
  - [Product Requirements Document (`docs/PRD.md`)](docs/PRD.md)
  - [System Architecture (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)[cite: 3]
  - [AI Tools Usage Summary (`docs/AI_USAGE.md`)](docs/AI_USAGE.md)[cite: 4, 5]

---

## Key Features & Capabilities

### 1. Authentication, Email OTP & Role-Based Access Control
- **Verified Sign-Up & Password Recovery:** New registrations and password resets are verified using a 6-digit email OTP with a 10-minute expiry window, dispatched over HTTPS via the Brevo Transactional Email API[cite: 3].
- **3-Layer Disposable Email Guard:** Blocks temporary and fake accounts through syntax checks, a disposable domain blocklist, heuristic domain filtering, and live DNS MX record verification[cite: 3].
- **Three Distinct Roles (Dual-Layer RBAC):** Enforced across both mobile navigation and Express middleware[cite: 3, 5]:
  - **Buyer:** Browse UAE listings, filter plots, view map pins, message owners/brokers, join 3-way rooms, and place/receive audio and video calls[cite: 3, 5].
  - **Owner (`seller` role):** Full buyer capabilities plus creating, editing, updating status (`AVAILABLE`, `NEGOTIATION`, `SOLD`), and deleting owned plots (`owner_id === currentUser.id`)[cite: 3, 5].
  - **Broker:** Full owner capabilities plus creating and coordinating 3-way negotiation rooms connecting buyers and property owners[cite: 3, 5].

### 2. Zero-PII Privacy Architecture
- **No Phone Numbers or Exposed Emails:** LandConnect never collects or shares phone numbers[cite: 3]. Every public API response passes through a server-side allow-list serializer (`piiMask.ts`) that strips email addresses and password hashes[cite: 3, 5].
- **Unique `LC-XXXXXX` Member Codes:** Users identify and invite participants into 3-way broker rooms by display name or unique `LC-XXXXXX` member ID rather than personal contact details[cite: 3].

### 3. UAE Land Listings, Maps & Geolocation
- **AED Pricing & Multi-Photo Uploads:** Seeded with 12 UAE land plots across Dubai, Abu Dhabi, Sharjah, and Ras Al Khaimah formatted in `AED`, with multi-image property uploads (up to 5 images per listing) backed by Multer and Cloudinary[cite: 3].
- **Interactive Map & GPS Geotagging:** Unified List/Map toggle on Explore plus a dedicated Map tab with plot markers, preview cards, one-tap device GPS capture via `expo-location`, and manual coordinate entry[cite: 3, 5].

### 4. Real-Time Messaging & 3-Way Broker Meeting Rooms
- **Persistent Socket.IO Chat:** PostgreSQL-backed 1-on-1 inquiry threads and 3-way broker negotiation rooms with live typing indicators and dynamic date separators[cite: 3, 5].

### 5. In-App Audio & Video Calling (ZegoCloud Express Engine)
- **Native WebRTC Voice & Video:** Built directly on `zego-express-engine-reactnative` with server-generated `04`-version AES-256-CBC tokens (`POST /api/v1/calls/token`)[cite: 3].
- **Full Call Lifecycle:** Initiate audio or video calls, receive incoming call alerts with ringtone/vibration, accept or reject calls, mute microphone, toggle/flip camera, preserve earpiece/Bluetooth audio routing, end calls, and inspect call history logs[cite: 3].

---

## Tech Stack

- **Mobile App (`mobile/`):** React Native (Expo SDK 58), TypeScript, React Navigation, Zustand, Axios, Expo SecureStore, `react-native-maps`, `expo-location`, `expo-audio`, `expo-notifications`, `expo-image-picker`, `expo-clipboard`, `socket.io-client`, `zego-express-engine-reactnative`[cite: 3, 5]
- **Backend Server (`server/`):** Node.js, Express, TypeScript, Socket.IO, Prisma ORM, Zod, `bcrypt`, `jsonwebtoken`, Multer[cite: 3, 5]
- **Database, Media & Cloud:** PostgreSQL (Supabase), Cloudinary, ZegoCloud Express Engine, Brevo Transactional Email API, Render, Expo EAS Build[cite: 3, 5]

---

## Pre-Seeded Demo Accounts

You can sign in immediately using the **Quick Demo Access** buttons on the Login screen or enter any of these pre-seeded credentials (password for all demo accounts: `Password@123`):

| Role | UI Label | Email | Password | Member Code |
| :--- | :--- | :--- | :--- | :--- |
| **Buyer** | Buyer | `buyer@landconnect.com` | `Password@123` | `LC-BYR101` |
| **Seller** | Owner | `seller@landconnect.com` | `Password@123` | `LC-SLR101` |
| **Broker** | Broker | `broker@landconnect.com` | `Password@123` | `LC-BRK101` |

> **Note on Email OTP Verification:** If registering a new account or testing **Forgot Password**, please check your **Spam / Junk** folder if the 6-digit verification code does not appear in your Primary inbox within 15 seconds.

---

## Local Setup & Execution

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL database (or Supabase connection strings)
- Free API credentials for Cloudinary, ZegoCloud, and Brevo

### 1. Backend Setup (`server/`)

```bash
cd server
npm install

# Configure environment variables
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, JWT secrets, CLOUDINARY_*, ZEGO_*, BREVO_API_KEY, and EMAIL_FROM

# Run database migrations & seed UAE demo data
npx prisma migrate deploy
npx prisma db seed

# Start development server
npm run dev