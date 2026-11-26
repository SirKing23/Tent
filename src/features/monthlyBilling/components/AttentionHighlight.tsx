import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Animated,
  Easing,
  type ScrollViewInstance,
  View,
  type ViewInstance,
} from "react-native";

const PULSE_DURATION_MS = 550;
const PULSE_COUNT = 3;

/**
 * Pulses an amber ring around a billing card so the card arrived at from Home
 * stands out, then scrolls it into view.
 */
export function AttentionHighlight({
  active,
  pulseKey,
  radius = 24,
  scrollRef,
  onComplete,
  children,
}: {
  active: boolean;
  /** Changing this restarts the pulse, even for an already-highlighted card. */
  pulseKey?: string;
  radius?: number;
  scrollRef?: RefObject<ScrollViewInstance | null>;
  onComplete?: () => void;
  children: ReactNode;
}) {
  const [pulse] = useState(() => new Animated.Value(0));
  const containerRef = useRef<ViewInstance>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const scrollIntoView = useCallback(() => {
    const node = containerRef.current;
    const content = scrollRef?.current?.getInnerViewRef();
    if (!node || !content) return;

    node.measureLayout(
      content,
      (_x, y) => {
        scrollRef?.current?.scrollTo({
          y: Math.max(0, y - 16),
          animated: true,
        });
      },
      () => {},
    );
  }, [scrollRef]);

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    pulse.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_DURATION_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      { iterations: PULSE_COUNT },
    );
    animation.start();

    // The card can be mounted before navigation and data load settle.
    const scrollTimer = setTimeout(scrollIntoView, 250);
    // Native-driver loops never invoke their end callback, so time the finish.
    const finishTimer = setTimeout(
      () => onCompleteRef.current?.(),
      PULSE_COUNT * PULSE_DURATION_MS * 2 + 50,
    );

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(finishTimer);
      animation.stop();
    };
  }, [active, pulse, pulseKey, scrollIntoView]);

  const handleLayout = useCallback(() => {
    if (active) scrollIntoView();
  }, [active, scrollIntoView]);

  return (
    <View collapsable={false} onLayout={handleLayout} ref={containerRef}>
      {children}
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: radius + 3,
            borderWidth: 2,
            borderColor: "#F59E0B",
            backgroundColor: "rgba(251, 191, 36, 0.16)",
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.15, 1],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.012],
                }),
              },
            ],
          }}
        />
      ) : null}
    </View>
  );
}
