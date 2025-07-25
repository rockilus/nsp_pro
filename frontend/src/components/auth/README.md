# Enhanced Refresh Token Rotation with Network Resilience

This document outlines the enhanced implementation that handles AWS Cognito refresh token rotation with robust network error handling and retry mechanisms.

## Overview

The enhanced implementation addresses the `ERR_NETWORK_CHANGED` error and similar network issues while maintaining security through proper refresh token rotation handling.

## Key Features

### 🌐 **Network Resilience**
- **Automatic retry logic** for network errors (3 attempts with 2-second delays)
- **Network status monitoring** with online/offline detection
- **Smart error classification** (network vs. authentication issues)
- **Graceful degradation** when automatic recovery fails

### 🔄 **Enhanced Token Rotation**
- **Rotation conflict detection** with proper error handling
- **Automatic state cleanup** when rotation conflicts occur
- **User-friendly fallbacks** for manual re-authentication
- **Comprehensive event logging** for debugging

### 📊 **Advanced Monitoring**
- **Real-time network status** tracking
- **Error counters** and timestamps for debugging
- **Token debug component** for development
- **Comprehensive logging** for troubleshooting

## Changes Made

### 1. Configuration Updates (`/frontend/src/config/cognito.ts`)

```typescript
// Enhanced settings for network resilience
checkSessionInterval: 30000, // 30 seconds to reduce frequency
silentRequestTimeout: 45000, // 45 seconds for network issues
accessTokenExpiringNotificationTime: 120, // 2 minutes warning
loadUserInfo: false, // Reduce additional network calls
staleStateAge: 900, // 15 minutes before considering state stale

// Network error detection helper
export const isNetworkError = (error: any): boolean => {
  const networkErrors = [
    "ERR_NETWORK_CHANGED",
    "ERR_INTERNET_DISCONNECTED", 
    "NetworkError",
    "Failed to fetch",
    // ... more error patterns
  ];
  
  return networkErrors.some(errorType => 
    error?.message?.includes(errorType) || 
    error?.toString?.()?.includes(errorType)
  );
};
```

### 2. Enhanced Auth Context (`/frontend/src/contexts/auth-context.tsx`)

