import { apiClient } from "./client";
import { CallLog, CallHistoryResponse } from "../types/chat";

export interface ZegoTokenResponse {
  token: string;
  appId: number;
  roomId: string;
  userId: string;
}

export const callApi = {
  async getToken(roomId: string): Promise<ZegoTokenResponse> {
    const response = await apiClient.post<ZegoTokenResponse>("/calls/token", {
      roomId,
    });
    return response.data;
  },

  async getHistory(page = 1, limit = 20): Promise<CallHistoryResponse> {
    const response = await apiClient.get<any>("/calls/history", {
      params: { page, limit },
    });

    const resData = response.data;

    // Server returns { data: FormattedCallLog[], pagination: { total, page, limit, totalPages } }
    let rawCalls: CallLog[] = [];
    if (Array.isArray(resData)) {
      rawCalls = resData;
    } else if (Array.isArray(resData?.data)) {
      rawCalls = resData.data;
    } else if (Array.isArray(resData?.calls)) {
      rawCalls = resData.calls;
    }

    const total =
      resData?.pagination?.total ?? resData?.total ?? rawCalls.length;
    const totalPages =
      resData?.pagination?.totalPages ?? resData?.totalPages ?? 1;

    return {
      calls: rawCalls,
      total,
      page,
      limit,
      totalPages,
    };
  },
};
