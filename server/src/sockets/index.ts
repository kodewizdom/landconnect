import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { CallType, CallStatus, User, CallPermission } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import prisma from "../config/prisma";
import { maskUser } from "../utils/piiMask";

interface SocketData {
  userId: string;
  user: User;
}

let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return ioInstance;
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

    // Join personal notification channel for incoming calls and room notifications
    const userChannel = `user:${userId}`;
    socket.join(userChannel);
    console.log(`[Socket.IO] User ${user.email} (${userId}) connected on channel ${userChannel}`);

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

          // Also broadcast to each participant's user channel so their room list updates in real time
          const participants = await prisma.roomParticipant.findMany({
            where: { room_id: roomId },
            select: { user_id: true },
          });
          participants.forEach((p) => {
            io.to(`user:${p.user_id}`).emit("message:new", messagePayload);
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
          const { receiverId, roomId, callType } = data;

          const callee = await prisma.user.findUnique({
            where: { id: receiverId },
          });

          if (!callee) {
            socket.emit("call:failed", { reason: "Callee not found" });
            return;
          }

          // Privacy check: allow_calls_from
          if (callee.allow_calls_from === CallPermission.none) {
            socket.emit("call:failed", { reason: "User does not accept incoming calls" });
            return;
          }

          if (callee.allow_calls_from === CallPermission.contacts) {
            // Check if they share any common room
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
                reason: "User only accepts calls from existing contacts/rooms",
              });
              return;
            }
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

          // Send incoming call alert to the callee's personal channel
          io.to(`user:${receiverId}`).emit("call:incoming", {
            callId: callLog.id,
            caller: maskUser(callLog.caller),
            callType: callLog.call_type,
            roomId: callLog.room_id,
          });

          // Notify caller of initiation
          socket.emit("call:initiated", {
            callId: callLog.id,
            receiver: maskUser(callee),
          });
        } catch (err) {
          console.error(`[Socket.IO] Error in call:initiate:`, err);
          socket.emit("call:failed", { reason: "Failed to initiate call" });
        }
      }
    );

    // Accept Call
    socket.on("call:accept", async (data: { callId: string }) => {
      try {
        const { callId } = data;

        const callLog = await prisma.callLog.findUnique({
          where: { id: callId },
        });

        if (!callLog) {
          socket.emit("error", { message: "Call log not found" });
          return;
        }

        const updatedCall = await prisma.callLog.update({
          where: { id: callId },
          data: { status: CallStatus.connected },
        });

        // Notify both parties of call connection
        io.to(`user:${updatedCall.caller_id}`).emit("call:accepted", {
          callId: updatedCall.id,
          roomId: updatedCall.room_id,
        });

        socket.emit("call:accepted", {
          callId: updatedCall.id,
          roomId: updatedCall.room_id,
        });
      } catch (err) {
        console.error(`[Socket.IO] Error in call:accept:`, err);
      }
    });

    // Reject Call
    socket.on("call:reject", async (data: { callId: string }) => {
      try {
        const { callId } = data;

        const callLog = await prisma.callLog.findUnique({
          where: { id: callId },
        });

        if (!callLog) return;

        await prisma.callLog.update({
          where: { id: callId },
          data: {
            status: CallStatus.rejected,
            ended_at: new Date(),
          },
        });

        io.to(`user:${callLog.caller_id}`).emit("call:rejected", {
          callId: callLog.id,
        });
      } catch (err) {
        console.error(`[Socket.IO] Error in call:reject:`, err);
      }
    });

    // End Call
    socket.on("call:end", async (data: { callId: string }) => {
      try {
        const { callId } = data;

        const callLog = await prisma.callLog.findUnique({
          where: { id: callId },
        });

        if (!callLog) return;

        const endedAt = new Date();
        const durationSeconds = Math.round(
          (endedAt.getTime() - new Date(callLog.started_at).getTime()) / 1000
        );

        await prisma.callLog.update({
          where: { id: callId },
          data: {
            status: CallStatus.ended,
            ended_at: endedAt,
          },
        });

        const endPayload = {
          callId: callLog.id,
          duration_seconds: durationSeconds,
        };

        io.to(`user:${callLog.caller_id}`).emit("call:ended", endPayload);
        io.to(`user:${callLog.receiver_id}`).emit("call:ended", endPayload);
      } catch (err) {
        console.error(`[Socket.IO] Error in call:end:`, err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] User ${userId} disconnected`);
    });
  });

  return io;
}
