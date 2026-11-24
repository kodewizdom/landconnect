import { Router } from "express";
import { roomController } from "../controllers/room.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import {
  createRoomSchema,
  addParticipantSchema,
} from "../validators/room.validator";

const router = Router();

// Protected: All room endpoints require authentication
router.post(
  "/",
  authMiddleware,
  validateBody(createRoomSchema),
  (req, res, next) => roomController.createOrGetRoom(req, res, next)
);

router.get(
  "/",
  authMiddleware,
  (req, res, next) => roomController.getRooms(req, res, next)
);

router.get(
  "/:roomId/messages",
  authMiddleware,
  (req, res, next) => roomController.getRoomMessages(req, res, next)
);

router.post(
  "/:roomId/participants",
  authMiddleware,
  validateBody(addParticipantSchema),
  (req, res, next) => roomController.addParticipant(req, res, next)
);

export default router;
