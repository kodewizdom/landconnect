import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import {
  registerSchema,
  requestRegisterOtpSchema,
  verifyRegisterOtpSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";

const router = Router();

// Public auth endpoints
router.post(
  "/register/request-otp",
  validateBody(requestRegisterOtpSchema),
  (req, res, next) => authController.requestRegistrationOtp(req, res, next)
);

router.post(
  "/register/verify-otp",
  validateBody(verifyRegisterOtpSchema),
  (req, res, next) => authController.verifyRegistrationOtp(req, res, next)
);

router.post("/register", validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post("/login", validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.post("/google", validateBody(googleAuthSchema), (req, res, next) =>
  authController.googleAuth(req, res, next)
);

router.post("/refresh", validateBody(refreshTokenSchema), (req, res, next) =>
  authController.refreshToken(req, res, next)
);

router.post("/forgot-password", validateBody(forgotPasswordSchema), (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

router.post("/reset-password", validateBody(resetPasswordSchema), (req, res, next) =>
  authController.resetPassword(req, res, next)
);

// Protected auth endpoints
router.get("/me", authMiddleware, (req, res, next) =>
  authController.getMe(req, res, next)
);

export default router;
