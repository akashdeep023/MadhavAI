# Project Structure

## Overview
This is a React Native CLI application for the AI-Powered Farmer Decision Support Platform.

## Directory Structure

```
MadhavAI/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── src/                     # Source code
│   ├── components/          # Reusable UI components
│   ├── screens/             # Screen-level components
│   ├── services/            # Business logic and API services
│   ├── hooks/               # Custom React hooks
│   ├── store/               # State management (Zustand/Redux)
│   ├── config/              # Configuration files
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── __tests__/               # Test files
├── .kiro/                   # Kiro spec files
│   └── specs/
│       └── farmer-decision-support-platform/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── App.tsx                  # Root component
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── jest.setup.js            # Jest configuration
├── .eslintrc.js             # ESLint configuration
└── .prettierrc.js           # Prettier configuration
```

## Key Technologies

- **Framework**: React Native 0.84.1
- **Language**: TypeScript 5.8.3
- **State Management**: TBD (Zustand or Redux Toolkit)
- **Navigation**: TBD (React Navigation)
- **Testing**: Jest + fast-check (property-based testing)
- **Code Quality**: ESLint + Prettier
- **Backend**: AWS Lambda (Node.js/TypeScript)
- **Database**: DynamoDB (cloud) + SQLite (local)
- **AI/ML**: AWS Bedrock

## Development Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint code
- `npm run lint:fix` - Lint and fix code
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

## Architecture Principles

1. **Offline-First**: Core functionality works without internet
2. **Modular**: Clean separation of concerns
3. **Type-Safe**: Strict TypeScript configuration
4. **Testable**: Property-based testing for correctness
5. **Scalable**: Designed for 10M+ users
6. **Accessible**: Voice interface and regional language support

## Getting Started

1. Install dependencies: `npm install`
2. Start Metro: `npm start`
3. Run on Android: `npm run android`
4. Run tests: `npm test`

## Next Steps

Follow the implementation tasks defined in `.kiro/specs/farmer-decision-support-platform/tasks.md`
