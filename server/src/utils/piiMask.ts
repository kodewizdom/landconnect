import { User, Role, Listing, ListingImage } from "@prisma/client";

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

export interface FormattedListing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price: number;
  area_size: number;
  area_unit: string;
  address_text: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: Date;
  images: Array<{
    id: string;
    image_url: string;
    sort_order: number;
  }>;
  owner?: MaskedUser;
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

/**
 * Serializer for Listings ensuring owner information is strictly masked
 * and numeric types (Prisma Decimal) are formatted consistently as numbers.
 */
export function formatListing(
  listing: Listing & {
    images?: ListingImage[];
    owner?: User | MaskedUser;
  }
): FormattedListing {
  return {
    id: listing.id,
    owner_id: listing.owner_id,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    area_size: Number(listing.area_size),
    area_unit: listing.area_unit,
    address_text: listing.address_text,
    latitude: listing.latitude,
    longitude: listing.longitude,
    status: listing.status,
    created_at: listing.created_at,
    images: (listing.images || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        id: img.id,
        image_url: img.image_url,
        sort_order: img.sort_order,
      })),
    owner: listing.owner ? maskUser(listing.owner) : undefined,
  };
}
