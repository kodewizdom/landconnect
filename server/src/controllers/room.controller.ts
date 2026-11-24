import { Request, Response, NextFunction } from "express";
import { roomService } from "../services/room.service";
import { roomMessagesQuerySchema } from "../validators/room.validator";

export class RoomController {
  async createOrGetRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const room = await roomService.createOrGetRoom(req.user.id, req.body);
      res.status(201).json(room);
    } catch (err) {
      next(err);
    }
  }

  async getRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const rooms = await roomService.getRoomsForUser(req.user.id);
      res.status(200).json(rooms);
    } catch (err) {
      next(err);
    }
  }

  async getRoomMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const parsedQuery = roomMessagesQuerySchema.parse(req.query);
      const messages = await roomService.getRoomMessages(
        req.params.roomId,
        req.user.id,
        parsedQuery
      );
      res.status(200).json(messages);
    } catch (err) {
      next(err);
    }
  }

  async createMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { content } = req.body;
      if (!content || !content.trim()) {
        res.status(400).json({ error: "Content is required" });
        return;
      }
      const message = await roomService.createMessage(
        req.params.roomId,
        req.user.id,
        content.trim()
      );
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }

  async addParticipant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const updated = await roomService.addParticipant(
        req.params.roomId,
        req.user.id,
        req.body.userId
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const query = (req.query.q as string) || "";
      const role = (req.query.role as string) || "";
      const users = await roomService.searchUsers(req.user.id, query, role);
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }
}

export const roomController = new RoomController();
