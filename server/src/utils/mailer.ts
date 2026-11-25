import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

interface SendEmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  devOtpLog?: string;
}

class Mailer {
  private smtpTransporter: Transporter | null = null;

  private getSmtpTransporter(): Transporter | null {
    if (this.smtpTransporter) return this.smtpTransporter;
    if (env.SMTP_USER && env.SMTP_PASS && env.SMTP_USER !== "your-email@gmail.com") {
      this.smtpTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      return this.smtpTransporter;
    }
    return null;
  }

  /**
   * Sends transactional email via Brevo HTTP API (HTTPS port 443 — works on Render free tier),
   * falling back to Nodemailer SMTP only if BREVO_API_KEY is absent.
   */
  async sendMail({ to, subject, text, html, devOtpLog }: SendEmailPayload): Promise<void> {
    const fromEmail = env.EMAIL_FROM || env.SMTP_USER || "no-reply@landconnect.com";

    // Primary: Brevo Transactional HTTP API
    if (env.BREVO_API_KEY && !env.BREVO_API_KEY.startsWith("xkeysib-your")) {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: "LandConnect Security", email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`[Mailer] Brevo API error (${response.status}):`, errText);
        throw new Error("Failed to dispatch verification email via Brevo.");
      }

      console.log(`[Mailer] Email sent via Brevo HTTP API to ${to}`);
      return;
    }

    // Fallback: Nodemailer SMTP when BREVO_API_KEY is not configured
    const transporter = this.getSmtpTransporter();
    if (!transporter) {
      console.warn(
        `[Mailer] Neither BREVO_API_KEY nor SMTP credentials configured. Target: ${to}${
          devOtpLog ? ` | Dev OTP: [${devOtpLog}]` : ""
        }`
      );
      return;
    }

    try {
      await transporter.sendMail({
        from: `"LandConnect Security" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(`[Mailer] Email sent via SMTP fallback to ${to}`);
    } catch (error) {
      console.error(`[Mailer] SMTP fallback failed for ${to}:`, error);
      if (devOtpLog) {
        console.warn(`[Mailer Fallback] OTP for ${to}: [${devOtpLog}]`);
      }
      throw new Error("Failed to send email");
    }
  }

  buildOtpTemplate(params: {
    eyebrow: string;
    heading: string;
    bodyLine: string;
    otp: string;
    expiryMinutes: number;
  }): { text: string; html: string } {
    const { eyebrow, heading, bodyLine, otp, expiryMinutes } = params;
    const text = `${heading}\n\n${bodyLine}\n\nYour 6-digit verification code: ${otp}\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request this, you can safely ignore this email.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #F8F7F4; padding: 24px; border-radius: 16px;">
        <div style="background: #0B2B26; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <div style="color: #C5A059; font-size: 22px; font-weight: 700; letter-spacing: 4px;">LANDCONNECT</div>
          <div style="color: #A0A8A6; font-size: 11px; letter-spacing: 1.5px; margin-top: 4px; text-transform: uppercase;">${eyebrow}</div>
        </div>
        <div style="background: #FFFFFF; padding: 28px 24px; border-radius: 0 0 12px 12px; border: 1px solid #E6E2D8; border-top: none;">
          <h2 style="color: #181C1B; font-size: 18px; margin: 0 0 12px 0;">${heading}</h2>
          <p style="color: #636B69; font-size: 14px; line-height: 21px; margin: 0 0 24px 0;">${bodyLine}</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 30px; font-weight: 700; letter-spacing: 8px; padding: 14px 28px; background: #F5EDD8; color: #0B2B26; border-radius: 10px; border: 1.5px solid #C5A059;">
              ${otp}
            </span>
          </div>
          <p style="color: #636B69; font-size: 13px; margin: 0 0 16px 0;">This verification code expires in <strong>${expiryMinutes} minutes</strong>.</p>
          <p style="color: #A0A8A6; font-size: 12px; margin: 20px 0 0 0; border-top: 1px solid #E6E2D8; padding-top: 14px;">
            If you did not request this verification, please disregard this message. Zero personal contact details are ever shared publicly on LandConnect.
          </p>
        </div>
      </div>
    `;
    return { text, html };
  }
}

export const mailer = new Mailer();
