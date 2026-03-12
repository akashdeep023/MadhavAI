/**
 * Content Management and Update System
 *
 * Exports all content management services for remote updates,
 * versioning, sync timing, and A/B testing.
 */

export { default as ContentVersionManager } from './ContentVersionManager';
export type {
  ContentVersion,
  VersionHistory,
  RollbackResult,
  ContentType,
} from './ContentVersionManager';

export { default as RemoteContentUpdateService } from './RemoteContentUpdateService';
export type { RemoteContentUpdate, UpdateCheckResult } from './RemoteContentUpdateService';

export { default as ContentUpdateAuditLogger } from './ContentUpdateAuditLogger';
export type { AuditLogEntry, AuditLogQuery } from './ContentUpdateAuditLogger';

export { default as ContentSyncService } from './ContentSyncService';
export type { SyncWindow, SyncStatus, CriticalUpdate } from './ContentSyncService';

export { default as RecommendationABTestingService } from './RecommendationABTestingService';
export type {
  RecommendationTest,
  RecommendationVariant,
  UserVariantAssignment,
  AcceptanceEvent,
  VariantMetrics,
  TestResults,
} from './RecommendationABTestingService';
