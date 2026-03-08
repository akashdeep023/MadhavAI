# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Farmer Decision Support Platform.

## Workflows Overview

### 1. Backend CI/CD Pipeline (`backend-ci-cd.yml`)

**Purpose**: Automated deployment of backend infrastructure and serverless functions to AWS.

**Triggers**:
- Push to `main` branch → Deploys to production
- Push to `develop` branch → Deploys to staging
- Pull requests to `main` or `develop` → Runs tests only

**What it does**:
- **Build & Test**: Installs dependencies, runs linter, executes unit tests with coverage
- **Security Scan**: Runs npm audit and Snyk vulnerability scanning
- **Deploy to Staging** (develop branch):
  - Builds Lambda function packages
  - Deploys AWS infrastructure using Terraform
  - Runs end-to-end tests
- **Deploy to Production** (main branch):
  - Deploys infrastructure with Terraform
  - Blue-green deployment with canary releases:
    - 10% traffic → Monitor for 5 minutes
    - 50% traffic → Monitor for 5 minutes
    - 100% traffic → Complete deployment
  - Automatic rollback on errors
  - Slack notifications

**Technologies**:
- Node.js 20.x
- Terraform 1.6.0
- AWS Lambda, API Gateway, DynamoDB, S3, CloudFront
- AWS regions: ap-south-1 (Mumbai), ap-southeast-1 (Singapore)

**Required Secrets**:
- `AWS_ACCESS_KEY_ID` - AWS credentials for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `ALERT_EMAIL` - Email for CloudWatch alerts
- `STAGING_API_URL` - Staging API endpoint for E2E tests
- `SLACK_WEBHOOK` - Slack webhook for deployment notifications
- `SNYK_TOKEN` - Snyk API token for security scanning

**How to Add Secrets**:
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** button
5. Enter the secret name (e.g., `AWS_ACCESS_KEY_ID`)
6. Enter the secret value
7. Click **Add secret**
8. Repeat for all required secrets listed above

---

### 2. Mobile CI/CD Pipeline (`mobile-ci-cd.yml`)

**Purpose**: Continuous integration for the React Native mobile application.

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**What it does**:
- **Lint & Test**:
  - Installs dependencies
  - Runs ESLint linter
  - Checks code formatting with Prettier
  - Runs TypeScript type checking
  - Executes unit tests with coverage
  - Uploads coverage reports to Codecov
- **Build Android**:
  - Sets up Java 17 and Node.js
  - Builds Android release APK
  - Uploads APK as artifact (available for 90 days)

**Technologies**:
- React Native
- Node.js 22.11.0
- Java 17 (Temurin distribution)
- Android Gradle build system

**Artifacts**:
- `app-release.apk` - Android release build (available in workflow run)

**Note**: This workflow does NOT deploy the mobile app. It only builds and tests. Deployment to Google Play Store is handled separately.

---

## Workflow Comparison

| Feature | Backend CI/CD | Mobile CI/CD |
|---------|---------------|-----------|
| **Purpose** | Deploy backend infrastructure | Build and test mobile app |
| **Deployment** | ✅ Yes (AWS) | ❌ No |
| **Testing** | Unit tests, E2E tests | Unit tests only |
| **Build Output** | Lambda .zip files | Android APK |
| **Security Scan** | ✅ Yes | ❌ No |
| **Environments** | Staging, Production | N/A |
| **Deployment Strategy** | Blue-green with canary | N/A |

---

## Local Development

### Running Backend Tests Locally
```bash
npm ci
npm run lint
npm test -- --coverage
npm run build:lambda
```

### Running Mobile Tests Locally
```bash
npm ci
npm run lint
npm run format:check
npm run type-check
npm run test:coverage
```

### Building Android APK Locally
```bash
cd android
./gradlew assembleRelease
```

---

## Deployment Process

### Backend Deployment Flow

**Staging** (develop branch):
```
Code Push → Build & Test → Security Scan → Terraform Deploy → E2E Tests
```

**Production** (main branch):
```
Code Push → Build & Test → Security Scan → Terraform Deploy → 
Canary 10% → Monitor → 50% → Monitor → 100% → Slack Notification
```

### Mobile Deployment Flow

Mobile app deployment is **manual** and follows this process:
1. CI/CD builds and tests the APK
2. Download APK artifact from GitHub Actions
3. Manual testing on devices
4. Upload to Google Play Console
5. Staged rollout: 10% → 25% → 50% → 100%

---

## Monitoring

### Backend Monitoring
- CloudWatch dashboards for Lambda, API Gateway, DynamoDB metrics
- CloudWatch alarms for error rates, latency, throttling
- X-Ray distributed tracing
- SNS email alerts for critical issues

### Mobile Monitoring
- Codecov for test coverage tracking
- GitHub Actions build status
- Manual testing reports

---

## Troubleshooting

### Backend CI/CD Issues

**Terraform fails**:
- Check AWS credentials are valid
- Verify S3 backend bucket exists
- Check DynamoDB state lock table

**Deployment rollback**:
- Automatic rollback occurs if error rate > 10 in 5 minutes
- Manual rollback: Run `./infrastructure/scripts/rollback.sh`

**Lambda deployment fails**:
- Verify Lambda .zip files are built correctly
- Check IAM permissions for Lambda execution role

### Mobile CI/CD Issues

**Android build fails**:
- Check Java version (requires 17)
- Verify Gradle wrapper is executable
- Check Android SDK dependencies

**Tests fail**:
- Run tests locally to reproduce
- Check test coverage requirements
- Verify all dependencies are installed

---

## Adding New Workflows

To add a new workflow:

