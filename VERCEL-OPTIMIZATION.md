# Vercel Deployment Optimization Guide

## Current Implementation

The campaign execution has been optimized for Vercel serverless functions with the following improvements:

### ✅ Optimizations Applied

1. **Reduced Polling Frequency**
   - **Before**: Checked stop status every 2 seconds
   - **After**: Checks every 10-15 seconds
   - **Benefit**: 80% reduction in database calls, less console spam

2. **Configurable Intervals**
   ```typescript
   const STOP_CHECK_INTERVAL = 10000;  // Check stop status every 10s
   const STOP_POLL_INTERVAL = 15000;   // While stopped, check every 15s  
   const DELAY_CHECK_INTERVAL = 5000;   // Check during delays every 5s
   ```

3. **Less Noisy Logging**
   - Only logs stop status every 30 seconds instead of every check
   - Reduces console spam significantly

## Vercel Function Limits

### Hobby Plan
- **Max Execution Time**: 10 seconds
- **Recommendation**: Process 1-2 emails per function call

### Pro Plan  
- **Max Execution Time**: 60 seconds
- **Recommendation**: Process 5-10 emails per function call

### Enterprise Plan
- **Max Execution Time**: 300 seconds (5 minutes)
- **Recommendation**: Process 20-50 emails per function call

## Current Behavior

### Small Campaigns (< 20 emails)
✅ **Direct Execution** - Runs synchronously in one function call
- Works well on Vercel Pro/Enterprise
- May timeout on Hobby plan if delays are long

### Large Campaigns (>= 20 emails)
⚠️ **Current**: Still runs in single function call
❌ **Problem**: Will timeout on Vercel (especially Hobby plan)

## Recommended Solution for Production

For **reliable Vercel deployment**, implement **chunked execution**:

### Option 1: Client-Side Polling (Current)
The frontend polls `/api/campaigns/status` every 1.5 seconds to monitor progress.

**Pros:**
- Simple implementation
- Real-time updates

**Cons:**
- Long-running campaigns will timeout
- Not reliable for large campaigns on Vercel Hobby

### Option 2: Chunked Processing (Recommended)
Process campaigns in small chunks, each chunk runs in a separate function call.

**Implementation:**
1. `/api/campaigns/send` - Starts campaign, processes first chunk (5-10 emails)
2. Returns `{ status: 'in_progress', nextChunkIn: 60 }` 
3. Frontend calls `/api/campaigns/process-chunk` after delay
4. Repeat until campaign completes

**File**: Already created at `/api/campaigns/process-chunk.ts`

**Pros:**
- ✅ No timeout issues
- ✅ Works on all Vercel plans
- ✅ Stop works perfectly (just stop calling next chunk)
- ✅ Stop works instantly (set status in DB)

**Cons:**
- More complex implementation
- Requires frontend coordination

### Option 3: Vercel Cron Jobs (Best for Scheduled Campaigns)
Use Vercel Cron to process campaigns at intervals.

**Setup:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/campaigns/cron-processor",
    "schedule": "*/2 * * * *"  // Every 2 minutes
  }]
}
```

**Pros:**
- ✅ Completely serverless-native
- ✅ No timeout issues
- ✅ Works automatically

**Cons:**
- Only available on Vercel Pro+
- Less real-time (2-5 minute intervals)

## Current Configuration

The code is currently optimized with:

```typescript
// In send.ts
const STOP_CHECK_INTERVAL = 10000;  // 10 seconds
const STOP_POLL_INTERVAL = 15000;   // 15 seconds  
const DELAY_CHECK_INTERVAL = 5000;   // 5 seconds
```

### To Adjust for Your Plan:

**Vercel Hobby (10s limit):**
```typescript
const STOP_CHECK_INTERVAL = 3000;   // 3 seconds
const STOP_POLL_INTERVAL = 5000;    // 5 seconds
const DELAY_CHECK_INTERVAL = 2000;   // 2 seconds
```

**Vercel Pro (60s limit):**
```typescript
const STOP_CHECK_INTERVAL = 10000;  // 10 seconds (current)
const STOP_POLL_INTERVAL = 15000;   // 15 seconds (current)
const DELAY_CHECK_INTERVAL = 5000;   // 5 seconds (current)
```

**Self-Hosted (no limits):**
```typescript
const STOP_CHECK_INTERVAL = 2000;   // 2 seconds  
const STOP_POLL_INTERVAL = 3000;    // 3 seconds
const DELAY_CHECK_INTERVAL = 1000;   // 1 second
```

## Why Campaigns Stop Automatically on Vercel

### Root Causes:

1. **Function Timeout**
   - Vercel kills functions that run too long
   - Campaign appears "stopped" but actually timed out

2. **Memory Limits**
   - Vercel Hobby: 1024 MB
   - Large campaigns can exceed memory
   - Function crashes, campaign stops

3. **Cold Starts**
   - After ~5 minutes of inactivity, function goes cold
   - Next request takes longer to start
   - May appear stopped during cold start

## Monitoring Campaign Status

The current implementation stores everything in MongoDB:

```typescript
// Campaign status is ALWAYS in MongoDB
const campaign = await campaignRepository.getCampaignById(campaignId);

// Status can be:
// - 'running': Campaign is actively sending
// - 'stopped': User stopped the campaign  
// - 'completed': Campaign finished naturally
```

## Best Practices

### ✅ Do:
1. **Use MongoDB as source of truth** - Always check DB for status
2. **Keep function calls short** - Process small batches
3. **Handle timeouts gracefully** - Save progress before function ends
4. **Use appropriate polling intervals** - Don't spam the database

### ❌ Don't:
1. **Rely on in-memory state** - It's lost between function calls
2. **Run long campaigns in single call** - Will timeout
3. **Poll too frequently** - Wastes database connections
4. **Ignore Vercel limits** - Plan for them from the start

## Migration Path

### Current (Works for small campaigns):
```
Start Campaign → Send All Emails → Complete
(Single function call, may timeout)
```

### Recommended (Scales to any size):
```
Start Campaign → Process Chunk 1 → Save Progress
                     ↓
              Process Chunk 2 → Save Progress  
                     ↓
              Process Chunk 3 → Save Progress
                     ↓
                 Complete
(Multiple function calls, never timeouts)
```

## Testing

### Test Campaign Behavior:
1. **Small campaign (5 emails)**: Should work fine
2. **Medium campaign (50 emails)**: May timeout on Hobby
3. **Large campaign (500 emails)**: Will definitely timeout

### Monitor Logs:
```bash
# Watch for these messages:
✅ "Campaign stopped. Checking stop status..." (good, not spamming)
❌ "Campaign stopped during wait. Polling for stop..." (old, too frequent)
⚠️ "Function timeout" (needs chunking)
```

## Support

If campaigns are stopping automatically:
1. Check Vercel function logs for timeout errors
2. Reduce campaign size or implement chunking
3. Consider upgrading to Vercel Pro for longer execution time
4. Use the chunked processing approach (process-chunk.ts)

## Summary

**Current Status**: ✅ Optimized for Vercel with reduced polling
**Works Best For**: Small-medium campaigns (< 50 emails) on Vercel Pro
**Recommended Next Step**: Implement chunked processing for production reliability
