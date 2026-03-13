# Secret Variables Reference

This document lists all secret and environment variables used in the project, where they're stored, and where they're used.

## Storage Locations

### 1. Local Development: `.env` file (project root)
- **Purpose**: Store all secrets and configuration for local development
- **Security**: File is gitignored, never committed to version control
- **Template**: `.env.example` (copy this to `.env` and fill in your values)

### 2. Android Keystore: `android/app/release.keystore`
- **Purpose**: Sign release builds of Android app
- **Security**: File is gitignored, keep secure backup
- **Generation**: Run `./android/generate-keystore.sh`

### 3. GitHub Secrets: Repository Settings → Secrets and variables → Actions
- **Purpose**: Build release APKs in CI/CD pipeline
- **Access**: Only repository admins can view/edit

## Complete Variable List

### API Configuration

| Variable | Used In | Purpose | Example Value |
|----------|---------|---------|---------------|
| `API_BASE_URL` | `src/config/env.ts` | Main API endpoint | `http://localhost:3000/api` |
| `API_TIMEOUT` | `src/config/env.ts` | API request timeout (ms) | `30000` |
| `ENABLE_API` | `src/config/env.ts` | Enable/disable API calls | `false` (dev), `true` (prod) |
| `OTA_API_BASE_URL` | `src/services/OTAUpdateService.ts`<br>`src/services/FeatureUpdateScheduler.ts`<br>`src/services/ABTestingService.ts`<br>`src/services/VersionCompatibilityService.ts` | OTA update service endpoint | `https://api.madhavai.app` |

### Android Build Secrets

| Variable | Used In | Purpose | Example Value |
|----------|---------|---------|---------------|
| `ANDROID_KEYSTORE_PASSWORD` | `android/app/build.gradle`<br>`src/config/env.ts` | Keystore file password | `your_secure_password` |
| `ANDROID_KEY_ALIAS` | `android/app/build.gradle`<br>`src/config/env.ts` | Key alias in keystore | `madhavai-release-key` |
| `ANDROID_KEY_PASSWORD` | `android/app/build.gradle`<br>`src/config/env.ts` | Key password | `your_key_password` |

### Lambda Function Environment Variables

| Variable | Used In | Purpose | Example Value |
|----------|---------|---------|---------------|
| `PRIMARY_REGION` | `infrastructure/lambda/dr-test/index.js`<br>`infrastructure/lambda/failover-handler/index.js`<br>`src/config/env.ts` | Primary AWS region | `us-east-1` |
| `BACKUP_REGION` | `infrastructure/lambda/dr-test/index.js`<br>`infrastructure/lambda/failover-handler/index.js`<br>`src/config/env.ts` | Backup AWS region | `us-west-2` |
| `PROJECT_NAME` | `infrastructure/lambda/dr-test/index.js`<br>`infrastructure/lambda/failover-handler/index.js`<br>`src/config/env.ts` | Project name | `madhavai` |
| `ENVIRONMENT` | `infrastructure/lambda/dr-test/index.js`<br>`infrastructure/lambda/failover-handler/index.js`<br>`src/config/env.ts` | Environment name | `development`, `staging`, `production` |
| `SNS_TOPIC_ARN` | `infrastructure/lambda/dr-test/index.js`<br>`infrastructure/lambda/failover-handler/index.js`<br>`src/config/env.ts` | SNS topic for alerts | `arn:aws:sns:us-east-1:xxxxxxxxxxxx:madhavai-alerts` |
| `LESSONS_TABLE` | `src/api/handlers/trainingHandlers.ts`<br>`src/config/env.ts` | DynamoDB lessons table | `farmer-platform-lessons` |
| `PROGRESS_TABLE` | `src/api/handlers/trainingHandlers.ts`<br>`src/config/env.ts` | DynamoDB progress table | `farmer-platform-learning-progress` |
| `CONTENT_BUCKET` | `src/api/handlers/trainingHandlers.ts`<br>`src/config/env.ts` | S3 content bucket | `farmer-platform-training-content` |

