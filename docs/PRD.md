# LandConnect – Product Requirements Document (PRD)

**Project:** LandConnect – Land Marketplace Mobile App  
**Version:** 1.1  
**Author:** Md Sajid Khan  
**Date:** 23 November 2026  

---

## 1. Overview

Buying and selling land today is scattered across listing websites, Google Maps, and WhatsApp. Because of this, buyers, sellers, and brokers end up sharing personal phone numbers and emails right away just to ask basic questions or confirm a plot's location.

LandConnect brings the whole workflow into one mobile app with a familiar, WhatsApp-style layout: browse land listings, inspect exact locations on a map, message or join negotiation rooms, and make in-app audio/video calls without ever exposing personal contact details.

### Scope
* **In Scope:** Functional end-to-end mobile prototype covering all 7 core modules below, with top priority on reliable in-app audio and video calling.
* **Out of Scope (Future):** Online payments, escrow, government land registry / KYC checks, e-signatures, and automated property valuation.

---

## 2. User Roles & Permissions (RBAC)

There are three roles in the app:

* **Buyer:** Browses listings via feed and map, views property details, starts 1-on-1 chats, joins meeting rooms, and makes/receives in-app audio and video calls.
* **Seller:** Has all Buyer permissions, plus can create, edit, update status, and delete listings they created (`owner_id === currentUser.id`).
* **Broker:** Follows the exact same listing ownership rule as Sellers (`owner_id === currentUser.id`). Brokers carry a `Broker` badge on their profile/listings and can create and coordinate 3-way meeting rooms between buyers and sellers.

| Feature | Buyer | Seller | Broker |
| :--- | :--- | :--- | :--- |
| Register, Login & Profile | Yes | Yes | Yes |
| Browse Feed & Map | Yes | Yes | Yes |
| Create, Edit & Delete Listings | No | Yes (Own listings) | Yes (Own listings) |
| Upload Images & Geotag Location | No | Yes | Yes |
| 1-on-1 Messaging | Yes | Yes | Yes |
| Meeting Rooms | Join Only | Create & Join | Create & Join |
| Audio & Video Calling | Yes | Yes | Yes |
| Privacy Controls | Yes | Yes | Yes |

---

## 3. Functional Requirements

### 3.1 Authentication & Role Management
* **Email & Password Auth:** Register and log in with Full Name, Email, Password (hashed with `bcrypt`), and Role (`buyer`, `seller`, `broker`). Phone numbers are optional and never returned in public API responses.
* **Google Sign-In (OAuth 2.0):** One-tap login/signup with Google. First-time Google users are routed to a 1-step Role Selection screen before entering the app.
* **Forgot Password:** Sends a 6-digit OTP to the user's email via Nodemailer (Gmail App Password). The OTP expires in 10 minutes and allows setting a new password.
* **Sessions:** Access JWT (60 min) and Refresh JWT (7 days) stored securely on the device using `expo-secure-store`.
* **Access Control:** Enforced on both the UI (hiding restricted actions) and backend middleware (`401` for unauthenticated requests, `403` for unauthorized roles or non-owners).

### 3.2 Community & Land Listings Feed
* **Navigation:** 5-tab bottom bar (`Community`, `Map`, `Chats`, `Calls`, `Profile`).
* **Listing Cards:** Primary photo, title, price, land size & unit, location label, owner name with role badge, and posted time.
* **Search & Filters:** Search by keyword, filter by price range and location, with pull-to-refresh and pagination.
* **Listing Detail Screen:** Image carousel, full description, price and area breakdown, embedded mini-map with the plot pin, and buttons to Message, Audio Call, or Video Call.

### 3.3 Property Listing Management
* **Access:** Restricted to `seller` and `broker` roles.
* **Create / Edit Form:** Title, description, price, area size and unit (`sqft`, `acre`, `gunta`, `ha`), multi-image upload (camera or gallery), and map pin-drop / GPS geotagging.
* **Manage Listings:** Owners can edit details, change status (`available`, `negotiation`, `sold`), or delete their listing.
* **Validation:** Client and server validation for required fields, positive price/area values, image type/size limits, and valid latitude/longitude coordinates.

### 3.4 Maps & Geolocation
* **Map Tab:** Interactive map showing pins for active listings. Tapping a pin opens a bottom preview card (thumbnail, price, title) that links to the full listing.
* **Geotagging:** Sellers/Brokers can drop a pin on the map, use current device GPS via `expo-location`, or pick coordinates while creating/editing a listing.
* **Detail Mini-Map:** Displays the exact pin location inside each listing's detail screen.

