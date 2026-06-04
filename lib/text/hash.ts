import { createHash } from "crypto";

export function contentHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
