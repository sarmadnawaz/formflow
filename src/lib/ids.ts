import { createHash, randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 16);
const shortNano = customAlphabet(alphabet, 8);

export const newId = (prefix: string) => `${prefix}_${nano()}`;
export const newSlug = () => shortNano();
export const newFieldId = () => `fld_${shortNano()}`;
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function appUrl() {
  return (process.env.APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "http://localhost:3000").replace(/\/$/, "").replace(/^(?!https?:\/\/)/, "https://");
}
