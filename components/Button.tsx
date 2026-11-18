import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'

type ButtonProps = {
  title: string
  onPress: () => void
  disabled?: boolean
  theme?: 'primary' | 'secondary'
}

export default function Button({ title, onPress, disabled = false, theme = 'primary' }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        theme === 'secondary' && styles.secondary,
      ]}
    >
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: '#CCCCCC',
  },
})