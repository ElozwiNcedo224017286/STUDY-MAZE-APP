import React from 'react';
import { StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

export default function ChatVideoPlayer({ uri }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <View style={styles.frame}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        playsInline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 224,
    maxWidth: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginBottom: 6,
  },
  video: { flex: 1 },
});
