import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { CallType, CallStatus, User, CallPermission } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import prisma from "../config/prisma";
import { maskUser, MaskedUser } from "../utils/piiMask";

interface SocketData {
  userId: string;
  user: User;
}

interface IncomingCallPayload {
  callId: string;
  caller: MaskedUser;
  callType: CallType;
  roomId: string | null;
}

interface PendingCallEntry {
  callId: string;
  callerId: string;
  targetUserId: string;
  incomingPayload: IncomingCallPayload;
  expiresAt: number;
  timer: NodeJS.Timeout;
}

const PENDING_CALL_TTL_MS = 45_000;

let ioInstance: SocketIOServer | null = null;
const onlineUsers = new Map<string, Set<string>>();
const pendingCalls = new Map<string, PendingCallEntry>();

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

function addOnlineSocket(userId: string, socketId: string): void {
  let sockets = onlineUsers.get(userId);
  if (!sockets) {
    sockets = new Set<string>();
    onlineUsers.set(userId, sockets);
  }
  sockets.add(socketId);
}

function removeOnlineSocket(userId: string, socketId: string): void {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
}

function emitToUser(
  io: SocketIOServer,
  userId: string,
  event: string,
  payload: unknown
): number {
  const sockets = onlineUsers.get(userId);
  if (!sockets || sockets.size === 0) {
    return 0;
  }
  let delivered = 0;
  sockets.forEach((sid) => {
    io.to(sid).emit(event, payload);
    delivered += 1;
  });
  return delivered;
}

function clearPendingCallById(callId: string): void {
  for (const [uid, entry] of pendingCalls.entries()) {
    if (entry.callId === callId) {
      clearTimeout(entry.timer);
      pendingCalls.delete(uid);
    }
  }
}

