import type { PinCredential } from "../../types";
import {
  derivePinHash,
  createPinCredential,
  PIN_ITERATIONS,
  verifyPin,
} from "../pinService";

const SALT = "00112233445566778899aabbccddeeff";
const ITERATIONS = 1_000;

const createCredential = async (pin: string): Promise<PinCredential> => ({
  hash: await derivePinHash(pin, SALT, ITERATIONS),
  salt: SALT,
  algorithm: "PBKDF2-SHA256",
  iterations: ITERATIONS,
  length: pin.length,
});

describe("pinService", () => {
  it("stores a derived hash instead of the PIN", async () => {
    const hash = await derivePinHash("123456", SALT, ITERATIONS);

    expect(hash).not.toBe("123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same PIN, salt, and iteration count", async () => {
    const first = await derivePinHash("123456", SALT, ITERATIONS);
    const second = await derivePinHash("123456", SALT, ITERATIONS);

    expect(first).toBe(second);
  });

  it("uses the salt so equal PINs produce different hashes", async () => {
    const otherSalt = "ffeeddccbbaa99887766554433221100";
    const first = await derivePinHash("123456", SALT, ITERATIONS);
    const second = await derivePinHash("123456", otherSalt, ITERATIONS);

    expect(first).not.toBe(second);
  });

  it("accepts the correct PIN and rejects another one", async () => {
    const credential = await createCredential("123456");

    await expect(verifyPin("123456", credential)).resolves.toBe(true);
    await expect(verifyPin("654321", credential)).resolves.toBe(false);
    await expect(verifyPin("12345", credential)).resolves.toBe(false);
  });

  it("only accepts the number of digits the credential was saved with", async () => {
    const legacy = await createCredential("123456");
    const current = { ...legacy, length: 4 };

    await expect(verifyPin("1234", legacy)).resolves.toBe(false);
    await expect(verifyPin("123456", current)).resolves.toBe(false);
  });

  it("records the PIN length and the current work factor", async () => {
    const credential = await createPinCredential("1234");

    expect(credential.length).toBe(4);
    expect(credential.iterations).toBe(PIN_ITERATIONS);
    await expect(verifyPin("1234", credential)).resolves.toBe(true);
    await expect(verifyPin("12345", credential)).resolves.toBe(false);
  });
});
