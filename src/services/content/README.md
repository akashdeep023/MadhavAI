# Content Management and Update System

This module implements a comprehensive content management system for the Farmer Decision Support Platform, enabling remote content updates, versioning, scheduled releases, and A/B testing without requiring app store updates.

## Overview

The content management system consists of five main components:

1. **ContentVersionManager** - Manages content versioning and rollback
2. **RemoteContentUpdateService** - Handles remote content updates
3. **ContentUpdateAuditLogger** - Logs all content changes for audit
4. **ContentSyncService** - Manages sync timing and propagation
5. **RecommendationABTestingService** - A/B testing for recommendations

## Features

### 1. Content Versioning (Requirement 18.5)

- Version tracking for all content types (schemes, lessons, alert templates, configs)
- Semantic versioning (1.0.0, 1.0.1, etc.)
- Version history with metadata
- Rollback capability to previous versions
- Maximum 10 versions per content item (automatic cleanup)

**Usage:**

```typescript
import { ContentVersionManager } from '@/services/content';

const versionManager = ContentVersionManager.getInstance();

// Create a new version
const version = await versionManager.createVersion(
  'scheme',
  'pm-kisan',
  { name: 'PM-KISAN', benefits: ['Direct income support'] },
  {
    author: 'admin',
    description: 'Updated eligibility criteria',
    releaseNotes: 'Added new income limits',
  }
);

// Publish version
await versionManager.publishVersion('scheme', 'pm-kisan', version.version);

// Rollback if needed
const result = await versionManager.rollback('scheme', 'pm-kisan', '1.0.0');
```

### 2. Remote Content Updates (Requirement 18.1)

- Over-the-air (OTA) content updates without app store approval
- Checksum verification for content integrity
- Priority-based update processing (critical, high, medium, low)
- Automatic filtering of already-installed updates

**Usage:**

```typescript
import { RemoteContentUpdateService } from '@/services/content';

const updateService = RemoteContentUpdateService.getInstance();

// Check for available updates
const result = await updateService.checkForUpdates(['scheme', 'lesson']);

if (result.available) {
  // Apply all updates
  const applyResult = await updateService.applyUpdates(result.updates);
  console.log(`Applied ${applyResult.successful} updates`);
}

// Rollback content if issues detected
await updateService.rollbackContent('scheme', 'scheme_001', '1.0.0');
```

### 3. Scheduled Content Releases (Requirement 18.7)

- Schedule content releases for specific dates/times
- Automatic publishing at scheduled time
- Support for future-dated releases

**Usage:**

```typescript
import { ContentVersionManager } from '@/services/content';

const versionManager = ContentVersionManager.getInstance();

// Schedule a release for next week
const releaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const version = await versionManager.createVersion(
  'lesson',
  'organic-farming',
  { title: 'Advanced Organic Farming Techniques' },
  {
    author: 'expert@agriculture.gov',
    description: 'New lesson on organic farming',
  },
  releaseDate
);

// Process scheduled releases (called automatically by sync service)
await RemoteContentUpdateService.getInstance().processScheduledReleases();
```

### 4. Content Sync Timing (Requirements 18.2, 18.3, 18.4)

Different content types have different sync windows:

- **Training content (lessons)**: 24-hour sync window
- **Scheme changes**: 12-hour update window
- **Alert templates**: 6-hour sync window
- **Critical updates (config)**: 1-hour sync window + forced sync on launch

**Usage:**

```typescript
import { ContentSyncService } from '@/services/content';

const syncService = ContentSyncService.getInstance();

// Initialize (checks for critical updates and starts periodic sync)
await syncService.initialize();

// Force sync for critical updates (blocking)
const success = await syncService.forceCriticalSync();

// Manual sync
await syncService.syncContent();

// Sync specific content type
await syncService.syncContentType('scheme');

// Mark update as critical (forces sync on next launch)
await syncService.markAsCritical(
  'config',
  'security_config',
  '2.0.0',
  'Security vulnerability patch'
);
```

### 5. Audit Logging (Requirement 18.6)

All content updates are logged with:
- Timestamp
- User/admin identifier
- Content type and ID
- Version
- Action (created, published, scheduled, rollback, archived)
- Changes made

**Usage:**

```typescript
import { ContentUpdateAuditLogger } from '@/services/content';

const auditLogger = ContentUpdateAuditLogger.getInstance();

// Query logs
const recentLogs = await auditLogger.getRecentLogs(50);
const contentLogs = await auditLogger.getContentLogs('scheme', 'pm-kisan');
const rollbackLogs = await auditLogger.getLogsByAction('rollback');

// Get statistics
const stats = await auditLogger.getStatistics();
console.log(`Total logs: ${stats.totalLogs}`);
console.log(`Recent activity (24h): ${stats.recentActivity}`);

// Export logs
const logsJson = await auditLogger.exportLogs({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});
```

### 6. A/B Testing for Recommendations (Requirement 18.8)

Test different recommendation algorithms with user segments:

- Random user assignment to variants
- Consistent assignment (same user always gets same variant)
- Acceptance rate tracking
- Local and remote metrics

**Usage:**

