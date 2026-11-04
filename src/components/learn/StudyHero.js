import React from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TYPE, SPACE, RADIUS } from '../../theme/layout';

export default function StudyHero({ eyebrow, title, description, image }) {
  const { width, fontScale } = useWindowDimensions();
  const showArt = image && fontScale < 1.4;
  return (
    <LinearGradient colors={['#4C1D95', '#6D28D9', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View pointerEvents="none" style={styles.glow} />
      <View style={[styles.copy, showArt && { paddingRight: width < 360 ? 70 : 100 }]}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {showArt ? <Image source={image} resizeMode="contain" style={[styles.art, width < 360 && { width: 88, height: 104 }]} accessible={false} /> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: RADIUS.hero, padding: SPACE.page, minHeight: 154, overflow: 'hidden', marginBottom: SPACE.section },
  copy: { zIndex: 1 },
  eyebrow: { ...TYPE.eyebrow, color: '#DDD6FE', marginBottom: SPACE.sm },
  title: { ...TYPE.sectionTitle, color: '#FFFFFF' },
  description: { ...TYPE.body, color: '#EDE9FE', marginTop: SPACE.sm },
  glow: { position: 'absolute', right: -36, top: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.09)' },
  art: { position: 'absolute', width: 124, height: 138, right: 2, bottom: 6 },
});