function storePendingCall(
  targetUserId: string,
  callId: string,
  callerId: string,
  incomingPayload: IncomingCallPayload
): void {
  const existing = pendingCalls.get(targetUserId);
  if (existing) {
    clearTimeout(existing.timer);
    pendingCalls.delete(targetUserId);
  }

  const expiresAt = Date.now() + PENDING_CALL_TTL_MS;
  const timer = setTimeout(() => {
    const current = pendingCalls.get(targetUserId);
    if (current && current.callId === callId) {
      pendingCalls.delete(targetUserId);
    }
  }, PENDING_CALL_TTL_MS);

  pendingCalls.set(targetUserId, {
    callId,
    callerId,
    targetUserId,
    incomingPayload,
    expiresAt,
    timer,
  });
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization;

      if (!authHeader) {
        return next(new Error("Authentication error: Token required"));
      }

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.data = {
        userId: user.id,
        user,
      } as SocketData;

      next();
    } catch {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const { userId, user } = socket.data as SocketData;

    // Track every active socket ID per user and join personal notification room
    addOnlineSocket(userId, socket.id);
    const userChannel = `user:${userId}`;
    socket.join(userChannel);
    console.log(
      `[Socket.IO] User ${user.email} (${userId}) connected (${socket.id}); active sockets=${
        onlineUsers.get(userId)?.size || 0
      }`
    );

    // Re-emit any active ringing call so minimized/reopened clients catch incoming calls right away
    const pendingForUser = pendingCalls.get(userId);
    if (pendingForUser) {
      if (Date.now() < pendingForUser.expiresAt) {
        socket.emit("call:incoming", pendingForUser.incomingPayload);
      } else {
        clearTimeout(pendingForUser.timer);
        pendingCalls.delete(userId);
      }
    }

    // --- Chat Events ---

    // Join chat/meeting room
    socket.on("room:join", async (roomId: string) => {
      try {
        const isParticipant = await prisma.roomParticipant.findUnique({
          where: {
            room_id_user_id: {
              room_id: roomId,
              user_id: userId,
            },
          },
        });

        if (isParticipant) {
          socket.join(`room:${roomId}`);
          console.log(`[Socket.IO] User ${userId} joined room:${roomId}`);
        } else {
          socket.emit("error", { message: "Cannot join room: Not a participant" });
        }
      } catch (err) {
        console.error(`[Socket.IO] Error in room:join:`, err);
      }
    });

    // Leave chat/meeting room
    socket.on("room:leave", (roomId: string) => {
      socket.leave(`room:${roomId}`);
      console.log(`[Socket.IO] User ${userId} left room:${roomId}`);
    });

    // Send and persist message
    socket.on(
      "message:send",
      async (data: { roomId: string; content: string }) => {
        try {
          const { roomId, content } = data;
          if (!roomId || !content || content.trim() === "") return;

          const isParticipant = await prisma.roomParticipant.findUnique({
            where: {
              room_id_user_id: {
                room_id: roomId,
                user_id: userId,
              },
            },
          });

          if (!isParticipant) {
            socket.emit("error", { message: "Forbidden: Not a participant in this room" });
            return;
          }

          const savedMessage = await prisma.message.create({
            data: {
              room_id: roomId,
              sender_id: userId,
              content: content.trim(),
            },
            include: { sender: true },
          });

          const messagePayload = {
            id: savedMessage.id,
            room_id: savedMessage.room_id,
            content: savedMessage.content,
            created_at: savedMessage.created_at,
            sender: maskUser(savedMessage.sender),
          };

          // Broadcast message:new to everyone currently in the room
          io.to(`room:${roomId}`).emit("message:new", messagePayload);

          // Broadcast to every active socket of each participant so their room list updates in real time
          const participants = await prisma.roomParticipant.findMany({
            where: { room_id: roomId },
            select: { user_id: true },
          });
          participants.forEach((p) => {
            emitToUser(io, p.user_id, "message:new", messagePayload);
          });
        } catch (err) {
          console.error(`[Socket.IO] Error in message:send:`, err);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // Typing indicators
    socket.on("typing:start", (roomId: string) => {
      socket.to(`room:${roomId}`).emit("typing:start", {
        roomId,
        userId,
        user: maskUser(user),
      });
    });

    socket.on("typing:stop", (roomId: string) => {
      socket.to(`room:${roomId}`).emit("typing:stop", {
        roomId,
        userId,
      });
    });

    // --- Call Signaling Events ---

    // Initiate Call
    socket.on(
      "call:initiate",
      async (data: {
        receiverId: string;
        roomId?: string;
        callType: "audio" | "video";
      }) => {
        try {
          const { receiverId, roomId, callType } = data || {};

          if (!receiverId) {
            socket.emit("call:failed", { reason: "Callee ID is required." });
            return;
          }

          const callee = await prisma.user.findUnique({
            where: { id: receiverId },
          });

          if (!callee) {
            socket.emit("call:failed", { reason: "Callee not found." });
            return;
          }

          // Privacy check: allow_calls_from
          if (callee.allow_calls_from === CallPermission.none) {
            socket.emit("call:failed", { reason: "User does not accept incoming calls." });
            return;
          }

          if (callee.allow_calls_from === CallPermission.contacts) {
            const sharedRoom = await prisma.roomParticipant.findFirst({
              where: {
                user_id: userId,
                room: {
                  participants: {
                    some: { user_id: receiverId },
                  },
                },
              },
            });

            if (!sharedRoom) {
              socket.emit("call:failed", {
                reason: "User only accepts calls from existing contacts or negotiation rooms.",
              });
              return;
            }
          }

          // Determine all recipients (handles both 1-on-1 direct & 3-way group meetings)
          let notifyUserIds: string[] = [receiverId];
          if (roomId) {
            const roomParticipants = await prisma.roomParticipant.findMany({
              where: { room_id: roomId, user_id: { not: userId } },
              select: { user_id: true },
            });
            if (roomParticipants.length > 0) {
              notifyUserIds = Array.from(
                new Set([receiverId, ...roomParticipants.map((p) => p.user_id)])
              );
            }
          }

          // Fail clearly if no target recipient currently has an active socket
          const hasAnyOnlineRecipient = notifyUserIds.some(
            (targetId) => (onlineUsers.get(targetId)?.size || 0) > 0
          );

          if (!hasAnyOnlineRecipient) {
            socket.emit("call:failed", {
              reason: `${callee.full_name} is currently offline or has the app closed.`,
            });
            return;
          }

          // Persist call log with status ringing
          const callLog = await prisma.callLog.create({
            data: {
              caller_id: userId,
              receiver_id: receiverId,
              room_id: roomId || null,
              call_type: callType === "video" ? CallType.video : CallType.audio,
              status: CallStatus.ringing,
            },
            include: {
              caller: true,
              receiver: true,
            },
          });

          const incomingPayload: IncomingCallPayload = {
            callId: callLog.id,
            caller: maskUser(callLog.caller),
            callType: callLog.call_type,
            roomId: callLog.room_id,
          };

          // Cache pending ringing call (45s TTL) & emit to every active socket of each recipient
          notifyUserIds.forEach((targetId) => {
            storePendingCall(targetId, callLog.id, userId, incomingPayload);
            emitToUser(io, targetId, "call:incoming", incomingPayload);
          });

          // Notify caller of initiation across their active sockets
          socket.emit("call:initiated", {
            callId: callLog.id,
            roomId: callLog.room_id,
            receiver: maskUser(callee),
          });
        } catch (err) {
          console.error(`[Socket.IO] Error in call:initiate:`, err);
          socket.emit("call:failed", { reason: "Failed to initiate call." });
        }
      }
    );

    // Accept Call
    socket.on("call:accept", async (data: { callId: string }) => {
      try {
        const { callId } = data || {};
        if (!callId) return;

        const callLog = await prisma.callLog.findUnique({
          where: { id: callId },
        });

        if (!callLog) {
          socket.emit("error", { message: "Call log not found" });
          return;
        }

        clearPendingCallById(callId);

        const updatedCall = await prisma.callLog.update({
          where: { id: callId },
          data: { status: CallStatus.connected },
        });

        const acceptedPayload = {
          callId: updatedCall.id,
          roomId: updatedCall.room_id,
        };

        emitToUser(io, updatedCall.caller_id, "call:accepted", acceptedPayload);
        emitToUser(io, updatedCall.receiver_id, "call:accepted", acceptedPayload);
        if (updatedCall.receiver_id !== userId) {
          emitToUser(io, userId, "call:accepted", acceptedPayload);
        }
      } catch (err) {
        console.error(`[Socket.IO] Error in call:accept:`, err);
      }
    });

    // Reject Call
    socket.on("call:reject", async (data: { callId: string }) => {
      try {
        const { callId } = data || {};
        if (!callId) return;

        const callLog = await prisma.callLog.findUnique({
          where: { id: callId },
        });

        if (!callLog) return;

        clearPendingCallById(callId);

        await prisma.callLog.update({
          where: { id: callId },
          data: {
            status: CallStatus.rejected,
            ended_at: new Date(),
          },
        });

        emitToUser(io, callLog.caller_id, "call:rejected", {
          callId: callLog.id,
        });
        emitToUser(io, callLog.receiver_id, "call:rejected", {
          callId: callLog.id,
        });
      } catch (err) {
        console.error(`[Socket.IO] Error in call:reject:`, err);
      }
    });

    // End or Cancel Call
    const handleEndOrCancelCall = async (data: { callId?: string; roomId?: string }) => {
      try {
        const { callId, roomId } = data || {};

        let callLog = callId
          ? await prisma.callLog.findUnique({ where: { id: callId } })
          : null;

        // Fallback lookup when caller cancels before call:initiated arrives
        if (!callLog && roomId) {
          callLog = await prisma.callLog.findFirst({
            where: {
              room_id: roomId,
              status: { in: [CallStatus.ringing, CallStatus.connected] },
              OR: [{ caller_id: userId }, { receiver_id: userId }],
            },
            orderBy: { started_at: "desc" },
          });
        }

        if (!callLog) return;

        clearPendingCallById(callLog.id);

        const wasRinging = callLog.status === CallStatus.ringing;
        const endedAt = new Date();
        const durationSeconds = wasRinging
          ? 0
          : Math.round(
              (endedAt.getTime() - new Date(callLog.started_at).getTime()) / 1000
            );

        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            status:
              wasRinging && callLog.caller_id === userId
                ? CallStatus.missed
                : CallStatus.ended,
            ended_at: endedAt,
          },
        });

        const endPayload = {
          callId: callLog.id,
          roomId: callLog.room_id,
          duration_seconds: durationSeconds,
          cancelled: wasRinging,
        };

        // Determine all participants notified during initiation (1-on-1 or 3-way group)
        let targetUserIds: string[] = [callLog.caller_id, callLog.receiver_id];
        if (callLog.room_id) {
          const participants = await prisma.roomParticipant.findMany({
            where: { room_id: callLog.room_id },
            select: { user_id: true },
          });
          if (participants.length > 0) {
            targetUserIds = Array.from(
              new Set([...targetUserIds, ...participants.map((p) => p.user_id)])
            );
          }
        }

        targetUserIds.forEach((uid) => {
          emitToUser(io, uid, "call:ended", endPayload);
          if (wasRinging) {
            emitToUser(io, uid, "call:cancelled", endPayload);
          }
        });
      } catch (err) {
        console.error(`[Socket.IO] Error in call:end/cancel:`, err);
      }
    };

    socket.on("call:end", handleEndOrCancelCall);
    socket.on("call:cancel", handleEndOrCancelCall);

    socket.on("disconnect", () => {
      removeOnlineSocket(userId, socket.id);
      console.log(
        `[Socket.IO] Socket ${socket.id} for user ${userId} disconnected; remaining sockets=${
          onlineUsers.get(userId)?.size || 0
        }`
      );
    });
  });

  return io;
}
