import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "./logger";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM_ADDRESS = "Equity Trading Bot <no-reply@equitytradingbot.com>";

/** Returns true if the email was actually delivered, false if it fell back to simulation. */
export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  if (!resend) {
    logger.info(`[simulated email] Verification code for ${to}: ${code}`);
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Verify your email - Equity Trading Bot",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #111;">Verify your email</h2>
          <p style="color: #444;">Use the code below to verify your Equity Trading Bot account. This code expires in 15 minutes.</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111; margin: 24px 0;">${code}</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (result.error) {
      logger.error(`Resend rejected verification email to ${to}: ${JSON.stringify(result.error)}`);
      logger.info(`[fallback] Verification code for ${to}: ${code}`);
      return false;
    }
    logger.info(`Verification email sent to ${to} (id: ${result.data?.id})`);
    return true;
  } catch (err) {
    logger.error(`Failed to send verification email to ${to}: ${err}`);
    logger.info(`[fallback] Verification code for ${to}: ${code}`);
    return false;
  }
}
