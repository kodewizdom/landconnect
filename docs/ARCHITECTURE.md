# LandConnect – System Architecture

**Project:** LandConnect – Land Marketplace Mobile App  
**Version:** 1.0  
**Author:** Md Sajid Khan  
**Date:** 23 November 2026  

---

## 1. Overview

LandConnect is split into three clean communication planes so each layer handles what it does best:

* **REST API (Node.js / Express):** Handles auth, RBAC, property listings, image uploads, privacy settings, and call logs.
* **Real-Time Signaling & Chat (Socket.IO):** Handles low-latency 1-on-1 chat, meeting rooms, presence, and call ringing/accept/reject events.
* **Audio & Video Media (ZegoCloud SDK):** Handles WebRTC media streams, NAT traversal, and STUN/TURN across Wi-Fi and mobile networks.

All public user objects pass through a dedicated PII masking serializer (`piiMask.ts`) so emails, password hashes, and phone numbers are never leaked to clients.

---

## 2. Tech Stack

| Layer | Technology | Key Packages / Services |
| :--- | :--- | :--- |
| **Mobile Client** | React Native (Expo Dev Client) + TypeScript | React Navigation, Zustand, Axios, Expo SecureStore |
| **Maps & Location** | `react-native-maps` + OpenStreetMap + `expo-location` | OSM `UrlTile` overlay, GPS & pin-drop geotagging |
| **Backend Server** | Node.js (Express) + TypeScript | Express, Zod, bcrypt, jsonwebtoken, Multer, Nodemailer |
| **Real-Time** | Socket.IO | `socket.io`, `socket.io-client` |
| **Calling Media** | ZegoCloud SDK | Zego React Native SDK, server-side token generator |
| **Database** | PostgreSQL (Supabase) + Prisma ORM | Prisma Client, Prisma Migrate, Supabase Pooler |
| **Media Storage** | Cloudinary | `cloudinary` Node SDK |
| **Email (OTP)** | Nodemailer | Gmail SMTP over TLS (App Password) |
| **Hosting & Build** | Render + Expo EAS Build | Render Web Service, EAS `preview` APK profile |

---

## 3. High-Level Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  MOBILE CLIENT                                    |
|                  React Native (Expo Dev Client) + TypeScript                      |
|  +-----------------------------------------------------------------------------+  |
|  | Screens: Community Feed | Map | Chats & Rooms | Calls | Profile             |  |
|  +-----------------------------------------------------------------------------+  |
|  | Zustand Stores | Expo SecureStore | Axios Client | Socket.IO Client         |  |
|  +-----------------------------------------------------------------------------+  |
|  | react-native-maps (OSM)                 | ZegoCloud Native SDK              |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
       |                    |                    |                   |
       | HTTPS (REST)       | WSS (Socket.IO)    | WebRTC / SRTP     | HTTPS
       v                    v                    v                   v
+------------------+  +------------------+  +-----------------+  +-------------------+
|  EXPRESS SERVER  |  | SOCKET.IO SERVER |  |   ZEGOCLOUD     |  | EXTERNAL SERVICES |
|    (Render)      |  |    (Render)      |  |  MEDIA ENGINE   |  |                   |
|                  |  |                  |  |                 |  | - OpenStreetMap   |
| - Auth & RBAC    |  |  - /chat         |  | SFU / WebRTC    |  | - Cloudinary CDN  |
| - Zod Validation |  |  - /calls        |  | Media Relay     |  | - Google OAuth    |
| - PII Masking    |  +------------------+  +-----------------+  | - Gmail SMTP      |
| - Zego Token Gen |            |                                +-------------------+
| - Nodemailer     |            |
+------------------+            v
       |              +------------------+
       +------------->|  PostgreSQL DB   |
                      |   (Supabase)     |
                      +------------------+
