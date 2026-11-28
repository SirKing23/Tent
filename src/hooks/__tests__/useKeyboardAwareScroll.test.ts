import {
  FIELD_MARGIN,
  getKeyboardLift,
  getRevealOffset,
} from "../useKeyboardAwareScroll";

// Viewport runs from y=100 to y=500 (400 tall).
const viewport = { viewportY: 100, viewportHeight: 400 };

describe("getRevealOffset", () => {
  it("does not scroll while the field is fully visible", () => {
    expect(
      getRevealOffset({ ...viewport, fieldY: 200, fieldHeight: 48 }),
    ).toBe(0);
  });

  it("scrolls down when the field runs under the keyboard", () => {
    // Viewport bottom is 500; a 48pt field starting at 480 overlaps by 44.
    expect(
      getRevealOffset({ ...viewport, fieldY: 480, fieldHeight: 48 }),
    ).toBe(44);
  });

  it("scrolls up when the field sits above the viewport", () => {
    expect(
      getRevealOffset({ ...viewport, fieldY: 60, fieldHeight: 48 }),
    ).toBe(-(FIELD_MARGIN + 40));
  });

  it("keeps the margin between the field and the edges", () => {
    expect(
      getRevealOffset({
        ...viewport,
        fieldY: 470,
        fieldHeight: 30,
        margin: 24,
      }),
    ).toBe(470 + 30 - (100 + 400 - 24));
  });
});

describe("getKeyboardLift", () => {
  it("lifts the sheet when the window stays full height", () => {
    // 800pt window, keyboard top at 460 -> the app must make room itself.
    expect(
      getKeyboardLift({ keyboardHeight: 340, keyboardTop: 460, rootHeight: 800 }),
    ).toBe(340);
  });

  it("does not lift when the window already ends at the keyboard", () => {
    expect(
      getKeyboardLift({ keyboardHeight: 340, keyboardTop: 460, rootHeight: 460 }),
    ).toBe(0);
  });

  it("tolerates rounding between the window height and the keyboard top", () => {
    expect(
      getKeyboardLift({ keyboardHeight: 340, keyboardTop: 463, rootHeight: 460 }),
    ).toBe(0);
  });

  it("does nothing without a keyboard", () => {
    expect(
      getKeyboardLift({ keyboardHeight: 0, keyboardTop: 800, rootHeight: 800 }),
    ).toBe(0);
  });

  it("falls back to lifting before the sheet has been measured", () => {
    expect(
      getKeyboardLift({ keyboardHeight: 300, keyboardTop: 500, rootHeight: 0 }),
    ).toBe(300);
  });
});
