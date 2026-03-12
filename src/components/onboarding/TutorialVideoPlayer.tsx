/**
 * TutorialVideoPlayer Component
 * Simple video player for tutorial content
 * Requirements: 12.8
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TutorialVideoPlayerProps {
  videoUrl: string;
  title: string;
  duration?: string;
  onComplete?: () => void;
}

/**
 * Tutorial video player with simple controls
 * Optimized for low-bandwidth and low-end devices
 */
export const TutorialVideoPlayer: React.FC<TutorialVideoPlayerProps> = ({
  title,
  duration,
  onComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    // In a real implementation, this would control actual video playback
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title}>{title}</Text>
        {duration && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationIcon}>⏱️</Text>
            <Text style={styles.duration}>{duration}</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePlayPause}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Text style={styles.controlIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
          <Text style={styles.controlLabel}>{isPlaying ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>

        {onComplete && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onComplete}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Mark as complete"
          >
            <Text style={styles.controlIcon}>✅</Text>
            <Text style={styles.controlLabel}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  videoContainer: {
    backgroundColor: '#000000',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 40,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  duration: {
    fontSize: 14,
    color: '#666666',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    minWidth: 80,
  },
  controlIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
});