```

---

## 4. Component & Folder Structure

### 4.1 Mobile App (`mobile/src/`)

* **Navigation:** `AuthStack` (Login, Register, Google Role Select, Forgot Password) -> `MainTabNavigator` (Community, Map, Chats, Calls, Profile) + modal screens (Listing Detail, Create/Edit Listing, Chat/Meeting Room, global `IncomingCallOverlay`, `ActiveCallScreen`).
* **Zustand Stores:**
  * `useAuthStore`: Current user, role, SecureStore token hydration, login/logout.
  * `useListingStore`: Feed items, search/price filters, user's own listings.
  * `useChatStore`: Rooms list, unread counts, live messages.
  * `useCallStore`: Call state machine (`idle`, `outgoing`, `incoming`, `connected`), caller metadata, Zego room ID & token.

```text
mobile/src/
├── api/                  # Axios instance, interceptors, endpoint helpers
├── components/           # Reusable UI (cards, inputs, badges, modals)
├── navigation/           # Stack & tab navigators
├── screens/
│   ├── auth/             # Login, Register, RoleSelect, ForgotPassword
│   ├── main/             # Community, Map, Chats, Calls, Profile
│   └── modals/           # ListingDetail, CreateListing, ChatRoom, ActiveCall
├── services/
│   ├── socket.ts         # Socket.IO client (/chat and /calls)
│   └── zego.ts           # ZegoCloud SDK wrapper
├── store/                # Zustand stores
├── types/                # TypeScript interfaces
└── utils/                # Formatters & validation helpers
```

### 4.2 Backend Server (`server/src/`)

* **Request Pipeline:** `CORS & Helmet -> Rate Limiter -> JWT Auth Guard -> RBAC Guard -> Zod Validator -> Controller -> Service -> Prisma -> PII Mask Serializer -> JSON Response`.
* **Socket.IO Namespaces:**
  * `/chat`: Verifies JWT on handshake, maps `userId -> socketId`, joins `room_id`, saves messages to PostgreSQL before broadcasting `receive_message`.
  * `/calls`: Tracks online users (`Map<userId, Set<socketId>>`), checks `allow_calls_from` privacy rule, routes call signaling events, and updates `call_logs`.

```text
server/src/
├── config/               # Env loader, Prisma & Cloudinary clients
├── controllers/          # Route handlers
├── middlewares/          # auth, rbac, zod validate, error handler
├── routes/               # Express routers
├── services/             # Business logic (auth, listings, calls, email)
├── sockets/
│   ├── chat.socket.ts    # /chat namespace handlers
│   └── call.socket.ts    # /calls namespace handlers
├── validators/           # Zod schemas
├── utils/
│   └── piiMask.ts        # Public user allow-list serializer
├── prisma/
│   ├── schema.prisma     # Database models
│   └── seed.ts           # Demo accounts & sample listings
└── server.ts             # Entry point
```

---

## 5. Key End-to-End Flows

### 5.1 Auth, Google Sign-In & Password Reset
* **Email/Password:** Validate with Zod -> hash password via `bcrypt` (cost 10) -> return Access JWT (60m) + Refresh JWT (7d) -> store in Expo SecureStore.
* **Google Sign-In:** Mobile gets Google ID token -> `POST /api/v1/auth/google` -> backend verifies token -> if new user, returns `needsRoleSelection: true` -> user chooses role -> `PATCH /api/v1/auth/role` saves role and returns JWTs.
* **Forgot Password:** `POST /api/v1/auth/forgot-password` -> generate 6-digit OTP, store bcrypt hash in `password_reset_tokens` (10-min expiry), send via Nodemailer -> `POST /api/v1/auth/reset-password` verifies OTP, marks `used = true`, updates password hash.

### 5.2 Listing Creation & Media Upload
1. Seller/Broker picks coordinates via GPS (`expo-location`) or pin-drop on OpenStreetMap.
2. Selected images upload to `POST /api/v1/uploads/image` (Multer memory buffer -> Cloudinary -> secure URL).
3. Form submits to `POST /api/v1/listings` -> `requireRole(['seller', 'broker'])` -> Prisma writes `listings` and `listing_images` in one transaction.

### 5.3 Real-Time Chat & Meeting Rooms
1. User creates or opens a room via `POST /api/v1/rooms`.
2. Clients connect to `/chat` and emit `join_room`.
3. On `send_message`, server checks `room_participants`, persists to `messages`, and broadcasts `receive_message` with masked sender info.

### 5.4 In-App Audio & Video Calling
```text
Caller App               Backend Server          Receiver App            ZegoCloud
    |                          |                      |                      |
    |--- 1. call_initiate ---->|                      |                      |
    |   (Socket.IO /calls)     |-- 2. Privacy check   |                      |
    |                          |-- 3. Log (ringing)   |                      |
    |                          |--- 4. call_incoming >|                      |
    |                          |<-- 5. call_accept ---|                      |
    |<-- 6. call_connected ----|                      |                      |
    |--- 7. POST /calls/token ->                      |                      |
    |<-- Zego Token -----------|                      |                      |
    |                          |<-- 7. POST /token ---|                      |
    |                          |--- Zego Token ------>|                      |
    |=== 8. Join Zego Room (room_id = call_id) for Audio/Video Stream ======>|
    |<======================================================================>|
    |--- 9. call_end --------->|                      |                      |
    |                          |-- 10. Log (ended)    |                      |
    |                          |--- 11. call_ended -->|                      |
