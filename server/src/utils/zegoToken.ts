import crypto from "crypto";
import { env } from "../config/env";

export interface ZegoTokenOptions {
  appId: number;
  serverSecret: string;
  userId: string;
  roomId?: string;
  effectiveTimeInSeconds?: number;
}

/**
 * Generates a standard ZegoCloud Token04 using AES-128-CBC encryption.
 * The token format conforms to Zego's official client SDK Token04 specs.
 */
export function generateZegoToken({
  appId,
  serverSecret,
  userId,
  roomId,
  effectiveTimeInSeconds = 3600,
}: ZegoTokenOptions): string {
  // If credentials are dummy/placeholder in development, return a mock token
  if (!serverSecret || serverSecret === "your-zego-server-secret" || !appId || appId === 123456789) {
    const mockPayload = Buffer.from(
      JSON.stringify({
        app_id: appId || 123456789,
        user_id: userId,
        room_id: roomId || "general",
        created_at: Date.now(),
      })
    ).toString("base64");
    return `04mock_${mockPayload}`;
  }

  const createTime = Math.floor(Date.now() / 1000);
  const expireTime = createTime + effectiveTimeInSeconds;
  const nonce = crypto.randomInt(-2147483648, 2147483647);

  const payloadObject = {
    room_id: roomId || "",
    privilege: {
      1: 1, // LoginRoom
      2: 1, // PublishStream
    },
    stream_id_list: null,
  };

  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce,
    ctime: createTime,
    expire: expireTime,
    payload: JSON.stringify(payloadObject),
  };

  const plainText = JSON.stringify(tokenInfo);

  // Generate 16-byte random IV
  const iv = crypto.randomBytes(16);

  // Zego secret key: 16 bytes (derived from first 16 characters or 16 bytes of secret)
  const key = Buffer.from(serverSecret.substring(0, 16), "utf-8");

  // AES-128-CBC encryption with PKCS7 padding
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()]);

  // Pack binary data:
  // 8 bytes: expireTime (BigInt64BE)
  // 2 bytes: iv length (UInt16BE)
  // 16 bytes: iv
  // 2 bytes: encrypted content length (UInt16BE)
  // N bytes: encrypted ciphertext
  const expireBuf = Buffer.alloc(8);
  expireBuf.writeBigInt64BE(BigInt(expireTime), 0);

  const ivLenBuf = Buffer.alloc(2);
  ivLenBuf.writeUInt16BE(iv.length, 0);

  const cipherLenBuf = Buffer.alloc(2);
  cipherLenBuf.writeUInt16BE(encrypted.length, 0);

  const packedBuffer = Buffer.concat([expireBuf, ivLenBuf, iv, cipherLenBuf, encrypted]);

  // Zego Token04 format: "04" prefix + base64 encoded buffer
  return "04" + packedBuffer.toString("base64");
}

export function generateTokenForUser(userId: string, roomId?: string): {
  token: string;
  appId: number;
  roomId?: string;
  userId: string;
} {
  const appId = env.ZEGO_APP_ID ? parseInt(env.ZEGO_APP_ID, 10) : 123456789;
  const serverSecret = env.ZEGO_SERVER_SECRET || "your-zego-server-secret";

  const token = generateZegoToken({
    appId,
    serverSecret,
    userId,
    roomId,
    effectiveTimeInSeconds: 3600,
  });

  return {
    token,
    appId,
    roomId,
    userId,
  };
}
