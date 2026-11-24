import { Router } from "express";
import { callController } from "../controllers/call.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { tokenRequestSchema } from "../validators/call.validator";

const router = Router();

// Protected: All call endpoints require authentication
router.post(
  "/token",
  authMiddleware,
  validateBody(tokenRequestSchema),
  (req, res, next) => callController.getToken(req, res, next)
);

router.get(
  "/history",
  authMiddleware,
  (req, res, next) => callController.getHistory(req, res, next)
);

export default router;