### 3.5 Messaging & Meeting Rooms
* **1-on-1 Chat:** Started directly from a listing. Real-time delivery, timestamps, sender role badges, and typing indicators.
* **Meeting Rooms:** Multi-party chat rooms linked to a specific land listing. Sellers and Brokers can create a room, add participants, message in real time, and start audio/video calls from inside the room.
* **Persistence:** All rooms, participants, and messages are stored in PostgreSQL and synced via Socket.IO.

### 3.6 In-App Audio & Video Calling (Core Priority)
* **Capabilities:**
  1. Start audio or video calls from a listing, chat thread, meeting room, or call history.
  2. Global incoming call overlay showing caller name, role badge, call type (Audio/Video), and Accept/Reject buttons.
  3. In-call controls: mute/unmute mic, toggle camera, switch front/back camera, speaker toggle, and end call.
  4. Privacy: Calls route using internal user UUIDs and server-generated tokens—no personal phone numbers are shared or required.
* **Call States:** `idle -> outgoing -> incoming -> connected -> ended / rejected / missed / failed`.
* **Call History:** Dedicated `Calls` tab showing incoming, outgoing, and missed calls with timestamps and one-tap callback.
* **Network Reliability:** Must work reliably across different networks (e.g., Wi-Fi to 4G/5G) using ZegoCloud's managed WebRTC infrastructure.

### 3.7 Privacy & Access Control
* **PII Masking:** Emails, password hashes, and phone numbers are stripped from all public API responses and Socket.IO payloads. Only `id`, `full_name`, `role`, `avatar_url`, and `show_online` are exposed.
* **Privacy Settings:** Users can control who can call them (`everyone`, `contacts`, `none`) and toggle their online visibility.
* **Ownership Checks:** Users can only edit/delete their own listings, read rooms they belong to, and join calls they are part of.

---

## 4. Tech Stack

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| **Mobile App** | React Native (Expo Dev Client) + TypeScript | Single TypeScript codebase with native module support |
| **Navigation & State** | React Navigation + Zustand | Tab/stack navigation and lightweight global state |
| **Backend API** | Node.js (Express) + TypeScript | REST APIs, Zod validation, JWT/OAuth auth |
| **Database & ORM** | PostgreSQL (Supabase) + Prisma ORM | Managed PostgreSQL with typed schema & migrations |
| **Real-Time** | Socket.IO | 1-on-1 chat, meeting rooms, and call signaling |
| **Audio & Video Calling** | ZegoCloud SDK | Managed WebRTC/SFU audio & video calling |
| **Maps & Location** | `react-native-maps` + OpenStreetMap + `expo-location` | Interactive maps and GPS geotagging without Maps API billing |
| **Image Storage** | Cloudinary | Image uploads, optimization, and CDN delivery |
| **Email (OTP)** | Nodemailer (Gmail App Password) | 6-digit password reset emails |
| **Hosting & Build** | Render + Expo EAS Build | Cloud API hosting and standalone Android APK builds |

---

## 5. System Flow & Database Schema

