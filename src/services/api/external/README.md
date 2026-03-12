# External API Integration Layer

This module provides a standardized interface for integrating with external APIs for the Farmer Decision Support Platform.

## Overview

The external API integration layer implements all requirements from the design specification (Requirements 19.1-19.8):

- **19.1**: Integration with government scheme databases
- **19.2**: Integration with weather APIs for location-specific forecasts
- **19.3**: Integration with mandi price databases
- **19.4**: Integration with agricultural research databases
- **19.5**: Fallback to cached data when APIs unavailable with staleness indicators
- **19.6**: Data validation before storage
- **19.7**: Request/response logging for monitoring and debugging
- **19.8**: Retry logic with exponential backoff (1s, 2s, 4s, 8s, 16s)

## Architecture

### Base External API Client

The `BaseExternalAPIClient` provides common functionality for all external API integrations:

- **Retry Logic**: Automatic retry with exponential backoff (up to 5 retries)
- **Caching**: Intelligent caching with configurable expiration
- **Fallback**: Automatic fallback to stale cached data when APIs fail
- **Logging**: Comprehensive request/response logging
- **Validation**: Abstract validation interface for data integrity

### API Clients

#### 1. Government Scheme API Client

Integrates with government scheme databases (e.g., PM-KISAN, PMFBY, KCC).

```typescript
import { governmentSchemeAPIClient } from './services/api/external';

// Fetch all schemes
const schemes = await governmentSchemeAPIClient.fetchSchemes();

// Fetch schemes by state
const stateSchemes = await governmentSchemeAPIClient.fetchSchemesByState('Maharashtra');

// Fetch scheme by ID
const scheme = await governmentSchemeAPIClient.fetchSchemeById('pm-kisan-2024');

// Check data staleness
const staleness = await governmentSchemeAPIClient.getDataStaleness(cacheKey);
console.log(staleness.message); // "Data is 2.5 hours old (fresh)"
```

**Configuration**:
- Base URL: `https://api.gov.in/schemes`
- Timeout: 15 seconds
- Cache Duration: 7 days
- Max Retries: 5

#### 2. Weather API Client

Integrates with weather APIs for location-specific forecasts.

```typescript
import { weatherAPIClient } from './services/api/external';

// Fetch 7-day forecast
const forecast = await weatherAPIClient.fetchForecast(12.9716, 77.5946);

// Fetch current weather
const current = await weatherAPIClient.fetchCurrentWeather(12.9716, 77.5946);

// Fetch weather alerts
const alerts = await weatherAPIClient.fetchAlerts(12.9716, 77.5946);

// Check data staleness
const staleness = await weatherAPIClient.getDataStaleness(12.9716, 77.5946);
```

**Configuration**:
- Base URL: `https://api.weather.gov.in`
- Timeout: 10 seconds
- Cache Duration: 6 hours
- Max Retries: 5

#### 3. Mandi Price API Client

Integrates with mandi price databases (AGMARKNET, eNAM).

```typescript
import { mandiPriceAPIClient } from './services/api/external';

// Fetch prices for location
const prices = await mandiPriceAPIClient.fetchPrices(
  12.9716,
  77.5946,
  ['Wheat', 'Rice'],
  50 // radius in km
);

// Fetch nearby mandis
const mandis = await mandiPriceAPIClient.fetchNearbyMandis(12.9716, 77.5946, 50);

// Fetch price trend
const trend = await mandiPriceAPIClient.fetchPriceTrend('Wheat', 'Karnataka', 'Bangalore', 30);

// Check data staleness
const staleness = await mandiPriceAPIClient.getDataStaleness(12.9716, 77.5946);
```

**Configuration**:
- Base URL: `https://api.data.gov.in/agmarknet`
- Timeout: 12 seconds
- Cache Duration: 24 hours
- Max Retries: 5

#### 4. Agricultural Research API Client

Integrates with agricultural research databases (ICAR, state agricultural universities).

```typescript
import { agriculturalResearchAPIClient } from './services/api/external';

// Fetch best practices for a crop
const practices = await agriculturalResearchAPIClient.fetchBestPractices(
  'Wheat',
  'Karnataka',
  'Rabi'
);

// Fetch pest management data
const pestData = await agriculturalResearchAPIClient.fetchPestManagement('Wheat', 'Aphids');

// Fetch soil management data
const soilData = await agriculturalResearchAPIClient.fetchSoilManagement('Red Soil');

// Check data staleness
const staleness = await agriculturalResearchAPIClient.getDataStaleness('Wheat');
```

**Configuration**:
- Base URL: `https://api.icar.gov.in/research`
- Timeout: 15 seconds
- Cache Duration: 30 days
- Max Retries: 5

## Features

### 1. Exponential Backoff Retry Logic