### Google Play Store

| Variable | Used In | Purpose | Example Value |
|----------|---------|---------|---------------|
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH` | `.env.example` (documentation) | Path to service account JSON | `./android/play-store/service-account.json` |

### Storage Configuration

| Variable | Used In | Purpose | Example Value |
|----------|---------|---------|---------------|
| `STORAGE_LIMIT_MB` | `src/config/env.ts` | Local storage limit | `500` |
| `SYNC_INTERVAL_MS` | `src/config/env.ts` | Sync interval (ms) | `60000` (1 minute) |
| `MAX_RETRY_ATTEMPTS` | `src/config/env.ts` | Max retry attempts | `3` |

## How Variables Are Accessed

### In JavaScript/TypeScript Code

```typescript
import { config, awsConfig, lambdaConfig, buildSecrets } from './config/env';

// Main app configuration
console.log(config.API_BASE_URL);
console.log(config.OTA_API_BASE_URL);

// AWS configuration
console.log(awsConfig.AWS_APPSYNC_GRAPHQL_ENDPOINT);

// Lambda configuration
console.log(lambdaConfig.LESSONS_TABLE);

// Build secrets (Android only)
console.log(buildSecrets.ANDROID_KEYSTORE_PASSWORD);
```

### In Android Gradle (build.gradle)

```groovy
android {
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
}
```

### In GitHub Actions (.github/workflows/android-build.yml)

```yaml
env:
  ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
  ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
  ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
```

## Setup Instructions

### 1. Local Development Setup

```bash
# Copy example file
cp .env.example .env

# Edit .env and fill in your values
nano .env  # or use any text editor

# Generate Android keystore (first time only)
cd android
./generate-keystore.sh
cd ..
```

### 2. GitHub Secrets Setup

1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret:
   - `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore file
   - `ANDROID_KEYSTORE_PASSWORD` - Your keystore password
   - `ANDROID_KEY_ALIAS` - Your key alias
   - `ANDROID_KEY_PASSWORD` - Your key password
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (optional) - Service account JSON

To encode keystore file:
```bash
base64 -i android/app/release.keystore | pbcopy  # macOS
base64 -w 0 android/app/release.keystore  # Linux
```

This will generate `src/aws-exports.js` with your AWS configuration.

## Security Best Practices

1. ✅ **Never commit `.env` file** - It's in `.gitignore`
2. ✅ **Never commit keystore file** - It's in `.gitignore`
3. ✅ **Use different keys for dev/prod** - Don't reuse production keys
4. ✅ **Rotate secrets regularly** - Change passwords periodically
5. ✅ **Limit access** - Only share secrets with team members who need them
6. ✅ **Use GitHub Secrets** - For CI/CD, always use encrypted secrets
7. ✅ **Keep backups** - Store keystore backup in secure location

## Troubleshooting

### Variables Not Loading

```bash
# Restart Metro bundler with cache reset
npm start -- --reset-cache

# Rebuild Android app
cd android && ./gradlew clean && cd ..
npm run android
```

### Build Fails with Missing Variables

Check that:
1. `.env` file exists in project root
2. All required variables are defined in `.env`
3. `react-native-config` is installed: `npm list react-native-config`
4. Android build has been cleaned: `cd android && ./gradlew clean`

### GitHub Actions Build Fails

Check that:
1. All required secrets are added to GitHub repository
2. Secret names match exactly (case-sensitive)
3. Keystore file is properly base64 encoded
4. Workflow file references correct secret names

## Adding New Variables

When adding a new environment variable:

1. Add to `.env.example` with placeholder value
2. Add to `.env` with actual value
3. Update `src/config/env.ts` to read the variable
4. Add to `__mocks__/react-native-config.js` for tests
5. Add to GitHub Secrets if needed for CI/CD
6. Document in this file
7. Update `docs/ENV_SETUP.md` if needed
