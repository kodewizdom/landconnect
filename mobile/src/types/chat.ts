export type RoomType = "direct" | "group" | "meeting_room";
export type ParticipantRole = "buyer" | "seller" | "broker";

export interface MaskedUser {
  id: string;
  full_name: string;
  role: ParticipantRole;
  avatar_url: string | null;
  is_verified?: boolean;
}

export interface RoomParticipant {
  id?: string;
  room_id?: string;
  user_id: string;
  role?: ParticipantRole;
  joined_at: string;
  user: MaskedUser;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id?: string;
  content: string;
  created_at: string;
  sender: MaskedUser;
}

export interface RoomListingSummary {
  id: string;
  title: string;
  price: number;
  address_text?: string;
  cover_image?: string | null;
}

export interface Room {
  id: string;
  name: string | null;
  type: RoomType;
  listing_id: string | null;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  listing?: RoomListingSummary | null;
  participants: RoomParticipant[];
  messages?: Message[];
  latest_message?: Message | null;
  lastMessage?: Message | null;
}

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "connected" | "missed" | "rejected" | "ended";

export interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  room_id: string | null;
  call_type: CallType;
  status: CallStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds?: number;
  caller: MaskedUser;
  receiver: MaskedUser;
  room?: {
    id: string;
    name: string | null;
    type: string;
  } | null;
}

export interface CallHistoryResponse {
  calls: CallLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSearchResult {
  id: string;
  email: string;
  full_name: string;
  role: ParticipantRole;
  avatar_url: string | null;
}
