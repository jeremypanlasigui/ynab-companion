import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT = "ynab-companion-app-storage-salt-v1";

let cachedKey: Buffer | null = null;

/**
 * Resolve or auto-generate the 256-bit encryption key.
 * If ENCRYPTION_KEY is not defined in environment variables,
 * a cryptographically secure 32-byte random key is generated and
 * saved to .env.local automatically.
 */
export function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  let rawKey = process.env.ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    const envLocalPath = path.join(process.cwd(), ".env.local");
    try {
      if (fs.existsSync(envLocalPath)) {
        const content = fs.readFileSync(envLocalPath, "utf8");
        const match = content.match(/^ENCRYPTION_KEY=(.+)$/m);
        if (match && match[1].trim()) {
          rawKey = match[1].trim();
          process.env.ENCRYPTION_KEY = rawKey;
        }
      }
    } catch (err) {
      console.warn("Failed reading .env.local for encryption key:", err);
    }

    if (!rawKey) {
      // Auto-generate a secure random 32-byte hex key
      const generated = crypto.randomBytes(32).toString("hex");
      rawKey = generated;
      process.env.ENCRYPTION_KEY = generated;

      try {
        const line = `\n# Auto-generated database encryption key\nENCRYPTION_KEY=${generated}\n`;
        fs.appendFileSync(envLocalPath, line, "utf8");
        console.log("Generated new persistent ENCRYPTION_KEY and saved to .env.local");
      } catch (err) {
        console.warn("Could not write ENCRYPTION_KEY to .env.local:", err);
      }
    }
  }

  // Derive a strong 32-byte AES key via PBKDF2
  cachedKey = crypto.pbkdf2Sync(rawKey, SALT, 100_000, 32, "sha256");
  return cachedKey;
}

/**
 * Encrypt a JSON-serializable payload or primitive using AES-256-GCM.
 * Output format: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptPayload(data: any): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const text = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt an AES-256-GCM encrypted payload back into its original data.
 */
export function decryptPayload<T = any>(payload: string): T {
  if (!payload || typeof payload !== "string") {
    throw new Error("Invalid payload to decrypt");
  }

  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload format");
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}

/**
 * Encrypt a raw string (e.g. Personal Access Token).
 */
export function encryptString(text: string): string {
  return encryptPayload(text);
}

/**
 * Decrypt a raw string (e.g. Personal Access Token).
 */
export function decryptString(payload: string): string {
  return decryptPayload<string>(payload);
}
