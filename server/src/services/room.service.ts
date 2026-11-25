import { RoomType, Role } from "@prisma/client";
import prisma from "../config/prisma";
import { maskUser, MaskedUser } from "../utils/piiMask";
import { CreateRoomInput, RoomMessagesQueryInput } from "../validators/room.validator";
import { getIO } from "../sockets";

export interface FormattedRoom {
  id: string;
  type: string;
  name: string | null;
  listing_id: string | null;
  created_by: string;
  created_at: Date;
  listing?: {
    id: string;
    title: string;
    price: number;
    address_text: string;
  } | null;
  participants: Array<{
    user_id: string;
    joined_at: Date;
    user: MaskedUser;
  }>;
  latest_message?: {
    id: string;
    content: string;
    created_at: Date;
    sender: MaskedUser;
  } | null;
}

export interface FormattedMessage {
  id: string;
  room_id: string;
  content: string;
  created_at: Date;
  sender: MaskedUser;
}

export class RoomService {
  /**
   * Create or return an existing 1-on-1 direct room, or create a group negotiation room
   */
  async createOrGetRoom(currentUserId: string, data: CreateRoomInput): Promise<FormattedRoom> {
    const isDirect = data.type === "direct";

    if (isDirect) {
      const targetUserId =
        data.participantIds.find((id) => id !== currentUserId) || data.participantIds[0];

      // Check if 1-on-1 direct room already exists between these users (linked to listing if provided)
      const existingRoom = await prisma.room.findFirst({
        where: {
          type: RoomType.direct,
          ...(data.listingId ? { listing_id: data.listingId } : {}),
          AND: [
            { participants: { some: { user_id: currentUserId } } },
            { participants: { some: { user_id: targetUserId } } },
          ],
        },
        include: {
          listing: {
            select: { id: true, title: true, price: true, address_text: true },
          },
          participants: {
            include: { user: true },
          },
          messages: {
            take: 1,
            orderBy: { created_at: "desc" },
            include: { sender: true },
          },
        },
      });

      if (existingRoom) {
        return this.formatRoom(existingRoom);
      }

      // Create new direct room
      const distinctUsers = Array.from(new Set([currentUserId, targetUserId]));
      const newRoom = await prisma.room.create({
        data: {
          type: RoomType.direct,
          created_by: currentUserId,
          listing_id: data.listingId || null,
          participants: {
            create: distinctUsers.map((uid) => ({ user_id: uid })),
          },
        },
        include: {
          listing: {
            select: { id: true, title: true, price: true, address_text: true },
          },
          participants: {
            include: { user: true },
          },
          messages: {
            take: 1,
            orderBy: { created_at: "desc" },
            include: { sender: true },
          },
        },
      });

      const formatted = this.formatRoom(newRoom);
      const io = getIO();
      if (io) {
        distinctUsers.forEach((uid) => {
          io.to(`user:${uid}`).emit("room:created", formatted);
        });
      }

      return formatted;
    }

    // Multi-party meeting room
    const distinctUsers = Array.from(new Set([currentUserId, ...data.participantIds]));
    const roomName = data.title || data.name || "Negotiation Room";

    const newMeetingRoom = await prisma.room.create({
      data: {
        type: RoomType.meeting_room,
        name: roomName,
        created_by: currentUserId,
        listing_id: data.listingId || null,
        participants: {
          create: distinctUsers.map((uid) => ({ user_id: uid })),
        },
      },
      include: {
        listing: {
          select: { id: true, title: true, price: true, address_text: true },
        },
        participants: {
          include: { user: true },
        },
        messages: {
          take: 1,
          orderBy: { created_at: "desc" },
          include: { sender: true },
        },
      },
    });

    const formatted = this.formatRoom(newMeetingRoom);
    const io = getIO();
    if (io) {
      distinctUsers.forEach((uid) => {
        io.to(`user:${uid}`).emit("room:created", formatted);
      });
    }

    return formatted;
  }

  /**
   * List all rooms the user belongs to, including latest message preview and masked participants
   */
  async getRoomsForUser(userId: string): Promise<FormattedRoom[]> {
    const rooms = await prisma.room.findMany({
      where: {
        participants: {
          some: { user_id: userId },
        },
      },
      orderBy: { created_at: "desc" },
      include: {
        listing: {
          select: { id: true, title: true, price: true, address_text: true },
        },
        participants: {
          include: { user: true },
        },
        messages: {
          take: 1,
          orderBy: { created_at: "desc" },
          include: { sender: true },
        },
      },
    });

    return rooms.map((room) => this.formatRoom(room));
  }