```typescript
import { RecommendationABTestingService } from '@/services/content';

const abTestingService = RecommendationABTestingService.getInstance();

// Initialize
await abTestingService.initialize();

// Get variant assignment for user
const variantId = await abTestingService.getVariantAssignment(
  'crop_recommendation_v2',
  'crop'
);

if (variantId) {
  // Get variant configuration
  const config = await abTestingService.getVariantConfig('crop_recommendation_v2');
  
  // Use config to customize recommendation algorithm
  const recommendations = await generateRecommendations(config);
  
  // Track acceptance
  await abTestingService.trackAcceptance(
    'crop_recommendation_v2',
    'crop',
    'rec_12345',
    true, // accepted
    { cropType: 'wheat', season: 'rabi' }
  );
}

// Get test results
const results = await abTestingService.getTestResults('crop_recommendation_v2');
console.log(`Winner: ${results.winner} with ${results.confidence}% confidence`);

// Calculate local acceptance rate
const rate = await abTestingService.calculateLocalAcceptanceRate(
  'crop_recommendation_v2',
  'variant_a'
);
```

## Content Types

The system supports the following content types:

- `scheme` - Government schemes and subsidies
- `lesson` - Training lessons and educational content
- `alert_template` - Alert message templates
- `config` - Application configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         ContentVersionManager                         │  │
│  │  - Version tracking                                   │  │
│  │  - Rollback capability                                │  │
│  │  - Scheduled releases                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │    RemoteContentUpdateService                         │  │
│  │  - Check for updates                                  │  │
│  │  - Download and verify content                        │  │
│  │  - Apply updates                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │         ContentSyncService                            │  │
│  │  - Sync timing windows                                │  │
│  │  - Critical update enforcement                        │  │
│  │  - Periodic sync                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │    ContentUpdateAuditLogger                           │  │
│  │  - Log all changes                                    │  │
│  │  - Query and export logs                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RecommendationABTestingService                       │  │
│  │  - User variant assignment                            │  │
│  │  - Acceptance tracking                                │  │
│  │  - Metrics calculation                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/REST
                          │
┌─────────────────────────▼─────────────────────────────────┐
│                   Backend API                              │
│  - /content/updates - Get available updates                │
│  - /content/updates/:type/:id - Get specific update        │
│  - /ab-tests/recommendations/active - Get active tests     │
│  - /ab-tests/recommendations/assignments - Report assignment│
│  - /ab-tests/recommendations/events - Track acceptance     │
└────────────────────────────────────────────────────────────┘
```

## Data Flow

### Content Update Flow

1. **Check for Updates**
   - App checks for updates based on sync windows
   - Backend returns available updates with metadata

2. **Download and Verify**
   - Download content from provided URL
   - Verify checksum for integrity

3. **Create Version**
   - Create new version in local version manager
   - Store content data and metadata

4. **Publish or Schedule**
   - If scheduled, store with release date
   - If immediate, publish and update current version

5. **Audit Log**
   - Log the update with timestamp and details

### A/B Testing Flow

1. **User Assignment**
   - Check if user already assigned to test
   - If not, determine inclusion based on target percentage
   - Assign to variant using consistent hashing
   - Store assignment locally and report to server

2. **Variant Usage**
   - Get variant configuration
   - Apply configuration to recommendation algorithm
   - Generate recommendations using variant settings

3. **Acceptance Tracking**
   - Track user acceptance/rejection of recommendations
   - Store events locally
   - Send to server (with retry on failure)

4. **Results Analysis**
   - Calculate acceptance rates per variant
   - Determine statistical significance
   - Identify winning variant

## Testing

The module includes comprehensive unit tests:

- `ContentVersionManager.test.ts` - Version management tests
- `ContentSyncService.test.ts` - Sync timing and propagation tests
- `RecommendationABTestingService.test.ts` - A/B testing tests

Run tests:

```bash
npm test -- --testPathPattern=content
```

## Error Handling

All services include robust error handling:

- Network failures: Fall back to cached data, retry with exponential backoff
- Checksum failures: Reject update, log error
- Version conflicts: Use timestamp-based resolution
- Storage errors: Cleanup old data, notify user if critical

## Performance Considerations

- **Local Storage**: Maximum 10 versions per content item
- **Audit Logs**: Maximum 1000 logs, automatic cleanup after 90 days
- **Pending Events**: Maximum 100 pending A/B test events
- **Sync Frequency**: Based on content type priority (1-24 hours)

## Security

- Content checksum verification (SHA-256)
- Encrypted local storage for sensitive data
- Audit logging for all changes
- User consent for A/B testing participation

## Future Enhancements

1. **Content Diff**: Show changes between versions
2. **Batch Rollback**: Rollback multiple content items at once
3. **Advanced A/B Testing**: Multi-variate testing, sequential testing
4. **Content Preview**: Preview scheduled releases before publishing
5. **Automated Rollback**: Auto-rollback on error rate threshold
6. **Content Dependencies**: Manage dependencies between content items

## API Integration

### Backend Endpoints Required

```typescript
// Content Updates
GET  /content/updates?contentTypes=scheme,lesson
GET  /content/updates/:contentType/:contentId
POST /content/updates/:contentType/:contentId/publish

// A/B Testing
GET  /ab-tests/recommendations/active?type=crop
GET  /ab-tests/recommendations/:testId
POST /ab-tests/recommendations/assignments
POST /ab-tests/recommendations/events
POST /ab-tests/recommendations/events/batch
GET  /ab-tests/recommendations/:testId/results
GET  /ab-tests/recommendations/:testId/variants/:variantId/metrics
```

## Monitoring

Key metrics to monitor:

- Update success/failure rates
- Sync timing compliance (% within window)
- Critical update application time
- A/B test participation rates
- Acceptance rates by variant
- Audit log volume and growth

## Support

For issues or questions:
- Check audit logs for update history
- Review sync status for timing issues
- Verify network connectivity for update failures
- Check local storage for space issues
