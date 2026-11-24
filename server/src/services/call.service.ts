import prisma from "../config/prisma";
import { generateTokenForUser } from "../utils/zegoToken";
import { maskUser, MaskedUser } from "../utils/piiMask";
import { CallHistoryQueryInput } from "../validators/call.validator";

export interface FormattedCallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  room_id: string | null;
  call_type: string;
  status: string;
  started_at: Date;
  ended_at: Date | null;
  duration_seconds?: number;
  caller: MaskedUser;
  receiver: MaskedUser;
  room?: {
    id: string;
    name: string | null;
    type: string;
  } | null;
}

export class CallService {
  /**
   * Validate participation and generate short-lived ZegoCloud Token04
   */
  async generateToken(userId: string, roomId: string): Promise<{
    token: string;
    appId: number;
    roomId: string;
    userId: string;
  }> {
    // Verify room exists and user is an authorized participant
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        room_id_user_id: {
          room_id: roomId,
          user_id: userId,
        },
      },
    });

    if (!participant) {
      const error = new Error("Forbidden: You are not a participant in this room");
      (error as unknown as { statusCode: number }).statusCode = 403;
      throw error;
    }

    const tokenData = generateTokenForUser(userId, roomId);

    return {
      token: tokenData.token,
      appId: tokenData.appId,
      roomId,
      userId,
    };
  }

  /**
   * Get call logs history for user with masked contact details
   */
  async getCallHistory(userId: string, query: CallHistoryQueryInput): Promise<{
    data: FormattedCallLog[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { caller_id: userId },
        { receiver_id: userId },
        {
          room: {
            participants: {
              some: { user_id: userId },
            },
          },
        },
      ],
    };

    const [total, logs] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { started_at: "desc" },
        include: {
          caller: true,
          receiver: true,
          room: {
            select: { id: true, name: true, type: true },
          },
        },
      }),
    ]);

    return {
      data: logs.map((log) => {
        let durationSeconds: number | undefined;
        if (log.ended_at && log.started_at) {
          durationSeconds = Math.round(
            (new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 1000
          );
        }

        return {
          id: log.id,
          caller_id: log.caller_id,
          receiver_id: log.receiver_id,
          room_id: log.room_id,
          call_type: log.call_type,
          status: log.status,
          started_at: log.started_at,
          ended_at: log.ended_at,
          duration_seconds: durationSeconds,
          caller: maskUser(log.caller),
          receiver: maskUser(log.receiver),
          room: log.room,
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const callService = new CallService();
