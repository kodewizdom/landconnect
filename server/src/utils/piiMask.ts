import { User, Role } from "@prisma/client";

export interface MaskedUser {
  id: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  show_online: boolean;
}

export interface UserSelfProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  allow_calls_from: string;
  show_online: boolean;
  created_at: Date;
}

/**
 * PII Masking Serializer
 * Whitelists only non-sensitive public user attributes for public feeds, chats, and calls.
 * Strips email, password_hash, phone numbers, and google_id.
 */
export function maskUser(user: {
  id: string;
  full_name: string;
  role: Role;
  avatar_url?: string | null;
  show_online?: boolean;
}): MaskedUser {
  return {
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    avatar_url: user.avatar_url ?? null,
    show_online: user.show_online ?? true,
  };
}

/**
 * Serializer for the authenticated user's own profile.
 * Strips password_hash and internal auth credentials.
 */
export function sanitizeUserSelf(user: User): UserSelfProfile {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
    allow_calls_from: user.allow_calls_from,
    show_online: user.show_online,
    created_at: user.created_at,
  };
}
