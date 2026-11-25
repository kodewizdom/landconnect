import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roomController } from "../controllers/room.controller";

const router = Router();

router.get("/search", authMiddleware, (req, res, next) =>
  roomController.searchUsers(req, res, next)
);

router.get("/recent", authMiddleware, (req, res, next) =>
  roomController.getRecentContacts(req, res, next)
);

export default router;
