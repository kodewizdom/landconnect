import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_USER && env.SMTP_PASS && env.SMTP_USER !== "your-email@gmail.com") {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  async sendPasswordResetEmail(to: string, otp: string): Promise<void> {
    const subject = "LandConnect - Password Reset OTP";
    const text = `Your OTP for resetting your LandConnect password is: ${otp}. This code is valid for 15 minutes. If you did not request a password reset, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2e7d32; text-align: center;">LandConnect</h2>
        <p>Hello,</p>
        <p>You requested a password reset for your LandConnect account. Please use the 6-digit verification code below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background: #f0f7f0; color: #1b5e20; border-radius: 6px; border: 1px dashed #2e7d32;">
            ${otp}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in <strong>15 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not make this request, you can safely ignore this email.</p>
      </div>
    `;

    if (!this.transporter) {
      console.warn(`[EmailService] SMTP credentials not configured. Development OTP for ${to}: [${otp}]`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"LandConnect Security" <${env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`[EmailService] Password reset email sent to ${to}`);
    } catch (error) {
      console.error(`[EmailService] Error sending email to ${to}:`, error);
      // Fallback log in case email provider fails in sandbox
      console.warn(`[EmailService Fallback] OTP for ${to}: [${otp}]`);
      throw new Error("Failed to send password reset email");
    }
  }
}

export const emailService = new EmailService();