```

1. **Initiate:** Caller emits `call_initiate` on `/calls`. Server checks callee's `allow_calls_from` setting and online status.
2. **Ring:** Server writes a `call_logs` row (`ringing`) and emits `call_incoming` to the receiver with caller name, role badge, `call_id`, and `call_type`.
3. **Accept / Reject:** Reject sets status to `rejected` and notifies caller. Accept sets status to `connected` and notifies caller.
4. **Media:** Both clients request a ZegoCloud token via `POST /api/v1/calls/token` and join the Zego room using `call_id`.
5. **End:** Either user emits `call_end`, leaves the Zego room, and the server records `ended_at` in `call_logs`.

---

## 6. Database Relationships & Indexes

* `users (1) -> (N) listings` (`owner_id`), `users (1) -> (N) password_reset_tokens` (`user_id`, CASCADE).
* `listings (1) -> (N) listing_images` (`listing_id`, CASCADE), `listings (1) -> (N) rooms` (nullable `listing_id`).
* `rooms (M) <-> (N) users` via `room_participants` (composite PK `room_id, user_id`).
* `rooms (1) -> (N) messages`, `users (1) -> (N) call_logs` (`caller_id`, `receiver_id`).
* **Indexes:** Unique on `users.email` and `users.google_id`; B-Tree on `listings(owner_id, status)`, `messages(room_id, created_at)`, and `call_logs(caller_id, receiver_id, started_at)`.

---

## 7. Security & Privacy Controls

| Area | Control | Details |
| :--- | :--- | :--- |
| **Passwords** | Bcrypt | Cost factor 10; plaintext passwords never stored or logged. |
| **Sessions** | Short-lived JWTs | 60m access token + 7d refresh token stored in Expo SecureStore. |
| **RBAC** | Express Middleware | `requireRole(['seller', 'broker'])` for creation; `owner_id === req.user.id` for edit/delete (`403`). |
| **PII Masking** | DTO Serializer | Allow-list returns only `id`, `full_name`, `role`, `avatar_url`, `show_online`. |
| **Sockets** | Handshake Auth | Verifies Bearer JWT before allowing `/chat` or `/calls` connection. |
| **Calling** | Privacy Gate | Enforces `allow_calls_from` before ringing; Zego tokens scoped to `call_id`. |
| **Validation** | Zod | Enforces positive prices/areas, valid WGS84 coordinates, and image limits. |

---

## 8. Deployment & Environment Variables

* **Backend (Render):** Deployed as a single Web Service running Express + Socket.IO with a `GET /health` endpoint.
* **Database (Supabase):** Uses pooled `DATABASE_URL` (`?pgbouncer=true`) at runtime and `DIRECT_URL` for Prisma migrations.
* **Mobile (Expo EAS):** Built using the `preview` profile (`"buildType": "apk"`) to package native modules (`react-native-maps`, ZegoCloud) into an installable Android APK.

### Backend (`server/.env`)
```env
DATABASE_URL="postgresql://user:pass@ep-pooler.supabase.com/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-direct.supabase.com/db"
JWT_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
ZEGO_APP_ID="123456789"
ZEGO_SERVER_SECRET="your-zego-server-secret"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
```

### Mobile (`mobile/.env`)
```env
EXPO_PUBLIC_API_URL="https://landconnect-api.onrender.com/api/v1"
EXPO_PUBLIC_SOCKET_URL="https://landconnect-api.onrender.com"
EXPO_PUBLIC_ZEGO_APP_ID="123456789"
EXPO_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
```