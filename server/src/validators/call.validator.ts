import { z } from "zod";

export const tokenRequestSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
});

export const callHistoryQuerySchema = z.object({
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1).max(100).default(20)),
});

export type TokenRequestInput = z.infer<typeof tokenRequestSchema>;
export type CallHistoryQueryInput = z.infer<typeof callHistoryQuerySchema>;
