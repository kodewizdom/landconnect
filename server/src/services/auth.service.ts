import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { Role, AuthProvider, User } from "@prisma/client";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { emailService } from "./email.service";
import { sanitizeUserSelf, UserSelfProfile } from "../utils/piiMask";
import {
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  ResetPasswordInput,
} from "../validators/auth.validator";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: UserSelfProfile;
}

export class AuthService {
  /**
   * Register a new user with email and password
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existing) {
      const error = new Error("Email is already registered");
      (error as unknown as { statusCode: number }).statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        full_name: input.name.trim(),
        password_hash: passwordHash,
        role: input.role as Role,
        auth_provider: AuthProvider.local,
      },
    });

    const tokens = this.generateTokens(user);

    return {
      tokens,
      user: sanitizeUserSelf(user),
    };
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user || !user.password_hash) {
      const error = new Error("Invalid email or password");
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      const error = new Error("Invalid email or password");
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    const tokens = this.generateTokens(user);

    return {
      tokens,
      user: sanitizeUserSelf(user),
    };
  }

  /**
   * Google Sign-In with ID token verification
   */
  async googleAuth(input: GoogleAuthInput): Promise<AuthResponse> {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: env.GOOGLE_CLIENT_ID || undefined,
      });
      payload = ticket.getPayload();
    } catch {
      const error = new Error("Invalid Google token");
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    if (!payload || !payload.email) {
      const error = new Error("Google token payload is missing email");
      (error as unknown as { statusCode: number }).statusCode = 400;
      throw error;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const fullName = payload.name || "Google User";
    const avatarUrl = payload.picture || null;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ google_id: googleId }, { email }],
      },
    });

    if (!user) {
      // Create new user with selected role (defaulting to buyer)
      user = await prisma.user.create({
        data: {
          email,
          full_name: fullName,
          google_id: googleId,
          auth_provider: AuthProvider.google,
          role: (input.role as Role) || Role.buyer,
          avatar_url: avatarUrl,
        },
      });
    } else if (!user.google_id) {
      // Link Google ID if existing account was local
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          google_id: googleId,
          avatar_url: user.avatar_url || avatarUrl,
        },
      });
    }

    const tokens = this.generateTokens(user);

    return {
      tokens,
      user: sanitizeUserSelf(user),
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(token: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      const error = new Error("Invalid or expired refresh token");
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      const error = new Error("User no longer exists");
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    return this.generateTokens(user);
  }

  /**
   * Request password reset OTP (15-min expiry)
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Safe response to prevent user enumeration
      return { message: "If an account with that email exists, a reset OTP has been sent." };
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any previous unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        user_id: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Save new token
    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        otp_hash: otpHash,
        expires_at: expiresAt,
        used: false,
      },
    });

    // Send email
    await emailService.sendPasswordResetEmail(user.email, otp);

    return { message: "Password reset OTP has been sent to your email." };
  }

  /**
   * Reset password using OTP
   */
  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const error = new Error("Invalid email or OTP");
      (error as unknown as { statusCode: number }).statusCode = 400;
      throw error;
    }

    // Find active non-expired reset token
    const tokens = await prisma.passwordResetToken.findMany({
      where: {
        user_id: user.id,
        used: false,
        expires_at: {
          gt: new Date(),
        },
      },
      orderBy: {
        expires_at: "desc",
      },
    });

    let matchedTokenId: string | null = null;
    for (const t of tokens) {
      const isMatch = await bcrypt.compare(input.otp, t.otp_hash);
      if (isMatch) {
        matchedTokenId = t.id;
        break;
      }
    }

    if (!matchedTokenId) {
      const error = new Error("Invalid or expired OTP");
      (error as unknown as { statusCode: number }).statusCode = 400;
      throw error;
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

    // Atomically update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password_hash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: matchedTokenId },
        data: { used: true },
      }),
    ]);

    return { message: "Password has been successfully reset. Please log in with your new password." };
  }

  /**
   * Get current user profile (sanitized)
   */
  async getMe(userId: string): Promise<UserSelfProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error = new Error("User not found");
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    return sanitizeUserSelf(user);
  }

  private generateTokens(user: User): AuthTokens {
    const payload = { userId: user.id, role: user.role };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }
}

export const authService = new AuthService();