### 5.1 High-Level Flow
```text
+-----------------------------------------------------------------------------------+
|                                MOBILE CLIENT                                      |
|                  React Native (Expo) + TypeScript / State: Zustand                |
|  +-------------------+  +--------------------------------+  +------------------+  |
|  | UI (Tabs & Feed)  |  | react-native-maps +            |  | ZegoCloud SDK    |  |
|  |                   |  | OpenStreetMap Tiles            |  | Media Engine     |  |
|  +---------+---------+  +---------------+----------------+  +--------+---------+  |
+------------|----------------------------|----------------------------|------------+
             | REST / Socket.IO           | Tile Requests              | Audio/Video
             v                            v                            v
+---------------------------------------------------+  +----------------------------+
|                BACKEND SERVER                     |  |  ZEGOCLOUD MEDIA SERVER    |
|         Node.js (Express) on Render               |  |  (WebRTC / SFU Relay)      |
|  +--------------------+  +---------------------+  |  |                            |
|  | Auth & RBAC Guard  |  | REST API Endpoints  |  |  |                            |
|  +--------------------+  +---------------------+  |  |                            |
|  | Socket.IO (/chat & /calls namespaces)       |  |  |                            |
|  +---------------------------------------------+  +-------------+--------------+
+--------------------+------------------------------+             |
                     |                                            | Tokens
                     v                                            v
+-----------------------------------------------------------------------------------+
|                               DATA & MEDIA LAYER                                  |
|  +---------------------------------------+  +----------------------------------+  |
|  | PostgreSQL (Supabase) via Prisma      |  | Cloudinary                       |  |
|  | (Users, Listings, Rooms, Call Logs)   |  | (Property Images)                |  |
|  +---------------------------------------+  +----------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 5.2 Database Schema (PostgreSQL)

| Table Name | Column Name | Data Type | Constraints / Attributes | Description |
| :--- | :--- | :--- | :--- | :--- |
| **users** | `id` | UUID | PK, `gen_random_uuid()` | User ID |
| | `full_name` | VARCHAR(100) | NOT NULL | Display name |
| | `email` | VARCHAR(255) | Unique, Index, NOT NULL | Login email (masked in public APIs) |
| | `google_id` | VARCHAR(255) | Unique, Nullable | Google OAuth subject ID |
| | `auth_provider` | ENUM | NOT NULL, Default: `local` (`local`, `google`) | Sign-in method |
| | `password_hash` | VARCHAR(255) | Nullable | Bcrypt password hash |
| | `role` | ENUM | NOT NULL (`buyer`, `seller`, `broker`) | User role |
| | `avatar_url` | VARCHAR(512) | Nullable | Profile picture URL |
| | `allow_calls_from` | ENUM | Default: `everyone` (`everyone`, `contacts`, `none`) | Incoming call permission |
| | `show_online` | BOOLEAN | Default: `TRUE` | Online status visibility |
| | `created_at` | TIMESTAMPTZ | Default: `NOW()` | Created timestamp |
| **password_reset_tokens** | `id` | UUID | PK, `gen_random_uuid()` | Token ID |
| | `user_id` | UUID | FK -> `users(id)` ON DELETE CASCADE | User reference |
| | `otp_hash` | VARCHAR(255) | NOT NULL | Bcrypt-hashed 6-digit OTP |
| | `expires_at` | TIMESTAMPTZ | NOT NULL | Expiry time (10 minutes) |
| | `used` | BOOLEAN | Default: `FALSE` | Whether OTP was used |
| **listings** | `id` | UUID | PK, `gen_random_uuid()` | Listing ID |
| | `owner_id` | UUID | FK -> `users(id)`, Index | Creator user ID |
| | `title` | VARCHAR(150) | NOT NULL | Listing title |
| | `description` | TEXT | NOT NULL | Property description |
| | `price` | NUMERIC(12, 2) | NOT NULL, Check (> 0) | Listing price |
| | `area_size` | NUMERIC(10, 2) | NOT NULL | Land area size |
| | `area_unit` | VARCHAR(20) | NOT NULL (`sqft`, `acre`, `gunta`, `ha`) | Area unit |
| | `address_text` | VARCHAR(255) | NOT NULL | Location label |
| | `latitude` | DOUBLE PREC. | NOT NULL | WGS84 latitude |
| | `longitude` | DOUBLE PREC. | NOT NULL | WGS84 longitude |
| | `status` | ENUM | Default: `available` (`available`, `negotiation`, `sold`) | Listing status |
| | `created_at` | TIMESTAMPTZ | Default: `NOW()` | Created timestamp |
| **listing_images** | `id` | UUID | PK | Image ID |
| | `listing_id` | UUID | FK -> `listings(id)` ON DELETE CASCADE | Listing reference |
| | `image_url` | VARCHAR(512) | NOT NULL | Cloudinary URL |
| | `sort_order` | INT | Default: 0 | Display order |
| **rooms** | `id` | UUID | PK | Room ID |
| | `type` | ENUM | NOT NULL (`direct`, `meeting_room`) | Room type |
| | `name` | VARCHAR(100) | Nullable | Meeting room name |
| | `listing_id` | UUID | FK -> `listings(id)`, Nullable | Linked listing |
| | `created_by` | UUID | FK -> `users(id)` | Room creator |
| | `created_at` | TIMESTAMPTZ | Default: `NOW()` | Created timestamp |
| **room_participants** | `room_id` | UUID | FK -> `rooms(id)` ON DELETE CASCADE | Room reference |
| | `user_id` | UUID | FK -> `users(id)` ON DELETE CASCADE | Participant reference |
| | `joined_at` | TIMESTAMPTZ | Default: `NOW()`, Composite PK (`room_id`, `user_id`) | Join timestamp |
| **messages** | `id` | UUID | PK | Message ID |
| | `room_id` | UUID | FK -> `rooms(id)`, Index | Room reference |
| | `sender_id` | UUID | FK -> `users(id)` | Sender reference |
| | `content` | TEXT | NOT NULL | Message text |
| | `created_at` | TIMESTAMPTZ | Default: `NOW()`, Index | Sent timestamp |
| **call_logs** | `id` | UUID | PK, `gen_random_uuid()` | Call log ID |
| | `caller_id` | UUID | FK -> `users(id)` | Caller reference |
| | `receiver_id` | UUID | FK -> `users(id)` | Receiver reference |
| | `room_id` | UUID | FK -> `rooms(id)`, Nullable | Linked room (if any) |
| | `call_type` | ENUM | NOT NULL (`audio`, `video`) | Audio or video |
| | `status` | ENUM | NOT NULL (`ringing`, `connected`, `rejected`, `missed`, `ended`) | Call outcome |
| | `started_at` | TIMESTAMPTZ | Default: `NOW()` | Call start time |
| | `ended_at` | TIMESTAMPTZ | Nullable | Call end time |

---

## 6. API Endpoints & Socket.IO Events

### 6.1 REST API
```text
POST   /api/v1/auth/register        -> Register (Buyer/Seller/Broker)
POST   /api/v1/auth/login           -> Login, returns Access & Refresh JWTs
POST   /api/v1/auth/google          -> Google OAuth login/signup
PATCH  /api/v1/auth/role            -> Set role for first-time Google users
POST   /api/v1/auth/forgot-password -> Send 6-digit OTP email
POST   /api/v1/auth/reset-password  -> Verify OTP and update password
GET    /api/v1/auth/me              -> Current user profile
PATCH  /api/v1/users/privacy        -> Update call & online privacy settings