All API clients automatically retry failed requests with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: 1 second delay
- **Attempt 3**: 2 seconds delay
- **Attempt 4**: 4 seconds delay
- **Attempt 5**: 8 seconds delay
- **Attempt 6**: 16 seconds delay

**Note**: Client errors (4xx) are not retried.

### 2. Intelligent Caching

Each API client caches responses with configurable expiration:

```typescript
// Cache is checked first
const data = await client.fetchData();

// If cache is valid, returns cached data
// If cache is expired, fetches fresh data and updates cache
// If API fails, falls back to stale cached data
```

### 3. Fallback to Stale Cache

When external APIs are unavailable, the system automatically falls back to stale cached data:

```typescript
try {
  const data = await client.fetchData();
  // Fresh or cached data
} catch (error) {
  // Automatically tries stale cache before throwing
}
```

### 4. Staleness Indicators

Check the age and freshness of cached data:

```typescript
const staleness = await client.getDataStaleness(params);

console.log(staleness.isStale); // true/false
console.log(staleness.ageHours); // 3.5
console.log(staleness.message); // "Data is 3.5 hours old (fresh)"
```

### 5. Data Validation

All external data is validated before caching:

```typescript
protected validateData(data: any): ValidationResult {
  const errors: string[] = [];
  
  // Validate required fields
  if (!data.id) {
    errors.push('Missing id field');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### 6. Request/Response Logging

All API calls are logged for monitoring and debugging:

```typescript
// Logged information:
{
  endpoint: '/schemes/list',
  method: 'GET',
  parameters: { state: 'Karnataka' },
  timestamp: Date,
  statusCode: 200,
  latency: 1234, // milliseconds
  dataSize: 5678, // bytes
  success: true
}
```

## Error Handling

### Network Errors

Network errors trigger automatic retry with exponential backoff:

```typescript
try {
  const data = await client.fetchData();
} catch (error) {
  // After all retries exhausted, falls back to stale cache
  // If no cache available, throws error
}
```

### Validation Errors

Data validation errors are thrown immediately:

```typescript
try {
  const data = await client.fetchData();
} catch (error) {
  // "Invalid scheme data: Missing id field, Missing name field"
}
```

### Client Errors (4xx)

Client errors are not retried and throw immediately:

```typescript
try {
  const data = await client.fetchData();
} catch (error) {
  // "Bad Request" - no retry attempted
}
```

## Testing

### Unit Tests

Run unit tests for the base client:

```bash
npm test -- BaseExternalAPIClient.test.ts
```

### Integration Tests

Run integration tests for all API clients:

```bash
npm test -- ExternalAPIIntegration.test.ts
```

### Test Coverage

The test suite covers:

- ✅ Retry logic with exponential backoff
- ✅ Caching and cache expiration
- ✅ Fallback to stale cache
- ✅ Data validation
- ✅ Request/response logging
- ✅ Error handling
- ✅ Staleness indicators

## Configuration

### Custom Retry Configuration

```typescript
const client = new BaseExternalAPIClient(
  'CustomAPI',
  'https://api.example.com',
  10000, // timeout
  24 * 60 * 60 * 1000, // cache duration
  {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 8000
  }
);
```

### Custom Cache Duration

```typescript
const client = new BaseExternalAPIClient(
  'CustomAPI',
  'https://api.example.com',
  10000,
  12 * 60 * 60 * 1000 // 12 hours cache
);
```

## Monitoring

### API Call Logs

API call logs are stored in encrypted storage:

```typescript
const log = {
  endpoint: '/schemes/list',
  method: 'GET',
  parameters: { state: 'Karnataka' },
  timestamp: new Date(),
  statusCode: 200,
  latency: 1234,
  dataSize: 5678,
  success: true
};
```

### Staleness Monitoring

Monitor cache staleness across all APIs:

```typescript
const weatherStaleness = await weatherAPIClient.getDataStaleness(lat, lon);
const priceStaleness = await mandiPriceAPIClient.getDataStaleness(lat, lon);
const schemeStaleness = await governmentSchemeAPIClient.getDataStaleness(cacheKey);
```

## Best Practices

1. **Always handle errors**: External APIs can fail, always wrap calls in try-catch
2. **Check staleness**: Display staleness indicators to users when using cached data
3. **Monitor logs**: Regularly review API call logs for performance issues
4. **Validate data**: Implement thorough validation for all external data
5. **Test fallbacks**: Ensure stale cache fallback works correctly

## Future Enhancements

- [ ] Circuit breaker pattern for failing APIs
- [ ] Rate limiting and throttling
- [ ] API health monitoring dashboard
- [ ] Automatic cache warming
- [ ] Compression for large responses
- [ ] WebSocket support for real-time updates

## License

This module is part of the Farmer Decision Support Platform and follows the project's license.