  /**
   * Get paginated message history for a room (validates participation first)
   */
  async getRoomMessages(
    roomId: string,
    userId: string,
    query: RoomMessagesQueryInput
  ): Promise<{
    data: FormattedMessage[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
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

    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [total, messages] = await Promise.all([
      prisma.message.count({ where: { room_id: roomId } }),
      prisma.message.findMany({
        where: { room_id: roomId },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { sender: true },
      }),
    ]);

    return {
      data: messages.map((m) => ({
        id: m.id,
        room_id: m.room_id,
        content: m.content,
        created_at: m.created_at,
        sender: maskUser(m.sender),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * REST message send fallback
   */
  async createMessage(
    roomId: string,
    userId: string,
    content: string
  ): Promise<FormattedMessage> {
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

    const savedMessage = await prisma.message.create({
      data: {
        room_id: roomId,
        sender_id: userId,
        content: content.trim(),
      },
      include: { sender: true },
    });

    const formatted: FormattedMessage = {
      id: savedMessage.id,
      room_id: savedMessage.room_id,
      content: savedMessage.content,
      created_at: savedMessage.created_at,
      sender: maskUser(savedMessage.sender),
    };

    const io = getIO();
    if (io) {
      io.to(`room:${roomId}`).emit("message:new", formatted);
      const participants = await prisma.roomParticipant.findMany({
        where: { room_id: roomId },
        select: { user_id: true },
      });
      participants.forEach((p) => {
        io.to(`user:${p.user_id}`).emit("message:new", formatted);
      });
    }

    return formatted;
  }

  /**
   * Add participant to a room (allowed for room creator or brokers)
   */
  async addParticipant(roomId: string, currentUserId: string, newUserId: string): Promise<FormattedRoom> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        creator: true,
        participants: true,
      },
    });

    if (!room) {
      const error = new Error("Room not found");
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    const isCreator = room.created_by === currentUserId;
    const isBroker = currentUser?.role === Role.broker;

    if (!isCreator && !isBroker) {
      const error = new Error("Forbidden: Only the room creator or a broker can add participants");
      (error as unknown as { statusCode: number }).statusCode = 403;
      throw error;
    }

    // Check if new user is already a participant
    const alreadyParticipant = room.participants.some((p) => p.user_id === newUserId);
    if (!alreadyParticipant) {
      await prisma.roomParticipant.create({
        data: {
          room_id: roomId,
          user_id: newUserId,
        },
      });
    }

    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        listing: {
          select: { id: true, title: true, price: true, address_text: true },
        },
        participants: {
          include: { user: true },
        },
        messages: {
          take: 1,
          orderBy: { created_at: "desc" },
          include: { sender: true },
        },
      },
    });

    const formatted = this.formatRoom(updatedRoom!);
    const io = getIO();
    if (io) {
      io.to(`user:${newUserId}`).emit("room:created", formatted);
      io.to(`room:${roomId}`).emit("room:updated", formatted);
    }

    return formatted;
  }

  /**
   * Search registered users for Brokers by Name or LandConnect ID (zero PII)
   */
  async searchUsers(
    currentUserId: string,
    query: string,
    role?: string
  ): Promise<ReturnType<typeof maskUser>[]> {
    const trimmed = query.trim();
    const strippedCode = trimmed.toUpperCase().replace(/^LC-/, "");
    const roleFilter =
      role === "buyer" || role === "seller" || role === "broker"
        ? (role as Role)
        : undefined;

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(trimmed
          ? {
              OR: [
                { full_name: { contains: trimmed, mode: "insensitive" } },
                { member_code: { contains: trimmed, mode: "insensitive" } },
                ...(strippedCode
                  ? [{ member_code: { contains: strippedCode, mode: "insensitive" as const } }]
                  : []),
              ],
            }
          : {}),
      },
      take: 20,
      orderBy: { full_name: "asc" },
    });

    return users.map(maskUser);
  }

  /**
   * Return masked recent contacts from the user's existing rooms
   */
  async getRecentContacts(currentUserId: string): Promise<ReturnType<typeof maskUser>[]> {
    const myRooms = await prisma.roomParticipant.findMany({
      where: { user_id: currentUserId },
      select: { room_id: true },
      orderBy: { joined_at: "desc" },
      take: 30,
    });

    const roomIds = myRooms.map((r) => r.room_id);
    if (roomIds.length === 0) {
      return [];
    }

    const coParticipants = await prisma.roomParticipant.findMany({
      where: {
        room_id: { in: roomIds },
        user_id: { not: currentUserId },
      },
      include: { user: true },
      orderBy: { joined_at: "desc" },
      take: 40,
    });

    const seen = new Set<string>();
    const contacts: ReturnType<typeof maskUser>[] = [];
    for (const participant of coParticipants) {
      if (!seen.has(participant.user.id)) {
        seen.add(participant.user.id);
        contacts.push(maskUser(participant.user));
        if (contacts.length >= 15) {
          break;
        }
      }
    }

    return contacts;
  }

  private formatRoom(room: any): FormattedRoom {
    const latestMsg = room.messages && room.messages.length > 0 ? room.messages[0] : null;

    return {
      id: room.id,
      type: room.type,
      name: room.name,
      listing_id: room.listing_id,
      created_by: room.created_by,
      created_at: room.created_at,
      listing: room.listing
        ? {
            id: room.listing.id,
            title: room.listing.title,
            price: Number(room.listing.price),
            address_text: room.listing.address_text,
          }
        : null,
      participants: (room.participants || []).map((p: any) => ({
        user_id: p.user_id,
        joined_at: p.joined_at,
        user: maskUser(p.user),
      })),
      latest_message: latestMsg
        ? {
            id: latestMsg.id,
            content: latestMsg.content,
            created_at: latestMsg.created_at,
            sender: maskUser(latestMsg.sender),
          }
        : null,
    };
  }
}

export const roomService = new RoomService();
