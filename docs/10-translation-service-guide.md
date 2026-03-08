# Translation Service

Comprehensive multilanguage support system for the Farmer Decision Support Platform.

## Overview

The translation service provides complete multilanguage support for 10 regional Indian languages plus English:
- Hindi (हिन्दी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Kannada (ಕನ್ನಡ)
- Marathi (मराठी)
- Bengali (বাংলা)
- Gujarati (ગુજરાતી)
- Punjabi (ਪੰਜਾਬੀ)
- Malayalam (മലയാളം)
- Odia (ଓଡ଼ିଆ)
- English

## Features

### 1. Translation Service
- Load and manage translations for all supported languages
- Fallback to default language if translation missing
- Parameter interpolation in translations
- Nested translation keys support

### 2. Translation Storage
- Local SQLite storage for offline access
- Version management for translations
- Efficient caching and retrieval

### 3. Content Management
- Validation of translation completeness
- Bulk import/export of translations
- Coverage statistics and reporting

### 4. Language Preference
- User language preference persistence
- Integration with user profile
- Change history tracking

### 5. Translation Workflow
- Content submission for translation
- Validation before release
- Ensures all languages available before content release

### 6. Sync Service
- Sync translations from remote source
- Offline-first architecture
- Version-based updates

### 7. Integration Service
- Unified interface for all modules
- Voice interface integration
- Cross-module language synchronization

## Usage

### Basic Translation

```typescript
import {TranslationService} from './services/translation';

const translationService = new TranslationService(storage);
await translationService.initialize('hi');

// Simple translation
const text = translationService.translate('ui.common.yes');

// With parameters
const greeting = translationService.translate('ui.greeting', {name: 'राज'});
```

### React Hook

```typescript
import {useTranslation} from './hooks/useTranslation';

function MyComponent() {
  const {t, language, setLanguage} = useTranslation();
  
  return (
    <View>
      <Text>{t('ui.dashboard.title')}</Text>
      <Button onPress={() => setLanguage('ta')}>
        {t('ui.common.changeLanguage')}
      </Button>
    </View>
  );
}
```

### Language Switcher

```typescript
import LanguageSwitcher from './components/LanguageSwitcher';

<LanguageSwitcher
  visible={showSwitcher}
  onClose={() => setShowSwitcher(false)}
/>
```

## Translation Keys Structure

Translations are organized by category:

- `ui.*` - User interface labels
- `alerts.*` - Alert messages
- `recommendations.*` - Recommendation content
- `schemes.*` - Government scheme information
- `training.*` - Training content
- `weather.*` - Weather information
- `market.*` - Market price information
- `soil.*` - Soil health information
- `errors.*` - Error messages
- `common.*` - Common phrases

Example:
```
ui.dashboard.title
ui.common.yes
alerts.weather.heavyRain
recommendations.crop.suitability
```

## Adding New Translations

### 1. Create Translation Files

Create JSON files for each language:
```json
// ui.hi.json
{
  "common": {
    "yes": "हाँ",
    "no": "नहीं"
  }
}
```

### 2. Load Translations

```typescript
const contentManager = new TranslationContentManager(storage);
await contentManager.bulkImport(
  TranslationCategory.UI,
  {
    hi: require('./translations/ui.hi.json'),
    ta: require('./translations/ui.ta.json'),
    // ... other languages
  }
);
```

### 3. Validate Completeness

```typescript
const validation = await contentManager.validateTranslations(
  TranslationCategory.UI,
  baseContent
);

if (!validation.isValid) {
  console.error('Missing translations:', validation.missingLanguages);
}
```

## Voice Integration

The translation service automatically integrates with the voice interface:

```typescript
import {TranslationIntegrationService} from './services/translation';

const integrationService = new TranslationIntegrationService(translationService);

// Change language updates both text and voice
await integrationService.changeLanguage('ta');
```

## Offline Support

All translations are stored locally in SQLite for offline access:

- Translations loaded on app start
- No network required for translation
- Sync updates when online
- Version-based update mechanism

## Content Release Workflow

1. Submit content for translation
2. Add translations for all required languages
3. Validate completeness
4. Release content

```typescript
const workflowManager = new TranslationWorkflowManager(contentManager, storage);

// Submit new content
const releaseId = await workflowManager.submitForTranslation({
  category: TranslationCategory.TRAINING,
  contentId: 'lesson_123',
  baseLanguage: 'hi',
  content: lessonContent,
});

// Add translations
await workflowManager.addTranslation(releaseId, 'ta', tamilContent);
await workflowManager.addTranslation(releaseId, 'te', teluguContent);
// ... add all languages

// Validate and release
const result = await workflowManager.releaseContent(releaseId);
if (result.success) {
  console.log('Content released successfully');
}
```

## Requirements Validation

This implementation satisfies:

- **Requirement 13.1**: Support for 10 regional languages
- **Requirement 13.2**: Language selection during registration
- **Requirement 13.3**: Change language anytime
- **Requirement 13.4**: Voice output in selected language
- **Requirement 13.5**: Voice input in selected language
- **Requirement 13.6**: All content translated
- **Requirement 13.7**: Translations required before release
- **Requirement 13.8**: Local storage for offline access

## Architecture

```
TranslationService (Main API)
├── TranslationStorage (SQLite persistence)
├── TranslationContentManager (Content management)
├── LanguagePreferenceManager (User preferences)
├── TranslationLoader (Load bundled translations)
├── TranslationWorkflowManager (Release workflow)
├── TranslationSyncService (Remote sync)
└── TranslationIntegrationService (Cross-module integration)
```

## Testing

Property-based tests validate:
- Language content completeness
- Language preference persistence
- Translation availability for new content
- Offline access functionality

See task 15.2 for property test implementation.
