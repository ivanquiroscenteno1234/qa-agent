import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SECRET_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const configuredKey = process.env.QA_LOCAL_SECRET_KEY?.trim();

  if (!configuredKey) {
    throw new Error("QA_LOCAL_SECRET_KEY must be configured to store encrypted credential secrets.");
  }

  return createHash("sha256").update(configuredKey, "utf8").digest();
}

export function isEncryptedCredentialSecret(value?: string): boolean {
  return Boolean(value?.startsWith(SECRET_PREFIX));
}

export function needsCredentialSecretProtection(value?: string): boolean {
  return Boolean(value?.trim() && !isEncryptedCredentialSecret(value));
}

export function protectCredentialSecret(value?: string): string | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (isEncryptedCredentialSecret(trimmedValue)) {
    return trimmedValue;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(trimmedValue, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${SECRET_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function revealCredentialSecret(value?: string): string | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (!isEncryptedCredentialSecret(trimmedValue)) {
    return trimmedValue;
  }

  const [, encodedIv, encodedAuthTag, encodedCiphertext] = trimmedValue.split(":");

  if (!encodedIv || !encodedAuthTag || !encodedCiphertext) {
    throw new Error("Stored credential secret is malformed and cannot be decrypted.");
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(encodedIv, "base64"));
  decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}