import { apiClient } from "./client";

export interface CreateRoomPayload {
  listingId?: string;
  participantIds: string[];
  type?: "direct" | "group" | "meeting_room";
  title?: string;
}

export const roomApi = {
  async createOrGetRoom(payload: CreateRoomPayload) {
    const response = await apiClient.post("/rooms", payload);
    return response.data;
  },

  async getRooms() {
    const response = await apiClient.get("/rooms");
    return response.data;
  },

  async getRoomMessages(roomId: string, page = 1, limit = 30) {
    const response = await apiClient.get(`/rooms/${roomId}/messages`, {
      params: { page, limit },
    });
    return response.data;
  },
};
