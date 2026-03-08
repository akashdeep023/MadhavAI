/**
 * Automated Failover Handler
 * Triggers failover to backup region when primary region health check fails
 * RTO Target: 1 hour
 */

const { 
  Route53Client, 
  ChangeResourceRecordSetsCommand,
  GetHealthCheckStatusCommand 
} = require('@aws-sdk/client-route-53');
const { 
  DynamoDBClient, 
  DescribeGlobalTableCommand 
} = require('@aws-sdk/client-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const route53 = new Route53Client();
const dynamodb = new DynamoDBClient();
const sns = new SNSClient();
const cloudwatch = new CloudWatchClient();

const PRIMARY_REGION = process.env.PRIMARY_REGION;
const BACKUP_REGION = process.env.BACKUP_REGION;
const PROJECT_NAME = process.env.PROJECT_NAME;
const ENVIRONMENT = process.env.ENVIRONMENT;

exports.handler = async (event) => {
  console.log('Failover triggered:', JSON.stringify(event, null, 2));
  
  const startTime = Date.now();
  const failoverSteps = [];
  
  try {
    // Step 1: Verify primary region is actually down
    failoverSteps.push({ step: 'verify_primary_down', status: 'started' });
    const isPrimaryDown = await verifyPrimaryDown();
    
    if (!isPrimaryDown) {
      console.log('Primary region is healthy, aborting failover');
      failoverSteps.push({ step: 'verify_primary_down', status: 'aborted' });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Primary region healthy, no failover needed' })
      };
    }
    failoverSteps.push({ step: 'verify_primary_down', status: 'completed' });
    
    // Step 2: Verify backup region is healthy
    failoverSteps.push({ step: 'verify_backup_healthy', status: 'started' });
    const isBackupHealthy = await verifyBackupRegion();
    
    if (!isBackupHealthy) {
      throw new Error('Backup region is not healthy, cannot failover');
    }
    failoverSteps.push({ step: 'verify_backup_healthy', status: 'completed' });
    
    // Step 3: Update Route53 to point to backup region
    failoverSteps.push({ step: 'update_dns', status: 'started' });
    await updateRoute53ToBackup();
    failoverSteps.push({ step: 'update_dns', status: 'completed' });
    
    // Step 4: Verify DynamoDB global tables are synced
    failoverSteps.push({ step: 'verify_data_sync', status: 'started' });
    await verifyDataSync();
    failoverSteps.push({ step: 'verify_data_sync', status: 'completed' });
    
    // Step 5: Send notification
    const duration = Date.now() - startTime;
    await sendFailoverNotification('SUCCESS', duration, failoverSteps);
    
    // Step 6: Record metrics
    await recordFailoverMetrics(duration, 'success');
    
    console.log(`Failover completed successfully in ${duration}ms`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Failover completed successfully',
        duration: duration,
        steps: failoverSteps
      })
    };
    
  } catch (error) {
    console.error('Failover failed:', error);
    
    const duration = Date.now() - startTime;
    await sendFailoverNotification('FAILED', duration, failoverSteps, error.message);
    await recordFailoverMetrics(duration, 'failed');
    
    throw error;
  }
};

async function verifyPrimaryDown() {
  // Check if primary region API is responding
  try {
    const response = await fetch(`https://api.${PROJECT_NAME}.com/health`);
    return !response.ok;
  } catch (error) {
    console.log('Primary region unreachable:', error.message);
    return true;
  }
}

async function verifyBackupRegion() {
  // Check if backup region is healthy
  try {
    const backupClient = new DynamoDBClient({ region: BACKUP_REGION });
    const command = new DescribeGlobalTableCommand({
      GlobalTableName: `${PROJECT_NAME}-users-${ENVIRONMENT}`
    });
    
    const response = await backupClient.send(command);
    return response.GlobalTableDescription.GlobalTableStatus === 'ACTIVE';
  } catch (error) {
    console.error('Backup region check failed:', error);
    return false;
  }
}

async function updateRoute53ToBackup() {
  // This is a placeholder - actual implementation would update Route53 records
  // to point to backup region API Gateway endpoint
  console.log('Updating Route53 to point to backup region');
  
  // In production, this would:
  // 1. Get the hosted zone ID
  // 2. Update A/CNAME records to point to backup region
  // 3. Wait for DNS propagation
  
  return true;
}

async function verifyDataSync() {
  // Verify DynamoDB global tables are in sync
  const tables = [
    'users',
    'crop-plans',
    'schemes',
    'market-prices',
    'alerts',
    'training-lessons'
  ];
  
  for (const table of tables) {
    const command = new DescribeGlobalTableCommand({
      GlobalTableName: `${PROJECT_NAME}-${table}-${ENVIRONMENT}`
    });
    
    const response = await dynamodb.send(command);
    const replicas = response.GlobalTableDescription.ReplicationGroup;
    
    const backupReplica = replicas.find(r => r.RegionName === BACKUP_REGION);
    if (!backupReplica || backupReplica.ReplicaStatus !== 'ACTIVE') {
      throw new Error(`Table ${table} not synced in backup region`);
    }
  }
  
  console.log('All tables verified in sync');
  return true;
}

async function sendFailoverNotification(status, duration, steps, errorMessage = null) {
  const message = {
    subject: `[${status}] Disaster Recovery Failover - ${PROJECT_NAME}`,
    timestamp: new Date().toISOString(),
    status: status,
    duration: `${duration}ms`,
    primaryRegion: PRIMARY_REGION,
    backupRegion: BACKUP_REGION,
    steps: steps,
    error: errorMessage
  };
  
  const command = new PublishCommand({
    TopicArn: process.env.SNS_TOPIC_ARN,
    Subject: message.subject,
    Message: JSON.stringify(message, null, 2)
  });
  
  await sns.send(command);
}

async function recordFailoverMetrics(duration, status) {
  const command = new PutMetricDataCommand({
    Namespace: `${PROJECT_NAME}/DisasterRecovery`,
    MetricData: [
      {
        MetricName: 'FailoverDuration',
        Value: duration,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      },
      {
        MetricName: 'FailoverAttempts',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date(),
        Dimensions: [
          {
            Name: 'Status',
            Value: status
          }
        ]
      }
    ]
  });
  
  await cloudwatch.send(command);
}
