import { mailer } from "../utils/mailer";

class EmailService {
  async sendRegistrationOtpEmail(to: string, fullName: string, otp: string): Promise<void> {
    const subject = "LandConnect - Verify Your Email Address";
    const { text, html } = mailer.buildOtpTemplate({
      eyebrow: "Account Verification",
      heading: `Welcome to LandConnect, ${fullName || "Member"}`,
      bodyLine:
        "Please enter the 6-digit verification code below inside the app to verify your email and activate your private LandConnect Member ID.",
      otp,
      expiryMinutes: 10,
    });

    await mailer.sendMail({ to, subject, text, html, devOtpLog: otp });
  }

  async sendPasswordResetEmail(to: string, otp: string): Promise<void> {
    const subject = "LandConnect - Password Reset Code";
    const { text, html } = mailer.buildOtpTemplate({
      eyebrow: "Security Recovery",
      heading: "Reset Your Password",
      bodyLine:
        "You requested a password reset for your LandConnect account. Use the 6-digit verification code below to proceed:",
      otp,
      expiryMinutes: 15,
    });

    await mailer.sendMail({ to, subject, text, html, devOtpLog: otp });
  }
}

export const emailService = new EmailService();
