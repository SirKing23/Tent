import type { PinCredential, SecurityRecord } from "../../types";
import { verifyPinAttempt } from "../authService";
import { createPinCredential, verifyPin } from "../pinService";
import {
  clearFailedAttempts,
  getSecurityRecord,
  registerFailedAttempt,
  updatePinCredential,
} from "../securityRepository";

jest.mock("../../../profile/services/userProfileRepository", () => ({
  getUserProfile: jest.fn(),
}));
jest.mock("../../../settings/services/settingsRepository", () => ({
  getSettings: jest.fn(),
}));
jest.mock("../securityRepository", () => ({
  getSecurityRecord: jest.fn(),
  registerFailedAttempt: jest.fn(),
  clearFailedAttempts: jest.fn(),
  updatePinCredential: jest.fn(),
}));
jest.mock("../pinService", () => ({
  PIN_ITERATIONS: 10_000,
  verifyPin: jest.fn(),
  createPinCredential: jest.fn(),
}));

const mockedGetRecord = jest.mocked(getSecurityRecord);
const mockedRegisterFailed = jest.mocked(registerFailedAttempt);
const mockedClearFailed = jest.mocked(clearFailedAttempts);
const mockedUpdateCredential = jest.mocked(updatePinCredential);
const mockedVerifyPin = jest.mocked(verifyPin);
const mockedCreateCredential = jest.mocked(createPinCredential);

const credential = (iterations: number): PinCredential => ({
  hash: "a".repeat(64),
  salt: "b".repeat(32),
  algorithm: "PBKDF2-SHA256",
  iterations,
  length: 4,
});

const record = (iterations: number): SecurityRecord => ({
  credential: credential(iterations),
  biometricEnabled: false,
  failedAttempts: 0,
  lockedUntil: null,
  createdAt: "",
  updatedAt: "",
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockedClearFailed.mockResolvedValue();
  mockedUpdateCredential.mockResolvedValue();
});

describe("verifyPinAttempt", () => {
  it("upgrades a slow legacy hash after a successful unlock", async () => {
    mockedGetRecord.mockResolvedValue(record(100_000));
    mockedVerifyPin.mockResolvedValue(true);
    mockedCreateCredential.mockResolvedValue(credential(10_000));

    await expect(verifyPinAttempt("1234")).resolves.toEqual({ ok: true });
    await flush();

    expect(mockedUpdateCredential).toHaveBeenCalledWith(credential(10_000));
  });

  it("leaves a credential alone when it already uses the current cost", async () => {
    mockedGetRecord.mockResolvedValue(record(10_000));
    mockedVerifyPin.mockResolvedValue(true);

    await verifyPinAttempt("1234");
    await flush();

    expect(mockedUpdateCredential).not.toHaveBeenCalled();
  });

  it("never rewrites the credential when the caller replaces it itself", async () => {
    mockedGetRecord.mockResolvedValue(record(100_000));
    mockedVerifyPin.mockResolvedValue(true);

    await verifyPinAttempt("1234", new Date(), { refreshCost: false });
    await flush();

    expect(mockedUpdateCredential).not.toHaveBeenCalled();
  });

  it("counts a wrong PIN instead of touching the stored hash", async () => {
    mockedGetRecord.mockResolvedValue(record(10_000));
    mockedVerifyPin.mockResolvedValue(false);
    mockedRegisterFailed.mockResolvedValue({
      failedAttempts: 1,
      lockedUntil: null,
    });

    await expect(verifyPinAttempt("0000")).resolves.toEqual({
      ok: false,
      reason: "incorrect",
      attemptsRemaining: 4,
    });
    await flush();

    expect(mockedUpdateCredential).not.toHaveBeenCalled();
  });
});
