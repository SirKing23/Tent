import { getProfileMenuPosition } from "../ProfileMenu";

const ANCHOR = { x: 16, y: 96, width: 48, height: 48 };
const MIN_TOP = 120;

describe("getProfileMenuPosition", () => {
  it("sits below the avatar with a gap", () => {
    expect(getProfileMenuPosition(ANCHOR, 390, MIN_TOP)).toEqual({
      left: 16,
      top: 156,
    });
  });

  it("never rises above the avatar, even when the measurement is wrong", () => {
    expect(
      getProfileMenuPosition({ ...ANCHOR, y: 0, height: 0 }, 390, MIN_TOP).top,
    ).toBe(MIN_TOP);
  });

  it("follows the avatar when the header is scrolled", () => {
    expect(
      getProfileMenuPosition({ ...ANCHOR, y: 190 }, 390, MIN_TOP).top,
    ).toBe(250);
  });

  it("keeps the dropdown inside the right edge", () => {
    expect(
      getProfileMenuPosition({ ...ANCHOR, x: 360 }, 390, MIN_TOP).left,
    ).toBe(390 - 236 - 16);
  });

  it("falls back to the corner when the avatar was not measured", () => {
    expect(getProfileMenuPosition(null, 390, MIN_TOP)).toEqual({
      left: 16,
      top: MIN_TOP,
    });
  });
});