1. Create a new `.yml` file in `.github/workflows/`
2. Define triggers, jobs, and steps
3. Add required secrets in GitHub repository settings
4. Test with a pull request
5. Update this README with workflow documentation

---

## Best Practices

1. **Always test locally** before pushing
2. **Use pull requests** for code review
3. **Monitor deployments** in CloudWatch
4. **Check Slack notifications** for deployment status
5. **Review security scan results** before merging
6. **Keep secrets secure** - never commit credentials
7. **Use staging** for testing before production

---

## GitHub Secrets Configuration

### Where to Add Secrets

GitHub Secrets are stored at the repository level and accessed by workflows during execution.

**Step-by-Step Guide**:

1. **Navigate to Repository Settings**
   - Go to your GitHub repository: `https://github.com/YOUR_USERNAME/YOUR_REPO`
   - Click the **Settings** tab (top right)

2. **Access Secrets Section**
   - In the left sidebar, expand **Secrets and variables**
   - Click **Actions**

3. **Add New Secret**
   - Click the **New repository secret** button (green button, top right)
   - Enter the **Name** (must match exactly as shown in workflows)
   - Enter the **Secret** value
   - Click **Add secret**

4. **Verify Secret Added**
   - The secret will appear in the list (value is hidden)
   - You can update or delete secrets from this page

### Required Secrets for Backend CI/CD

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | AWS Console → IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | Generated with access key (save immediately) |
| `ALERT_EMAIL` | Email for CloudWatch alerts | Your team's monitoring email |
| `STAGING_API_URL` | Staging API endpoint | After first staging deployment |
| `SLACK_WEBHOOK` | Slack webhook URL | Slack → Apps → Incoming Webhooks |
| `SNYK_TOKEN` | Snyk API token | Snyk.io → Account Settings → API Token |

### Required Secrets for Mobile CI/CD

Currently, the mobile CI/CD workflow doesn't require secrets. If you add deployment to Google Play Store, you'll need:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `PLAY_STORE_JSON_KEY` | Google Play service account key | Google Play Console → API access |
| `KEYSTORE_FILE` | Android signing keystore (base64) | Generate with `keytool` command |
| `KEYSTORE_PASSWORD` | Keystore password | Set when creating keystore |
| `KEY_ALIAS` | Key alias name | Set when creating keystore |
| `KEY_PASSWORD` | Key password | Set when creating keystore |

### Environment-Specific Secrets

For staging and production environments:

1. **Create Environments**
   - Go to **Settings** → **Environments**
   - Click **New environment**
   - Name it `staging` or `production`
   - Click **Configure environment**

2. **Add Environment Secrets**
   - In the environment page, scroll to **Environment secrets**
   - Click **Add secret**
   - Add environment-specific secrets (e.g., different API URLs)

3. **Environment Protection Rules** (Optional)
   - Add required reviewers for production
   - Set deployment branch restrictions
   - Configure wait timer before deployment

### Security Best Practices

✅ **DO**:
- Rotate secrets regularly (every 90 days)
- Use least-privilege IAM policies for AWS credentials
- Store secrets only in GitHub Secrets (never in code)
- Use environment-specific secrets for staging/production
- Enable 2FA on accounts that generate secrets

❌ **DON'T**:
- Commit secrets to git (check with `git log -p | grep -i secret`)
- Share secrets via email or chat
- Use production secrets in staging
- Give secrets overly broad permissions
- Log secret values in workflow outputs

### Testing Secrets Configuration

After adding secrets, test them:

```bash
# Trigger a workflow run
git commit --allow-empty -m "Test secrets configuration"
git push origin develop

# Check workflow logs
# Go to Actions tab → Select workflow run → Check for authentication errors
```

### Troubleshooting Secrets

**Secret not found error**:
- Verify secret name matches exactly (case-sensitive)
- Check secret is added at repository level (not organization)
- Ensure workflow has access to the secret

**Authentication failed**:
- Verify secret value is correct (no extra spaces)
- Check AWS credentials have required permissions
- Ensure API tokens haven't expired

**Secret not updating**:
- Delete and re-add the secret
- Clear GitHub Actions cache
- Trigger a new workflow run

---

## Version Information

### Current Versions (Verified ✅)

| Component | Version | Used In | Status |
|-----------|---------|---------|--------|
| Node.js | 22.11.0 | Both workflows | ✅ Matches package.json |
| GitHub Actions (checkout) | v4 | Both workflows | ✅ Latest |
| GitHub Actions (setup-node) | v4 | Both workflows | ✅ Latest |
| GitHub Actions (setup-java) | v4 | Mobile workflow | ✅ Latest |
| GitHub Actions (upload-artifact) | v4 | Both workflows | ✅ Latest |
| GitHub Actions (download-artifact) | v4 | Backend workflow | ✅ Latest |
| AWS Configure Credentials | v4 | Backend workflow | ✅ Latest |
| Terraform | 1.6.0 | Backend workflow | ✅ Stable |
| Java (Temurin) | 17 | Mobile workflow | ✅ LTS |
| Codecov | v3 | Both workflows | ✅ Latest |
| Snyk | master | Backend workflow | ✅ Latest |
| Slack Action | v3 | Backend workflow | ✅ Latest |

### Version Maintenance

**When to Update**:
- Node.js: When package.json engines requirement changes
- GitHub Actions: When new major versions are released
- Terraform: When infrastructure requires new features
- Java: Keep on LTS version (currently 17)

**How to Update**:
1. Update version in workflow file
2. Test in a feature branch
3. Verify all jobs pass
4. Update this documentation
5. Merge to main

---

## Support

For issues with workflows:
- Check GitHub Actions logs for error details
- Review CloudWatch logs for backend issues
- Contact DevOps team for infrastructure problems
- Check Slack #deployments channel for notifications
