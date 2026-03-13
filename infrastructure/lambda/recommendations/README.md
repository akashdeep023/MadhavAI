# Recommendations Lambda - Performance Optimizations

## Overview
This Lambda function provides AI-powered crop recommendations using AWS Bedrock with comprehensive performance optimizations to ensure sub-5-second response times.

## Performance Features

### 1. Multi-Layer Caching
- **Memory Cache**: In-memory cache for Lambda warm starts (5-minute TTL)
- **DynamoDB Cache**: Persistent cache for recommendations (24-hour TTL)
- **Cache Key Strategy**: Based on userId, season, and soil characteristics

### 2. Timeout Management
- **Bedrock Timeout**: 4 seconds (stays within 5-second total limit)
- **Retry Logic**: Up to 2 retries with exponential backoff
- **Graceful Degradation**: Falls back to rule-based recommendations on timeout

### 3. Request Optimization
- **Exponential Backoff**: 500ms base delay, doubles on each retry
- **Timeout Promise**: Prevents hanging requests
- **Early Cache Returns**: Memory cache returns in <10ms

### 4. Monitoring & Logging
- **Usage Metrics**: Tracks Bedrock usage, cache hits, processing time
- **Error Metrics**: Logs Bedrock errors for alerting
- **Cost Tracking**: Monitors API calls for cost optimization

## Configuration

### Environment Variables
- `CACHE_TABLE`: DynamoDB table for caching (default: recommendations-cache)
- `ENABLE_CACHE`: Enable/disable caching (default: true)
- `SOIL_HEALTH_TABLE`: Soil health data table
- `USERS_TABLE`: User profiles table

### Performance Targets
- **Total Response Time**: < 5 seconds (requirement)
- **Bedrock API Call**: < 4 seconds
- **Cache Hit Response**: < 100ms
- **Memory Cache Hit**: < 10ms

## Cache Strategy

### Cache Key Format
```
rec-{userId}-{season}-{soilType}-{pH}
```

### Cache Invalidation
- **Automatic**: TTL-based expiration (24 hours)
- **Manual**: Can be cleared by deleting cache entries
- **Seasonal**: New cache per season change

### Cache Hit Scenarios
1. **Memory Cache Hit**: Same request within 5 minutes (warm Lambda)
2. **DynamoDB Cache Hit**: Same request within 24 hours
3. **Cache Miss**: Fresh Bedrock call or rule-based fallback

## Monitoring

### CloudWatch Metrics
Look for these log patterns:
- `USAGE_METRIC`: Processing time, cache hits, Bedrock usage
- `BEDROCK_ERROR_METRIC`: Bedrock API errors
- `Cache hit: memory cache`: Memory cache success
- `Cache hit: DynamoDB cache`: DynamoDB cache success

### Performance Alerts
Set up CloudWatch alarms for:
- Processing time > 5 seconds
- Bedrock error rate > 5%
- Cache miss rate > 80%

## Cost Optimization

### Bedrock API Costs
- **Cache Hit**: $0 (no API call)
- **Cache Miss**: ~$0.003 per request (Claude 3 Sonnet)
- **Expected Cache Hit Rate**: 70-80%

### DynamoDB Costs
- **Read**: ~$0.00025 per request
- **Write**: ~$0.00125 per cache update
- **Storage**: Minimal (auto-expires after 24 hours)

## Testing

Run performance tests:
```bash
cd infrastructure/lambda/recommendations
npm test
```

## Troubleshooting

### High Response Times
1. Check Bedrock API latency in CloudWatch
2. Verify cache hit rate
3. Check Lambda memory allocation (1024 MB recommended)
4. Review retry attempts in logs

### Low Cache Hit Rate
1. Verify cache table exists and is accessible
2. Check TTL configuration
3. Review cache key generation logic
4. Ensure Lambda has DynamoDB permissions

### Bedrock Errors
1. Verify Bedrock model access in AWS Console
2. Check IAM permissions for `bedrock:InvokeModel`
3. Review error logs for specific error types
4. Ensure region supports Bedrock (ap-south-1)
