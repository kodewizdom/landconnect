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
 * Generates a random 16-byte ASCII IV matching ZegoCloud's Token04 specification.
 */
function makeRandomIv(): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

/**
 * Determines the AES-CBC algorithm from ZegoCloud ServerSecret length (16/24/32 bytes).
 * Standard ZegoCloud console ServerSecrets are 32 bytes -> AES-256-CBC.
 */
function getAlgorithm(keyBuffer: Buffer): string {
  switch (keyBuffer.length) {
    case 16:
      return "aes-128-cbc";
    case 24:
      return "aes-192-cbc";
    case 32:
      return "aes-256-cbc";
    default:
      throw new Error(
        `Invalid ZEGO_SERVER_SECRET length: ${keyBuffer.length} bytes (expected 16, 24, or 32)`
      );
  }
}

/**
 * Generates a standard ZegoCloud Token04 using AES-128/192/256-CBC encryption
 * matching ZEGOCLOUD's official zegoServerAssistant specification.
 */
export function generateZegoToken({
  appId,
  serverSecret,
  userId,
  roomId,
  effectiveTimeInSeconds = 3600,
}: ZegoTokenOptions): string {
  if (!serverSecret || serverSecret === "your-zego-server-secret" || !appId || appId === 123456789) {
    throw new Error("ZegoCloud credentials (ZEGO_APP_ID / ZEGO_SERVER_SECRET) are not configured on the server.");
  }

  const createTime = Math.floor(Date.now() / 1000);
  const expireTime = createTime + effectiveTimeInSeconds;
  const nonce = crypto.randomInt(-2147483648, 2147483647);

  const payloadObject = {
    room_id: roomId || "",
    privilege: {
      "1": 1, // LoginRoom
      "2": 1, // PublishStream (Audio & Video)
    },
    stream_id_list: null,
  };

  const tokenInfo = {
    app_id: Number(appId),
    user_id: String(userId),
    nonce,
    ctime: createTime,
    expire: expireTime,
    payload: JSON.stringify(payloadObject),
  };

  const plainText = JSON.stringify(tokenInfo);

  // Full secret key buffer (e.g. 32 bytes for standard Zego ServerSecret -> AES-256-CBC)
  const key = Buffer.from(serverSecret, "utf-8");
  const algorithm = getAlgorithm(key);

  // 16-byte random IV
  const ivStr = makeRandomIv();
  const iv = Buffer.from(ivStr, "utf-8");

  // AES-CBC encryption with PKCS7 padding
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()]);

  // Pack binary data per Zego Token04 spec:
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
  const appId = env.ZEGO_APP_ID ? parseInt(env.ZEGO_APP_ID, 10) : 0;
  const serverSecret = env.ZEGO_SERVER_SECRET || "";

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
