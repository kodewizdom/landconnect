import { apiClient } from "./client";
import { Room, Message, RoomParticipant, UserSearchResult } from "../types/chat";

export interface CreateRoomPayload {
  listingId?: string;
  participantIds: string[];
  type?: "direct" | "group";
  title?: string;
}

export interface PaginatedMessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const roomApi = {
  async createOrGetRoom(payload: CreateRoomPayload): Promise<Room> {
    const response = await apiClient.post<Room>("/rooms", payload);
    return response.data;
  },

  async getRooms(): Promise<Room[]> {
    const response = await apiClient.get<any>("/rooms");
    const data = response.data;
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  },

  async getRoomMessages(
    roomId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedMessagesResponse> {
    const response = await apiClient.get<any>(`/rooms/${roomId}/messages`, {
      params: { page, limit },
    });

    const res = response.data;
    // Server returns { data: FormattedMessage[], pagination: { total, page, limit, totalPages } }
    let rawMessages: Message[] = [];
    if (Array.isArray(res)) {
      rawMessages = res;
    } else if (Array.isArray(res?.data)) {
      rawMessages = res.data;
    } else if (Array.isArray(res?.messages)) {
      rawMessages = res.messages;
    }

    const total = res?.pagination?.total ?? res?.total ?? rawMessages.length;
    const totalPages = res?.pagination?.totalPages ?? res?.totalPages ?? 1;

    return {
      messages: rawMessages,
      total,
      page,
      limit,
      totalPages,
    };
  },

  async sendMessage(roomId: string, content: string): Promise<Message> {
    const response = await apiClient.post<Message>(`/rooms/${roomId}/messages`, {
      content,
    });
    return response.data;
  },

  async addParticipant(roomId: string, userId: string): Promise<RoomParticipant> {
    const response = await apiClient.post<RoomParticipant>(
      `/rooms/${roomId}/participants`,
      { userId }
    );
    return response.data;
  },

  async searchUsers(query = "", role = ""): Promise<UserSearchResult[]> {
    const response = await apiClient.get<UserSearchResult[]>("/users/search", {
      params: { q: query, role },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async getRecentContacts(): Promise<UserSearchResult[]> {
    const response = await apiClient.get<UserSearchResult[]>("/users/recent");
    return Array.isArray(response.data) ? response.data : [];
  },
};
