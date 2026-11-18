import { Image, StyleSheet, Text, View } from 'react-native'
import React from 'react'

type Props = {
    source: string;
}
export default function ImageViewer({source}: Props) {
  return (
    <Image source={{ uri: source }} style={styles.image} resizeMode="contain" />
  )
}

const styles = StyleSheet.create({
    image: {
        width: '100%',
        height: '100%',
    },
})