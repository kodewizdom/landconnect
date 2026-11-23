# LandConnect – Land Marketplace Mobile Application

A privacy-first, WhatsApp-inspired mobile marketplace for **Buyers**, **Sellers**, and **Brokers** to discover land listings on an interactive map, manage properties, communicate in real-time via 1-on-1 chats and meeting rooms, and make in-app audio/video calls without exposing personal phone numbers.

## Core Features
- **Authentication & RBAC:** Email/Password login, Google Sign-In (with 1-step role selection), Forgot Password (6-digit Email OTP), and strict Buyer/Seller/Broker role permissions.
- **Community Feed & Listing Management:** Browse land listings with search/price filters; Sellers and Brokers can create, edit, and delete their own listings with multi-image uploads.
- **Maps & Geolocation:** Interactive OpenStreetMap view with property pins, preview cards, and GPS/pin-drop geotagging.
- **Messaging & Meeting Rooms:** Real-time 1-on-1 chat and multi-party negotiation meeting rooms powered by Socket.IO.
- **In-App Audio & Video Calling:** End-to-end audio/video calling (initiate, ring, accept, reject, mute, camera toggle, end) powered by ZegoCloud SDK with zero phone number exposure.
- **Privacy & Access Control:** Strict PII masking across all APIs and user-configurable call/online privacy settings.

## Tech Stack (100% Free Tier)
- **Mobile:** React Native (Expo Dev Client), TypeScript, React Navigation, Zustand, `react-native-maps` (OpenStreetMap), ZegoCloud SDK
- **Backend:** Node.js, Express, TypeScript, Socket.IO, Prisma ORM, Zod, Nodemailer
- **Database & Storage:** PostgreSQL (Supabase), Cloudinary
- **Hosting & Build:** Render (Backend), Expo EAS Build (Android APK)

## Project Structure
- `docs/` – Product Requirements Document (`PRD.md`) and System Architecture (`ARCHITECTURE.md`)
- `server/` – Node.js + Express + Prisma + Socket.IO backend
- `mobile/` – React Native (Expo) + TypeScript mobile app

## Demo Accounts (Pre-Seeded)
| Role | Email | Password |
| :--- | :--- | :--- |
| **Buyer** | `buyer@landconnect.com` | `Password@123` |
| **Seller** | `seller@landconnect.com` | `Password@123` |
| **Broker** | `broker@landconnect.com` | `Password@123` |

## Local Setup & Execution

### 1. Backend (`server/`)
```bash
cd server
npm install
cp .env.example .env   # Fill in your Supabase, Cloudinary, ZegoCloud, Google, and SMTP keys
npx prisma migrate dev
npx prisma db seed
npm run dev