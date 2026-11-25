import { mailer } from "../utils/mailer";

class EmailService {
  async sendRegistrationOtpEmail(to: string, fullName: string, otp: string): Promise<void> {
    const subject = "Your LandConnect Verification Code";
    const displayName = fullName?.trim() || "Member";
    const { text, html } = mailer.buildOtpTemplate({
      greeting: `Hello ${displayName},`,
      bodyLine:
        "Use the 6-digit verification code below to confirm your email address and complete your LandConnect account registration:",
      otp,
      expiryMinutes: 10,
    });

    await mailer.sendMail({ to, subject, text, html, devOtpLog: otp });
  }

  async sendPasswordResetEmail(to: string, otp: string): Promise<void> {
    const subject = "Your LandConnect Password Reset Code";
    const { text, html } = mailer.buildOtpTemplate({
      greeting: "Hello,",
      bodyLine:
        "Use the 6-digit verification code below to reset the password for your LandConnect account:",
      otp,
      expiryMinutes: 10,
    });

    await mailer.sendMail({ to, subject, text, html, devOtpLog: otp });
  }
}

export const emailService = new EmailService();
