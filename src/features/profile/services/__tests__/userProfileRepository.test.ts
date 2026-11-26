import { EMPTY_USER_PROFILE, type UserProfile } from "../../types";
import { getUserProfile, upsertUserProfile } from "../userProfileRepository";

jest.mock("../../../../services/database", () => ({
  getDatabase: jest.fn(),
}));

const createFakeDb = (row?: unknown) => ({
  getFirstAsync: jest.fn().mockResolvedValue(row ?? null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
});

describe("userProfileRepository", () => {
  it("loads the stored profile photo", async () => {
    const db = createFakeDb({
      full_name: "Ana Reyes",
      email: "ana@example.com",
      currency_code: "PHP",
      currency_symbol: "₱",
      photo_uri: "photos/profile-1.jpg",
    });

    await expect(getUserProfile(db as never)).resolves.toEqual({
      fullName: "Ana Reyes",
      email: "ana@example.com",
      currencyCode: "PHP",
      currencySymbol: "₱",
      photo: "photos/profile-1.jpg",
    });
  });

  it("falls back to the empty profile when no photo or row exists", async () => {
    const db = createFakeDb();

    await expect(getUserProfile(db as never)).resolves.toEqual(
      EMPTY_USER_PROFILE,
    );
  });

  it("resolves a currency saved by an older build to the app default", async () => {
    const db = createFakeDb({
      full_name: "Ana Reyes",
      email: "ana@example.com",
      currency_code: "USD",
      currency_symbol: "$",
      photo_uri: null,
    });

    await expect(getUserProfile(db as never)).resolves.toEqual({
      fullName: "Ana Reyes",
      email: "ana@example.com",
      currencyCode: "PHP",
      currencySymbol: "₱",
      photo: "",
    });
  });

  it("saves the normalized profile with its photo", async () => {
    const db = createFakeDb();
    const profile: UserProfile = {
      fullName: "  Ana   Reyes ",
      email: " ANA@Example.com ",
      currencyCode: "PHP",
      currencySymbol: "₱",
      photo: "photos/profile-1.jpg",
    };

    await upsertUserProfile(profile, db as never);

    const [sql, ...params] = db.runAsync.mock.calls[0];
    expect(sql).toContain("photo_uri = excluded.photo_uri");
    expect(params).toEqual([
      "local",
      "Ana Reyes",
      "ana@example.com",
      "PHP",
      "₱",
      "photos/profile-1.jpg",
      expect.any(String),
      expect.any(String),
    ]);
  });

  it("stores an empty photo as null so the avatar falls back to initials", async () => {
    const db = createFakeDb();

    await upsertUserProfile(
      { ...EMPTY_USER_PROFILE, fullName: "Ana Reyes" },
      db as never,
    );

    const [, ...params] = db.runAsync.mock.calls[0];
    expect(params[5]).toBeNull();
  });
});
