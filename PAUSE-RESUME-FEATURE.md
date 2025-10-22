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
# Pause/Resume feature removed

This project no longer supports a user-driven Pause/Resume flow. The Pause/Resume feature was removed to simplify runtime behaviour and make the system safer for serverless deployments (Vercel). The app now provides a single campaign control: Stop.

What changed
- The Pause and Resume API endpoints were removed (they now return 410 Gone).
- The UI no longer shows Pause or Resume buttons; only Stop is available.
- Internal campaign state no longer stores a `paused` status. Campaigns use these statuses: `running`, `stopped`, `completed`.
- `src/pages/api/campaigns/send.ts` no longer relies on a persisted `paused` state. It only checks for `stopped` or `completed` in the database to interrupt execution.

Why
- Pause/Resume required long-lived loops and frequent polling which are fragile in serverless environments and added a lot of complexity. Removing it simplifies the runtime and reduces DB/write churn.

How to stop a campaign
- Use the Stop button in the Campaigns History or Analytics views. Stopping marks the campaign as `stopped` and sending will halt.

DB normalization note
- Existing campaigns persisted with status `paused` will continue to exist in the database. We recommend running a one-off migration to map `paused` → `stopped` if you want canonical statuses; I can create that migration script for you.

If you want the pause/resume flow restored later we can reintroduce a lighter-weight mechanism that avoids long-lived loops (for example: external scheduler + status flags), but for now Stop-only keeps things simple and reliable.
      - If now valid → break loop and resume
