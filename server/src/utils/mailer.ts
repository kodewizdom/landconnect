import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html: string;
  devOtpLog?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    const resolvedText =
      text && text.trim().length > 0 ? text.trim() : stripHtmlToPlainText(html);

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
          sender: { name: "LandConnect", email: fromEmail },
          replyTo: { email: fromEmail, name: "LandConnect" },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: resolvedText,
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
        from: `"LandConnect" <${fromEmail}>`,
        replyTo: fromEmail,
        to,
        subject,
        text: resolvedText,
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
    greeting: string;
    bodyLine: string;
    otp: string;
    expiryMinutes?: number;
  }): { text: string; html: string } {
    const expiryMinutes = params.expiryMinutes ?? 10;
    const greeting = params.greeting.trim();
    const bodyLine = params.bodyLine.trim();
    const otp = params.otp.trim();

    const text = [
      greeting,
      "",
      bodyLine,
      "",
      `Verification code: ${otp}`,
      "",
      `This 6-digit code expires in ${expiryMinutes} minutes.`,
      "If you did not request this email, you can safely ignore it.",
      "",
      "LandConnect Team",
    ].join("\n");

    const safeGreeting = escapeHtml(greeting);
    const safeBodyLine = escapeHtml(bodyLine);
    const safeOtp = escapeHtml(otp);

    const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <div style="max-width:500px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#0b2b26;">LandConnect</p>
      <p style="margin:0 0 12px 0;font-size:14px;color:#1f2937;">${safeGreeting}</p>
      <p style="margin:0 0 18px 0;font-size:14px;color:#374151;">${safeBodyLine}</p>
      <p style="margin:0 0 18px 0;padding:12px 16px;background-color:#f9fafb;border:1px solid #d1d5db;border-radius:6px;font-size:24px;font-weight:700;letter-spacing:6px;color:#111827;text-align:center;">${safeOtp}</p>
      <p style="margin:0 0 10px 0;font-size:13px;color:#4b5563;">This 6-digit code expires in ${expiryMinutes} minutes.</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">If you did not request this email, you can safely ignore it.</p>
    </div>
  </body>
</html>`.trim();

    return { text, html };
  }
}

export const mailer = new Mailer();
