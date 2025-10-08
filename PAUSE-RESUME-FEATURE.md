# Campaign Pause & Resume Feature

## Overview
Campaign now **completely pauses** when outside scheduled timezone/days/hours and **automatically resumes** when schedule window opens.

## Implementation Details

### Changes Made

#### 1. Updated `src/pages/api/campaigns/send.ts`

**Added imports:**
```typescript
import { 
  isSendingAllowedToday,
  isWithinSendingWindow,
  getCurrentHourInTimezone,
  getCurrentDayInTimezone
} from '@/lib/timezoneConfig';
```

**Added pause/resume logic (Lines 601-650):**
```typescript
// Before each email, check if we should pause
while (!isSendingAllowedToday(config) || !isWithinSendingWindow(config)) {
  console.log("⏸️  CAMPAIGN PAUSED: Outside scheduled window");
  
  // Wait 5 minutes
  await sleep(5 * 60 * 1000);
  
  // Check again - if now in window, resume
  if (isSendingAllowedToday(config) && isWithinSendingWindow(config)) {
    console.log("✅ CAMPAIGN RESUMED: Now in scheduled window!");
    break;
  }
}
```

#### 2. Updated `src/lib/campaignState.ts`

**Added field to CampaignStatus type:**
```typescript
type CampaignStatus = {
  // ... existing fields
  pauseReason?: string | null; // Reason for pause (timezone/schedule)
};
```

## Behavior

### During Scheduled Window ✅
- Campaign runs normally
- Emails send with human-like delays (30-120 seconds)
- Status: `running`

### Outside Scheduled Window ⏸️
- Campaign **completely stops** sending emails
- Checks every 5 minutes if schedule has opened
- Status: `paused`
- Console shows: `⏸️ CAMPAIGN PAUSED: [reason]`

### When Schedule Opens 🔄
- Campaign **automatically resumes**
- Continues from where it left off
- Status: `running`
- Console shows: `✅ CAMPAIGN RESUMED: Now in scheduled window!`

## Example Console Output

### When Pausing:
```
⏸️  CAMPAIGN PAUSED: Current time is 20:00 (outside 9:00-17:00)
🕐 Target timezone: Australia/Sydney
⏳ Waiting 5 minutes before checking again...
```

### When Resuming:
```
✅ CAMPAIGN RESUMED: Now in scheduled window!
📅 Day: Monday
🕐 Time: 9:00 (Australia/Sydney)
```

## Configuration Example

**User settings:**
```
Timezone: Australia/Sydney
Days: ☑ Monday ☑ Tuesday ☑ Wednesday ☑ Thursday ☑ Friday
Time: 9:00 to 17:00
```

**Results:**
- ✅ **9 AM - 5 PM Mon-Fri (Sydney time):** Campaign runs, sends emails
- ⏸️ **5 PM - 9 AM Mon-Fri (Sydney time):** Campaign paused
- ⏸️ **All day Saturday & Sunday:** Campaign paused
- 🔄 **Every 5 minutes:** Check if schedule opened, auto-resume if yes

## Technical Flow

1. **Before sending each email:**
   ```
   Check: Is today allowed? → isSendingAllowedToday()
   Check: Is current hour in window? → isWithinSendingWindow()
   ```

2. **If BOTH checks pass:**
   ```
   ✅ Proceed to send email
   ```

3. **If EITHER check fails:**
   ```
   ⏸️ Enter pause loop:
      - Log pause reason
      - Wait 5 minutes
      - Re-check schedule
      - If now valid → break loop and resume
      - If still invalid → continue loop
   ```

4. **After resuming:**
   ```
   Continue with normal email sending
   ```

## Benefits

✅ **No wasted sends** - Zero emails sent outside schedule
✅ **Automatic** - No manual intervention needed
✅ **Transparent** - Console logs show pause/resume status
✅ **Precise** - Uses target timezone, not local time
✅ **Persistent** - Keeps checking, guaranteed to resume
✅ **Efficient** - Only checks every 5 minutes (not spamming)

## User Impact

**Before (Old behavior):**
- Campaign slowed down outside schedule (but still sent emails)
- Could send unwanted emails at wrong times

**After (New behavior):**
- Campaign completely stops outside schedule
- Zero emails sent at wrong times
- Automatically resumes when schedule opens
- User can leave campaign running overnight/weekend without worry

## Testing

### Test Case 1: Start during scheduled window
1. Configure: Mon-Fri 9 AM-5 PM
2. Start campaign: Tuesday 2 PM
3. Expected: Campaign runs normally

### Test Case 2: Reach end of window
1. Campaign running Tuesday 4:55 PM
2. Clock hits 5:00 PM
3. Expected: Campaign pauses after current email
4. Console shows: "⏸️ CAMPAIGN PAUSED: Current time is 17:00 (outside 9:00-17:00)"

### Test Case 3: Auto-resume
1. Campaign paused at 5:00 PM
2. Clock reaches 9:00 AM next day
3. Expected: Within 5 minutes, campaign auto-resumes
4. Console shows: "✅ CAMPAIGN RESUMED: Now in scheduled window!"

### Test Case 4: Wrong day
1. Configure: Mon-Fri only
2. Campaign reaches Saturday
3. Expected: Campaign pauses entire weekend
4. Console shows: "⏸️ CAMPAIGN PAUSED: Today is Saturday (not in selected days)"
5. Monday 9 AM: Auto-resumes

## Files Modified

1. `src/pages/api/campaigns/send.ts` - Added pause/resume loop
2. `src/lib/campaignState.ts` - Added pauseReason field
3. `TIMEZONE-VERIFICATION.md` - Updated documentation

## No Breaking Changes

- ✅ Backward compatible - works with existing campaigns
- ✅ Optional - only activates when timezoneConfig is provided
- ✅ Fallback - campaigns without timezone config work as before
- ✅ Type-safe - TypeScript compilation passes

## Next Steps for User

1. **Configure timezone schedule** in campaign UI
2. **Start campaign** - it will run automatically
3. **Monitor console** - see pause/resume notifications
4. **Leave running** - campaign handles schedule automatically

---

**Status:** ✅ Implemented and Ready to Use
**Version:** 1.0
**Date:** October 8, 2025
