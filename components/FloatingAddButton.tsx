import React, { useRef, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';

//import { Ionicons } from '@react-native-vector-icons/ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import * as Haptics from 'expo-haptics';

type FabAction = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  color?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
};

interface FloatingActionButtonProps {
  actions: FabAction[];
  backgroundColor?: string;
  iconBackgroundColor?: string;
  bottom?: number;
  right?: number;
}

export default function FloatingActionButton({
  actions,
  backgroundColor = '#2563EB',
  iconBackgroundColor = '#FFFFFF',
  bottom = 20,
  right = 20,
}: FloatingActionButtonProps) {

  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Main FAB animation
  const rotation = useRef(new Animated.Value(0)).current;

  // Backdrop animation
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Individual action animations
  const actionAnimations = useRef(
    actions.map(() => new Animated.Value(0))
  ).current;

  const animateOpen = () => {
    setMenuVisible(true);
    setExpanded(true);

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    );

    Animated.parallel([
      Animated.timing(rotation, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),

      Animated.stagger(
        65,
        actionAnimations.map((animation) =>
          Animated.timing(animation, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.back(1.3)),
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  };

  const animateClose = (callback?: () => void) => {
    setExpanded(false);

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    );

    Animated.parallel([
      Animated.timing(rotation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),

      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),

      Animated.stagger(
        35,
        [...actionAnimations].reverse().map((animation) =>
          Animated.timing(animation, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          })
        )
      ),
    ]).start(() => {
      setMenuVisible(false);
      callback?.();
    });
  };

  const toggleMenu = () => {
    if (expanded) {
      animateClose();
    } else {
      animateOpen();
    }
  };

  const handleAction = (action: FabAction) => {
    Haptics.selectionAsync();
    animateClose(action.onPress);
  };

  const rotateStyle = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >

      {/* BACKDROP */}
      {menuVisible && (
        <Animated.View
          pointerEvents={expanded ? 'auto' : 'none'}
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => animateClose()}
          />
        </Animated.View>
      )}

      {/* FLOATING ACTION BUTTON AREA */}
      <View
        style={[
          styles.fabContainer,
          { bottom, right },
        ]}
        pointerEvents="box-none"
      >

        {/* EXPANDABLE ACTIONS */}
        {menuVisible && (
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => {

              const animation = actionAnimations[index];

              const animatedStyle = {
                opacity: animation,
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                ],
              };

              return (
                <Animated.View
                  key={`${action.label}-${index}`}
                  style={[styles.actionRow, animatedStyle]}
                  pointerEvents={expanded ? 'auto' : 'none'}
                >
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>
                      {action.label}
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor:
                          action.iconBackgroundColor ||
                          action.color ||
                          iconBackgroundColor,
                      },
                    ]}
                    onPress={() => handleAction(action)}
                  >
                    <MaterialCommunityIcons
                      name={action.icon}
                      size={22}
                      color={action.iconColor || '#2563EB'}
                    />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* MAIN BUTTON */}
        <Pressable
          onPress={toggleMenu}
          style={[
            styles.mainButton,
            { backgroundColor },
          ]}
        >
          <Animated.View
            style={{
              transform: [{ rotate: rotateStyle }],
            }}
          >
            <MaterialCommunityIcons
              name="plus"
              size={32}
              color="#FFFFFF"
            />
          </Animated.View>
        </Pressable>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  fabContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 1000,
    elevation: 15,
  },

  actionsContainer: {
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 16,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  labelContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    elevation: 4,
  },

  label: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '600',
  },

  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },

  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
