# LandConnect — AI Usage & Engineering Report

## Executive Summary
This document provides a transparent, comprehensive account of how Artificial Intelligence tools and models were utilized throughout the lifecycle of the **LandConnect** mobile marketplace and backend platform. AI assistance was engaged across planning, system architecture, full-stack implementation, bug diagnosis, UI redesign, and test verification, working under strict non-negotiable engineering constraints (100% free-tier stack, zero PII exposure, and strict dual-layer RBAC).

---

## 1. AI Tooling & Models Used

| Tool / Model | Primary Application |
|---|---|
| **Google Antigravity Agentic Platform** | Project orchestration, workspace search, batch file editing, terminal execution, and multi-step verification workflows. |
| **Claude 3.5 Sonnet / 4.6 (Anthropic via Antigravity)** | High-level system architecture, PRD drafting, complex TypeScript typing, luxury UI/UX design system formulation. |
| **Gemini 3.8 Flash (Google DeepMind via Antigravity)** | Fast iterative implementation, regex refactoring, build error diagnosis, and whole-codebase typecheck verification. |

---

## 2. Phase-by-Phase Application

### Phase 1: Planning & Architectural Synthesis
- **Scope & Constraints Formulation**: AI assisted in translating project goals into @docs/PRD.md and @docs/ARCHITECTURE.md, enforcing strict adherence to a 100% free-tier architecture (Supabase PostgreSQL, Cloudinary, Nodemailer, Render, Expo EAS, and ZegoCloud free tier).
- **Zero-PII Access Controls**: Structured data access rules preventing phone number and email leaks in public listing, chat, and call payloads using a dedicated `piiMask` serializer.
- **Dual-Layer RBAC Matrix**: Designed role-based permissions (Buyer, Seller, Broker) with middleware enforcement (`401` unauthenticated, `403` unauthorized) and ownership boundaries (`owner_id === currentUser.id`).

### Phase 2: Backend Architecture & Implementation
- **Schema & Migrations**: Designed Prisma schema models (`User`, `Listing`, `ListingImage`, `Room`, `RoomParticipant`, `Message`, `CallLog`) with optimized foreign key indexes.
- **Real-Time Signaling (Socket.IO)**: Built bidirectional event handlers for room joining, live typing indicators, instant messaging with database persistence, and peer-to-peer call signaling (`call:initiate`, `call:accepted`, `call:rejected`, `call:ended`).
- **ZegoCloud Token04 Engine**: Generated cryptographically signed, short-lived ZegoCloud authentication tokens (`server/src/utils/zegoToken.ts`) for authorized room participants without exposing server secrets.

### Phase 3: Mobile Architecture & Complex Problem Solving
- **Android SDK 58 FormData Workaround**:
  - *Problem*: Expo SDK 58's native networking module failed with `Unsupported FormDataPart implementation` on Android when submitting multipart photo uploads via Axios or `fetch()`.
  - *Diagnosis & AI Solution*: AI traced the issue to how React Native's native C++ Networking module deserializes `{ uri, name, type }` parts. Implemented a resilient, pure `XMLHttpRequest` client with primitive string coercion, solving upload failures without external libraries.
- **Android Soft Keyboard Insets & Edge-to-Edge Layout**:
  - *Problem*: Edge-to-edge Android devices running Gboard covered the chat input bar and AM/PM timestamps.
  - *Diagnosis & AI Solution*: Bypassed buggy Android `KeyboardAvoidingView` implementations by dynamically binding `paddingBottom` directly to `Keyboard.addListener('keyboardDidShow')` with an additional `insets.bottom + 12` offset, lifting the input bar completely above Gboard's top toolbar.
- **Hermes 12-Hour Timestamp Normalization**:
  - *Problem*: React Native's Hermes engine truncated `toLocaleTimeString()` into ambiguous tokens (e.g. `1:33 ...` or `3:47 p`).
  - *Diagnosis & AI Solution*: Authored a zero-dependency date arithmetic helper in `src/utils/dateFormat.ts` (`hours % 12 || 12`, `padStart(2, '0')`, explicit `'AM' | 'PM'`), accompanied by `flexShrink: 0` and `minWidth: 64` styling.

### Phase 4: Luxury UI/UX Redesign (Sotheby's Aesthetic)
- **Design System Formulation**: Crafted an elevated private-wealth real estate design system (`src/theme/`) featuring Estate Emerald (`#0B2B26`), Warm Alabaster (`#F8F7F4`), Pure Ivory (`#FFFFFF`), and Brushed Champagne Gold (`#C5A059`).
- **Zero-Emoji Elimination**: Audited the entire mobile application using regex and automated scripts, replacing all emojis with crisp `@expo/vector-icons` (`Ionicons` / `MaterialCommunityIcons`).
- **Tabular INR Formatting**: Standardized Indian Rupee formatting (`formatINR`) to display values cleanly as `₹X.XX Lakh` or `₹X.XX Cr`.

### Phase 5: Production & Native Build Readiness
- **Dual-Mode Calling Architecture**:
  - *Expo Go Mode*: Renders a simulated luxury call stage with live timers and Socket.IO signaling to ensure zero crashes in development client environments.
  - *EAS Standalone APK Mode*: Dynamically mounts `@zegocloud/zego-uikit-prebuilt-call-rn` using `EXPO_PUBLIC_ZEGO_APP_ID` and the backend `Token04` response, backed by Android hardware permissions in `app.json`.
- **Render Backend Deployment Setup**: Configured `server/src/index.ts`, `"postinstall": "prisma generate"`, and `"start": "node dist/index.js"` for zero-configuration PaaS deployment.

---

## 3. Human-in-the-Loop Verification & Quality Control

All AI-generated code underwent strict verification gates before integration:
1. **TypeScript Zero-Error Rule**: Every major change was validated with `npx tsc --noEmit` across both `mobile/` and `server/`.
2. **Security & PII Audits**: Manual inspection verified that no endpoint or serializer exposes sensitive user emails, password hashes, or phone numbers.
3. **Live Device & Metro Testing**: Tested on physical Android devices via Expo Go to verify camera permissions, map rendering, GPS location acquisition, and real-time socket communication.
4. **Environment Isolation**: Maintained clean `.env.example` templates with placeholder keys to prevent credential leaks.
