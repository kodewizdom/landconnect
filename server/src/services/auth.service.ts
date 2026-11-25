import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { Role, AuthProvider, User } from "@prisma/client";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { emailService } from "./email.service";
import { sanitizeUserSelf, UserSelfProfile } from "../utils/piiMask";
import { generateUniqueMemberCode } from "../utils/memberCode";
import { validateGenuineEmail } from "../utils/emailValidator";
import {
  RegisterInput,
  RequestRegisterOtpInput,
  VerifyRegisterOtpInput,
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
   * Step 1 of verified signup: validate genuine non-disposable email + MX records,
   * store temporary PendingRegistration, and email a 6-digit OTP via Brevo HTTP API.
   */
  async requestRegistrationOtp(
    input: RequestRegisterOtpInput
  ): Promise<{ message: string; email: string }> {
    const normalizedEmail = await validateGenuineEmail(input.email);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const error = new Error("Email is already registered. Please sign in.");
      (error as unknown as { statusCode: number }).statusCode = 409;
      throw error;
    }

    const existingPending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingPending) {
      const elapsedMs = Date.now() - new Date(existingPending.last_sent_at).getTime();
      if (elapsedMs < 30_000) {
        const waitSecs = Math.max(1, Math.ceil((30_000 - elapsedMs) / 1000));
        const error = new Error(
          `Please wait ${waitSecs} seconds before requesting another verification code.`
        );
        (error as unknown as { statusCode: number }).statusCode = 429;
        throw error;
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const trimmedName = input.name.trim();

    await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      update: {
        full_name: trimmedName,
        password_hash: passwordHash,
        role: input.role as Role,
        otp_hash: otpHash,
        expires_at: expiresAt,
        last_sent_at: new Date(),
      },
      create: {
        email: normalizedEmail,
        full_name: trimmedName,
        password_hash: passwordHash,
        role: input.role as Role,
        otp_hash: otpHash,
        expires_at: expiresAt,
        last_sent_at: new Date(),
      },
    });

    try {
      await emailService.sendRegistrationOtpEmail(normalizedEmail, trimmedName, otp);
    } catch (emailErr) {
      // Clear pending row on email dispatch failure so user can retry right away
      await prisma.pendingRegistration
        .delete({ where: { email: normalizedEmail } })
        .catch(() => {});
      throw emailErr;
    }

    return {
      message: "Verification code sent to your email.",
      email: normalizedEmail,
    };
  }

  /**
   * Step 2 of verified signup: validate 6-digit OTP, create User with unique LC-XXXXXX code,
   * delete temporary PendingRegistration, and return auth tokens.
   */
  async verifyRegistrationOtp(input: VerifyRegisterOtpInput): Promise<AuthResponse> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      const error = new Error(
        "No pending registration found for this email. Please request a new code."
      );
      (error as unknown as { statusCode: number }).statusCode = 400;
      throw error;
    }

    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      const error = new Error("Verification code has expired. Please request a new code.");
      (error as unknown as { statusCode: number }).statusCode = 400;
      throw error;
    }

    const isOtpValid = await bcrypt.compare(input.otp.trim(), pending.otp_hash);
    if (!isOtpValid) {
      const error = new Error("Invalid verification code. Please double-check and try again.");
      (error as unknown as { statusCode: number }).statusCode = 400;
      throw error;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
      const error = new Error("Email is already registered. Please sign in.");
      (error as unknown as { statusCode: number }).statusCode = 409;
      throw error;
    }

    const memberCode = await generateUniqueMemberCode(prisma);

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: normalizedEmail,
          full_name: pending.full_name,
          password_hash: pending.password_hash,
          role: pending.role,
          member_code: memberCode,
          auth_provider: AuthProvider.local,
        },
      }),
      prisma.pendingRegistration.delete({
        where: { id: pending.id },
      }),
    ]);

    const tokens = this.generateTokens(user);

    return {
      tokens,
      user: sanitizeUserSelf(user),
    };
  }

  /**
   * Direct register endpoint (validates genuine email and assigns unique member_code)
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const normalizedEmail = await validateGenuineEmail(input.email);

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      const error = new Error("Email is already registered");
      (error as unknown as { statusCode: number }).statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const memberCode = await generateUniqueMemberCode(prisma);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        full_name: input.name.trim(),
        password_hash: passwordHash,
        role: input.role as Role,
        member_code: memberCode,
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
   * Login with email and password (demo accounts & existing accounts preserved cleanly)
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    let user = await prisma.user.findUnique({
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

    // Opportunistically ensure legacy user has an assigned member_code
    if (!user.member_code) {
      const memberCode = await generateUniqueMemberCode(prisma);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { member_code: memberCode },
      });
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
      const memberCode = await generateUniqueMemberCode(prisma);
      user = await prisma.user.create({
        data: {
          email,
          full_name: fullName,
          google_id: googleId,
          auth_provider: AuthProvider.google,
          role: (input.role as Role) || Role.buyer,
          member_code: memberCode,
          avatar_url: avatarUrl,
        },
      });
    } else if (!user.google_id || !user.member_code) {
      const memberCode = user.member_code || (await generateUniqueMemberCode(prisma));
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          google_id: user.google_id || googleId,
          member_code: memberCode,
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
   * Request password reset OTP (10-min expiry)
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { message: "If an account with that email exists, a reset OTP has been sent." };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetToken.updateMany({
      where: {
        user_id: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        otp_hash: otpHash,
        expires_at: expiresAt,
        used: false,
      },
    });

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
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error = new Error("User not found");
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    if (!user.member_code) {
      const memberCode = await generateUniqueMemberCode(prisma);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { member_code: memberCode },
      });
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
