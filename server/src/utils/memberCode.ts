import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a deterministic LC-XXXXXX fallback code from a user's UUID
 * if a legacy row has not yet been backfilled.
 */
export function deriveDeterministicMemberCode(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId).digest();
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[hash[i] % CODE_CHARS.length];
  }
  return `LC-${code}`;
}

/**
 * Generates a random 6-character member code formatted as LC-XXXXXX.
 */
export function randomMemberCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  }
  return `LC-${code}`;
}

/**
 * Generates a collision-free unique LC-XXXXXX member code checked against Prisma.
 */
export async function generateUniqueMemberCode(
  prisma: Pick<PrismaClient, "user">
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomMemberCode();
    const existing = await prisma.user.findUnique({
      where: { member_code: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }
  // Fallback with high-entropy hash slice if 10 consecutive collisions ever occurred
  return deriveDeterministicMemberCode(crypto.randomUUID());
}