#### Network-Aware Refresh Handler
```typescript
const handleNetworkAwareRefresh = async (auth: any): Promise<void> => {
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!auth.user?.refresh_token) {
        throw new Error("No refresh token available");
      }

      await auth.signinSilent();
      // Reset error tracking on success
      localStorage.removeItem("networkErrorCount");
      return;
    } catch (error: any) {
      if (isNetworkError(error) && attempt < maxRetries) {
        console.log(`🔄 Network error, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      throw error;
    }
  }
};
```

#### Enhanced Error Classification
- **Network Errors**: Automatic retry with exponential backoff
- **Rotation Errors**: Clear auth state, allow manual re-authentication
- **Other Errors**: Standard error handling

### 3. Smart Protected Route (`/frontend/src/components/auth/protected-route.tsx`)

#### Multi-State Handling
1. **Network Issues**: Show retry options with network status
2. **Authentication Errors**: Clear error messages with manual sign-in
3. **Loading States**: Appropriate loading indicators
4. **Unauthenticated**: Delayed automatic redirect or manual sign-in

#### User Experience Features
- **10-second auto-retry** for network issues
- **Manual retry buttons** when automatic recovery fails
- **Clear error messaging** for different scenarios
- **Consistent branding** throughout auth flows

### 4. Network Status Monitoring (`/frontend/src/components/auth/network-status.tsx`)

- **Real-time online/offline detection**
- **Network error counter display**
- **Collapsible detailed error information**
- **Integration with browser network events**

## Error Handling Scenarios

### Network Errors (`ERR_NETWORK_CHANGED`, etc.)
1. **Detection**: Automatic classification via `isNetworkError()`
2. **Response**: Retry up to 3 times with 2-second delays
3. **Fallback**: Manual retry option if automatic recovery fails
4. **Tracking**: Error counters and timestamps in localStorage

### Refresh Token Rotation Conflicts
1. **Detection**: `invalid_grant` or refresh token error messages
2. **Response**: Clear auth state, reset error counters
3. **Fallback**: Manual sign-in required (no automatic redirect)
4. **Security**: Complete token cleanup to prevent reuse

### Other Authentication Errors
1. **Detection**: Non-network, non-rotation errors
2. **Response**: Standard error display with retry option
3. **Fallback**: Manual sign-in with clear error messaging

## Monitoring and Debugging

### localStorage Tracking
```typescript
// Error tracking keys
refreshAttempts: number         // Failed refresh attempts
lastRefreshAttempt: timestamp   // Last failed refresh time
networkErrorCount: number       // Network-specific errors
lastNetworkError: timestamp     // Last network error time
lastSuccessfulRefresh: timestamp // Last successful refresh
```

### Console Logging
- **🔄**: Token refresh operations
- **🌐**: Network-related events
- **✅**: Successful operations
- **❌**: Failed operations
- **⏰**: Token expiry warnings

### Debug Components
- **TokenDebug**: Real-time token status (development only)
- **NetworkStatus**: Network connectivity status
- **Enhanced logging**: Detailed operation tracking

## Best Practices for Production

### 1. Monitoring
```typescript
// Monitor these localStorage keys for patterns
const errorMetrics = {
  refreshAttempts: localStorage.getItem("refreshAttempts"),
  networkErrors: localStorage.getItem("networkErrorCount"),
  lastSuccess: localStorage.getItem("lastSuccessfulRefresh")
};
```

### 2. User Experience
- **Clear messaging**: Users understand what's happening
- **Manual options**: When automatic recovery fails
- **Progress indicators**: During retry operations
- **Fallback paths**: Multiple ways to recover auth state

### 3. Security
- **Complete cleanup**: On rotation conflicts
- **Secure redirects**: Validated logout URIs
- **Token validation**: Before refresh attempts
- **No sensitive logging**: In production builds

## Troubleshooting Guide

### Issue: Frequent Network Errors
**Symptoms**: High `networkErrorCount` in localStorage
**Solutions**:
1. Check network stability
2. Increase `silentRequestTimeout` in config
3. Monitor browser network tab during refresh
4. Consider CDN/proxy issues

### Issue: Rotation Conflicts
**Symptoms**: `invalid_grant` errors, frequent re-authentication
**Solutions**:
1. Check for multiple browser tabs
2. Verify AWS Cognito rotation settings
3. Monitor concurrent refresh attempts
4. Check token storage integrity

### Issue: Silent Renewal Failures
**Symptoms**: Users repeatedly asked to sign in
**Solutions**:
1. Verify Cognito domain configuration
2. Check CORS settings in AWS
3. Monitor browser console for errors
4. Validate redirect URI configuration

## Testing Strategies

### Network Resilience Testing
1. **Browser DevTools**: Throttle network, go offline
2. **Multiple Tabs**: Test concurrent token refresh
3. **Network Changes**: Switch WiFi/mobile during auth
4. **Proxy Testing**: Test through corporate proxies

### Rotation Testing
1. **Manual Rotation**: Trigger in AWS console
2. **Token Expiry**: Wait for natural expiration
3. **Concurrent Sessions**: Multiple devices/browsers
4. **Error Simulation**: Force rotation conflicts

## Performance Optimizations

### Reduced Network Calls
- `loadUserInfo: false` - Skip additional user info requests
- `filterProtocolClaims: true` - Reduce token payload
- Increased check intervals - Fewer automatic checks

### Smart Retry Logic
- **Exponential backoff** for network errors
- **Circuit breaker pattern** after max retries
- **Conditional retries** based on error type

### Memory Management
- **Automatic cleanup** of tracking data on success
- **Storage limits** for error tracking
- **Event listener cleanup** on component unmount

This enhanced implementation provides robust handling of both network issues and refresh token rotation while maintaining security and user experience standards.
