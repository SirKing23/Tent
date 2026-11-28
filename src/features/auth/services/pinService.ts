import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { getRandomBytes } from "expo-crypto";

import { isValidPin } from "../logic/pinValidation";
import type { PinAlgorithm, PinCredential } from "../types";

export const PIN_SALT_BYTES = 16;
export const PIN_HASH_BYTES = 32;

/**
 * PBKDF2-HMAC-SHA256 work factor. Stored per credential so it can be raised in
 * a future release without invalidating existing PINs.
 *
 * Pure-JS PBKDF2 runs on the JS thread, so a high count is felt directly when
 * unlocking: 100k took several seconds on Android. The PIN is short anyway, so
 * the lockout policy - not the hash cost - is what stops guessing. Existing
 * credentials keep their own count until they are re-derived after a successful
 * unlock (see `verifyPinAttempt`).
 */
export const PIN_ITERATIONS = 10_000;
export const PIN_ALGORITHM: PinAlgorithm = "PBKDF2-SHA256";

/** Derives the hex-encoded key for a PIN. Exported for tests and tooling. */
export async function derivePinHash(
  pin: string,
  saltHex: string,
  iterations: number = PIN_ITERATIONS,
): Promise<string> {
  const derived = await pbkdf2Async(sha256, pin, hexToBytes(saltHex), {
    c: iterations,
    dkLen: PIN_HASH_BYTES,
  });
  return bytesToHex(derived);
}

export const createPinSalt = (): string =>
  bytesToHex(getRandomBytes(PIN_SALT_BYTES));

export async function createPinCredential(pin: string): Promise<PinCredential> {
  const salt = createPinSalt();
  const hash = await derivePinHash(pin, salt);
  return {
    hash,
    salt,
    algorithm: PIN_ALGORITHM,
    iterations: PIN_ITERATIONS,
    length: pin.length,
  };
}

/** Length-independent, constant-time hex comparison. */
const hexEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
};

export async function verifyPin(
  pin: string,
  credential: PinCredential,
): Promise<boolean> {
  if (!isValidPin(pin, credential.length)) return false;
  const hash = await derivePinHash(
    pin,
    credential.salt,
    credential.iterations,
  );
  return hexEquals(hash, credential.hash);
}
