import { Request, Response, NextFunction } from "express";
import { callService } from "../services/call.service";
import { callHistoryQuerySchema } from "../validators/call.validator";

export class CallController {
  async getToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const tokenData = await callService.generateToken(req.user.id, req.body.roomId);
      res.status(200).json(tokenData);
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const parsedQuery = callHistoryQuerySchema.parse(req.query);
      const history = await callService.getCallHistory(req.user.id, parsedQuery);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  }
}

export const callController = new CallController();
