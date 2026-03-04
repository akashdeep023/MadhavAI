# MADHAV AI - Farmer Decision Support Platform

An AI-powered mobile application designed to provide Indian farmers with actionable, step-by-step guidance for farming decisions. The platform integrates weather data, soil health, market prices, government schemes, and agricultural best practices to deliver personalized recommendations through voice and regional languages.

## 🌾 Features

- **Offline-First Architecture**: Core functionality works without internet connectivity
- **AI-Powered Recommendations**: Crop, fertilizer, and seed recommendations using AWS Bedrock
- **Weather Intelligence**: 7-day forecasts with farming advice and severe weather alerts
- **Market Intelligence**: Real-time mandi prices and selling guidance
- **Government Schemes Navigator**: Discover and apply for eligible schemes
- **Soil Health Insights**: Interpret soil test results and get improvement recommendations
- **Training & Learning**: Short practical lessons in regional languages
- **Voice Interface**: Complete voice navigation for low-literacy users
- **Multilingual Support**: 10+ Indian regional languages
- **Smart Alerts**: Timely reminders for farming activities

## 🚀 Technology Stack

- **Mobile**: React Native 0.84.1 with TypeScript
- **Backend**: AWS Lambda (Node.js/TypeScript)
- **Database**: DynamoDB (cloud) + SQLite (local)
- **AI/ML**: AWS Bedrock
- **Storage**: Amazon S3
- **Testing**: Jest + fast-check (property-based testing)
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- Node.js >= 22.11.0
- npm or yarn
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MadhavAI
```

2. Install dependencies:
```bash
npm install
```

3. Install iOS dependencies (macOS only):
```bash
cd ios && pod install && cd ..
```

## 🏃 Running the Application

### Start Metro Bundler
```bash
npm start
```

### Run on Android
```bash
npm run android
```

### Run on iOS (macOS only)
```bash
npm run ios
```

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run property-based tests
Property-based tests use fast-check library and are included in the test suite. They validate correctness properties across randomized inputs.

## 🔍 Code Quality

### Lint code
```bash
npm run lint
```

### Fix linting issues
```bash
npm run lint:fix
```

### Format code
```bash
npm run format
```

### Check formatting
```bash
npm run format:check
```

### Type check
```bash
npm run type-check
```

## 📁 Project Structure

```
MadhavAI/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen-level components
│   ├── services/        # Business logic and API services
│   ├── hooks/           # Custom React hooks
│   ├── store/           # State management
│   ├── config/          # Configuration files
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── android/             # Android native code
├── ios/                 # iOS native code
├── __tests__/           # Test files
└── .kiro/specs/         # Specification documents
```

## 🎯 Development Workflow

This project follows a spec-driven development approach. Implementation tasks are defined in `.kiro/specs/farmer-decision-support-platform/tasks.md`.

### Current Status
✅ Task 1: Project setup and infrastructure foundation - COMPLETE
✅ Task 2: Authentication module implementation
✅ Task 3: User profile module implementation
✅ Task 4: Offline sync module implementation
✅ Task 5: Checkpoint - Core infrastructure validation

### Next Steps

## 🌍 Supported Languages

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

## 📊 Architecture Principles

1. **Offline-First**: All core features work without internet
2. **Modular**: Clean separation of concerns
3. **Type-Safe**: Strict TypeScript configuration
4. **Testable**: Property-based testing for correctness
5. **Scalable**: Designed for 10M+ users
6. **Accessible**: Voice interface and regional language support

## 🔐 Security

- AES-256 encryption for local data
- TLS 1.3 for network communications
- OTP-based authentication
- Secure session management
- Data privacy compliance

## 📈 Performance Targets

- Dashboard load: < 2 seconds (offline)
- API response: < 3 seconds
- Recommendations: < 5 seconds
- App size: < 50 MB
- Battery usage: < 5% per hour active use
- Minimum device: Android 8.0, 2 GB RAM

## 🤝 Contributing

1. Follow the coding standards (ESLint + Prettier)
2. Write tests for new features
3. Maintain 80%+ code coverage
4. Update documentation
5. Follow the spec-driven development workflow

## 📝 License

[License information to be added]

## 👥 Team

[Team information to be added]

## 📞 Support

[Support information to be added]

---

Built with ❤️ for Indian farmers