GET    /api/v1/listings             -> List properties (search, price, geo bounds)
GET    /api/v1/listings/:id         -> Single listing details + masked owner info
POST   /api/v1/listings             -> Create listing [Seller / Broker]
PATCH  /api/v1/listings/:id         -> Update listing [Owner only]
DELETE /api/v1/listings/:id         -> Delete listing [Owner only]

POST   /api/v1/uploads/image        -> Upload image to Cloudinary

GET    /api/v1/rooms                -> List user's chats and meeting rooms
POST   /api/v1/rooms                -> Create 1-on-1 chat or meeting room
GET    /api/v1/rooms/:id/messages   -> Paginated message history

POST   /api/v1/calls/token          -> Generate ZegoCloud token for a call room
GET    /api/v1/calls/history        -> User's call history
```

### 6.2 Socket.IO Events
```text
// Namespace: /chat (Auth: Bearer JWT)
Client -> Server:  join_room        { room_id }
Client -> Server:  send_message     { room_id, content }
Server -> Client:  receive_message  { id, sender_id, content, timestamp }
Client -> Server:  typing_indicator { room_id, is_typing }

// Namespace: /calls (Auth: Bearer JWT)
Client -> Server:  call_initiate      { receiver_id, call_type, room_id? }
Server -> Client:  call_incoming      { call_id, caller_id, caller_name, caller_role, call_type }
Client -> Server:  call_accept        { call_id }
Client -> Server:  call_reject        { call_id, reason }
Client -> Server:  call_end           { call_id }
Server -> Client:  call_state_changed { call_id, status }
```

---

## 7. UI & Navigation

```text
+-----------------------------------------------------------------------------------+
|                                   BOTTOM TABS                                     |
+---------------+---------------+-------------------+---------------+---------------+
|  1. COMMUNITY |    2. MAP     |     3. CHATS      |   4. CALLS    |  5. PROFILE   |
+---------------+---------------+-------------------+---------------+---------------+
| - Search Bar  | - Pin Map     | - Direct Chats    | - Call Logs   | - User Info   |
| - Price Chips | - Preview Card| - Meeting Rooms   | - Quick Call  | - Role Badge  |
| - Feed Cards  | - Detail Link | - Unread Badges   |   Buttons     | - Privacy     |
| - Seller FAB  |               |                   |               | - My Listings |
+---------------+---------------+-------------------+---------------+---------------+
```

### Theme & Role Badges
* **Colors:** Light canvas (`#F8FAFC`), emerald primary (`#075E54`), accent (`#128C7E`), dark text (`#2D3748`), borders (`#E2E8F0`).
* **Role Badges:**
  * **Buyer:** `#EDF2F7` background, `#4A5568` text
  * **Seller:** `#E6F4EA` background, `#137333` text
  * **Broker:** `#FEF7E0` background, `#B06000` text

---

## 8. Non-Functional Targets
* **Security:** Bcrypt cost $\ge 10$, HTTPS/WSS in production, 60-min access JWTs, no raw emails or phone numbers in public payloads.
* **Performance:** Feed loads under 1.5s, chat messages under 500ms, call ringing setup under 2s.
* **Seed Data:** Pre-seeded accounts (`buyer@landconnect.com`, `seller@landconnect.com`, `broker@landconnect.com`) and sample listings for quick testing across roles.

---

## 9. Build Plan
* **Day 1 (Nov 23):** Project setup, Supabase + Prisma schema, Auth (JWT, Google OAuth, OTP reset), Listing CRUD, and Cloudinary uploads.
* **Day 2 (Nov 24):** Community feed, OpenStreetMap integration, Socket.IO chat & meeting rooms, ZegoCloud audio/video calling, and cross-network call testing.
* **Day 3 (Nov 25):** Bug fixes, UI polish, Render deployment, EAS Android APK build, and walkthrough recording.