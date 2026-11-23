export interface MaskedUser {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  show_online: boolean;
}

/**
 * PII Masking Serializer
 * Whitelists only non-sensitive public user attributes.
 * Strips email, password_hash, phone numbers, and google_id.
 */
export function maskUser(user: {
  id: string;
  full_name: string;
  role: string;
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
