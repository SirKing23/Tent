import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  type HostInstance,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ViewInstance,
  type ViewStyle,
} from "react-native";

/** Breathing room kept between the focused field and the sheet edges. */
export const FIELD_MARGIN = 16;

/** Share of the window the sheet may cover. */
const SHEET_MAX_RATIO = 0.88;

/** A sheet never shrinks below this, so a tall keyboard cannot collapse it. */
const MIN_SHEET_HEIGHT = 240;

/** Time for the window resize / keyboard inset to land before measuring. */
const SETTLE_MS = 50;

/** Rounding slack when comparing the window height with the keyboard top. */
const WINDOW_RESIZE_SLACK = 8;

/**
 * How far the sheet has to move up for the keyboard.
 *
 * An `ADJUST_RESIZE` window (React Native's Android modals) already ends at the
 * keyboard, so the sheet only needs lifting when the window is still full
 * height - which is what edge-to-edge Android and iOS report.
 */
export function getKeyboardLift({
  keyboardHeight,
  keyboardTop,
  rootHeight,
}: {
  keyboardHeight: number;
  keyboardTop: number;
  rootHeight: number;
}): number {
  if (keyboardHeight <= 0) return 0;
  if (rootHeight <= 0) return keyboardHeight;
  const windowAlreadyAvoidsKeyboard =
    rootHeight <= keyboardTop + WINDOW_RESIZE_SLACK;
  return windowAlreadyAvoidsKeyboard ? 0 : keyboardHeight;
}

/**
 * Distance the sheet scrolls so the focused field clears the viewport
 * (negative when the field sits above it). All values are window coordinates.
 */
export function getRevealOffset({
  fieldY,
  fieldHeight,
  viewportY,
  viewportHeight,
  margin = FIELD_MARGIN,
}: {
  fieldY: number;
  fieldHeight: number;
  viewportY: number;
  viewportHeight: number;
  margin?: number;
}): number {
  const top = viewportY + margin;
  const bottom = viewportY + viewportHeight - margin;

  if (fieldY + fieldHeight > bottom) return fieldY + fieldHeight - bottom;
  if (fieldY < top) return fieldY - top;
  return 0;
}

/**
 * Keyboard handling for a bottom sheet that owns a scrolling body.
 *
 * The sheet is lifted by the keyboard (or left alone when the window resizes
 * itself), and the field that had focus is scrolled above the keyboard once it
 * has opened. Nothing is animated by the hook, and no layout work happens on
 * focus, so the input keeps focus while the keyboard animates in.
 */
export function useKeyboardAwareSheet() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const viewportRef = useRef<ViewInstance>(null);
  const offsetRef = useRef(0);
  const rootHeightRef = useRef(0);
  const focusedFieldRef = useRef<HostInstance | null>(null);
  const keyboardRef = useRef<{ height: number; screenY: number } | null>(null);
  const [lift, setLift] = useState(0);
  const [rootHeight, setRootHeight] = useState(0);

  const onRootLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    rootHeightRef.current = next;
    setRootHeight((current) =>
      Math.abs(current - next) < 1 ? current : next,
    );

    // A window that resizes for the keyboard may report its new height after
    // the keyboard event; recompute so the sheet is lifted exactly once.
    const keyboard = keyboardRef.current;
    if (!keyboard) return;
    const nextLift = getKeyboardLift({
      keyboardHeight: keyboard.height,
      keyboardTop: keyboard.screenY,
      rootHeight: next,
    });
    setLift((current) => (Math.abs(current - nextLift) < 1 ? current : nextLift));
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const scrollToField = useCallback((field: HostInstance | null) => {
    if (!field) return;

    field.measureInWindow((_x, fieldY, _width, fieldHeight) => {
      viewportRef.current?.measureInWindow(
        (_viewportX, viewportY, _viewportWidth, viewportHeight) => {
          const offset = getRevealOffset({
            fieldY,
            fieldHeight,
            viewportY,
            viewportHeight,
          });

          if (offset === 0) return;
          scrollRef.current?.scrollTo({
            y: Math.max(0, offsetRef.current + offset),
            animated: true,
          });
        },
      );
    });
  }, []);

  /** Remembers the field. Scrolling waits for the keyboard when it is closed. */
  const reveal = useCallback(
    (field: HostInstance | null) => {
      if (!field) return;
      focusedFieldRef.current = field;
      // With the keyboard already up the layout is final, so move right away.
      if (Keyboard.isVisible()) scrollToField(field);
    },
    [scrollToField],
  );

  const sheetStyle: ViewStyle = {
    marginBottom: lift,
    maxHeight:
      rootHeight > 0
        ? Math.max(MIN_SHEET_HEIGHT, rootHeight * SHEET_MAX_RATIO - lift)
        : `${SHEET_MAX_RATIO * 100}%`,
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let frame: number | null = null;

    const clearPending = () => {
      if (timer) clearTimeout(timer);
      if (frame !== null) cancelAnimationFrame(frame);
      timer = null;
      frame = null;
    };

    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      const { height, screenY } = event.endCoordinates;
      keyboardRef.current = { height, screenY };

      // Wait for the window resize (if any) to land before deciding whether the
      // sheet has to move, then scroll once that lift has been laid out.
      clearPending();
      timer = setTimeout(() => {
        setLift(
          getKeyboardLift({
            keyboardHeight: height,
            keyboardTop: screenY,
            rootHeight: rootHeightRef.current,
          }),
        );
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            frame = null;
            scrollToField(focusedFieldRef.current);
          });
        });
      }, SETTLE_MS);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      clearPending();
      keyboardRef.current = null;
      setLift(0);
    });

    return () => {
      show.remove();
      hide.remove();
      clearPending();
    };
  }, [scrollToField]);

  return {
    scrollRef,
    viewportRef,
    onScroll,
    reveal,
    sheetStyle,
    onRootLayout,
  };
}
