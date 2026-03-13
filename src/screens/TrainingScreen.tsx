import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CategorySelector } from '../components/training/CategorySelector';
import { LessonBrowser } from '../components/training/LessonBrowser';
import { LessonPlayer } from '../components/training/LessonPlayer';
import { LessonCategory } from '../types/training.types';
import { useTranslation } from '../hooks/useTranslation';

// Mock categories data
const mockCategories = [
  {
    id: 'pest_management' as LessonCategory,
    name: 'Pest Management',
    icon: '🐛',
    description: 'Learn to identify and control pests',
    lessonCount: 12,
  },
  {
    id: 'irrigation' as LessonCategory,
    name: 'Irrigation',
    icon: '💧',
    description: 'Water management techniques',
    lessonCount: 8,
  },
  {
    id: 'organic_farming' as LessonCategory,
    name: 'Organic Farming',
    icon: '🌱',
    description: 'Sustainable farming practices',
    lessonCount: 15,
  },
  {
    id: 'soil_health' as LessonCategory,
    name: 'Soil Health',
    icon: '🌾',
    description: 'Improve soil quality',
    lessonCount: 10,
  },
];

export default function TrainingScreen() {
  const { language } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<LessonCategory | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  const handleCategorySelect = (category: LessonCategory) => {
    setSelectedCategory(category);
  };

  const handleLessonSelect = (lessonId: string) => {
    // Mock lesson data
    setSelectedLesson({
      id: lessonId,
      title: 'Sample Lesson',
      duration: 240,
      transcript: 'This is a sample lesson transcript...',
      keyPoints: ['Point 1', 'Point 2', 'Point 3'],
    });
  };

  const handleLessonComplete = () => {
    setSelectedLesson(null);
  };

  if (selectedLesson) {
    return (
      <View style={styles.container}>
        <LessonPlayer lesson={selectedLesson} onComplete={handleLessonComplete} isOffline={false} />
      </View>
    );
  }

  if (selectedCategory) {
    return (
      <View style={styles.container}>
        <LessonBrowser
          category={selectedCategory}
          language={language}
          onLessonSelect={handleLessonSelect}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CategorySelector categories={mockCategories} onCategorySelect={handleCategorySelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
