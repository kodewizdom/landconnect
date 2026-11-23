# LandConnect Project Rules (Google Antigravity)

## Source of Truth
Always follow the specifications in @docs/PRD.md and @docs/ARCHITECTURE.md. Do not deviate from the locked-in 100% free-tier stack.

## Locked-In Tech Stack
- Backend (`server/`): Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (Supabase), Socket.IO, Zod, bcrypt, jsonwebtoken, Multer, Cloudinary, Nodemailer.
- Mobile (`mobile/`): React Native (Expo Dev Client), TypeScript, React Navigation, Zustand, Axios, Expo SecureStore, react-native-maps (OpenStreetMap tiles), expo-location, socket.io-client, ZegoCloud SDK.

## Non-Negotiable Engineering Rules
1. Strict TypeScript everywhere. No `any` unless unavoidable.
2. Zero PII exposure: NEVER return `email`, `password_hash`, or phone numbers in public listing, chat, or call payloads. Always use a dedicated `piiMask` DTO serializer.
3. Dual-layer RBAC: Buyers cannot create/edit/delete listings. Sellers and Brokers can only edit/delete listings where `owner_id === currentUser.id`. Return HTTP 401 for unauthenticated and HTTP 403 for unauthorized requests.
4. Never commit `.env` files. Always maintain `.env.example` with dummy placeholder values.
5. Work strictly on the single phase requested in the current prompt. Do not jump ahead to future phases.
6. After completing a phase, verify that TypeScript compiles cleanly (`npm run build` or `npx tsc --noEmit`) and summarize the files created/changed.