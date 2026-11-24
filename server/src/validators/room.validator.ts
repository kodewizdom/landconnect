import { z } from "zod";

export const createRoomSchema = z.object({
  type: z.enum(["direct", "group", "meeting_room"]).default("direct"),
  title: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  listingId: z.string().uuid("Invalid listing ID").optional(),
  participantIds: z.array(z.string().uuid("Invalid participant user ID")).min(1, "At least one participant is required"),
});

export const addParticipantSchema = z.object({
  userId: z.string().uuid("Invalid user ID to add"),
});

export const roomMessagesQuerySchema = z.object({
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 30), z.number().int().min(1).max(100).default(30)),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type RoomMessagesQueryInput = z.infer<typeof roomMessagesQuerySchema>;
