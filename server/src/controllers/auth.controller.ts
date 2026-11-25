import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

export class AuthController {
  async requestRegistrationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestRegistrationOtp(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyRegistrationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyRegistrationOtp(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.googleAuth(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refreshToken(req.body.refreshToken);
      res.status(200).json(tokens);
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resetPassword(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const profile = await authService.getMe(req.user.id);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
