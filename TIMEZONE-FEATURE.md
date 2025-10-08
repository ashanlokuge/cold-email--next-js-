# Timezone-Aware Campaign System

## Overview

The ColdSendz platform now supports **timezone-aware email campaigns**, allowing you to target recipients in different timezones while respecting their local business hours, regardless of your own location.

### Use Case Example
**Scenario:** You are in Sri Lanka (UTC+5:30) and want to send emails to Australian recipients during *their* business hours (9 AM - 5 PM Sydney time, UTC+10/+11).

**Solution:** Select "Australia/Sydney" as your target timezone, and the system will:
- Send emails faster during Sydney business hours (9 AM - 5 PM)
- Slow down significantly outside business hours
- Respect weekends (Saturday/Sunday in Sydney)
- Avoid night sending (10 PM - 6 AM Sydney time) if configured

---

## How It Works

### 1. **Real-Time Timezone Conversion**
Uses JavaScript's built-in `Intl.DateTimeFormat` API to accurately determine:
- Current hour in target timezone
- Current day of week in target timezone
- Whether it's currently business hours in that timezone
- Whether it's currently a weekend in that timezone

### 2. **Dynamic Timing Adjustments**

The email sending algorithm adjusts delays based on the target timezone's current status:

| Target Timezone Status | Speed Multiplier | Effect |
|----------------------|------------------|--------|
| **Business Hours** (9 AM - 5 PM) | **0.7x** | **Faster sending** - 30% quicker delays |
| **Weekends** (Sat/Sun) | **3.0x** | **Much slower** - 3x longer delays |
| **Night** (10 PM - 6 AM) | **5.0x** | **Very slow** - 5x longer delays (if night blocking enabled) |
| **Outside Business Hours** (weekday evening/morning) | **1.5x** | **Slightly slower** - 50% longer delays |

### 3. **Automatic Wait for Business Hours**

If you start a campaign when the target timezone is outside business hours AND "Respect Business Hours" is enabled:
- The system calculates how long to wait until the next business hour
- Automatically pauses the campaign
- Resumes when business hours begin in the target timezone

**Example:**
```
Current time in Sydney: 11:30 PM (Friday)
System action: Wait 9.5 hours until 9:00 AM Saturday
Note: If "Respect Weekends" is also enabled, it will wait until Monday 9:00 AM
```

---

## Available Timezone Presets

The system includes pre-configured settings for major regions:

| Region | Timezone | Business Hours | Key Details |
|--------|----------|---------------|-------------|
| 🇦🇺 **Australia/Sydney** | `Australia/Sydney` | 9 AM - 5 PM | AEDT/AEST (UTC+11/+10) |
| 🇦🇺 **Australia/Melbourne** | `Australia/Melbourne` | 9 AM - 5 PM | AEDT/AEST (UTC+11/+10) |
| 🇱🇰 **Sri Lanka** | `Asia/Colombo` | 9 AM - 5 PM | IST (UTC+5:30) |
| 🇸🇬 **Singapore** | `Asia/Singapore` | 9 AM - 5 PM | SGT (UTC+8) |
| 🇦🇪 **Dubai/UAE** | `Asia/Dubai` | 9 AM - 5 PM | GST (UTC+4) |
| 🇬🇧 **London** | `Europe/London` | 9 AM - 5 PM | GMT/BST (UTC+0/+1) |
| 🇺🇸 **New York** | `America/New_York` | 9 AM - 5 PM | EST/EDT (UTC-5/-4) |
| 🇺🇸 **Los Angeles** | `America/Los_Angeles` | 9 AM - 5 PM | PST/PDT (UTC-8/-7) |

All presets:
- ✅ Respect business hours by default
- ✅ Respect weekends by default
- ✅ Block night sending (10 PM - 6 AM) by default

---

## Configuration Options

When creating a campaign, you can configure:

### 1. **Target Timezone** (Dropdown)
Select the timezone where your recipients are located.

### 2. **Respect Business Hours** (Checkbox)
- ✅ **Enabled (default):** Sends faster during 9 AM - 5 PM, slower outside
- ❌ **Disabled:** Ignores time of day, sends at normal pace

### 3. **Respect Weekends** (Checkbox)
- ✅ **Enabled (default):** Slows down 3x on Saturday/Sunday
- ❌ **Disabled:** Treats weekends like weekdays

### 4. **Avoid Night Sending** (Checkbox)
- ✅ **Enabled (default):** Slows down 5x during 10 PM - 6 AM
- ❌ **Disabled:** Allows normal-speed sending at night

---

## User Interface

### Campaign Compose Screen

When you select a target timezone, you'll see:

```
┌─────────────────────────────────────────────────┐
│ Current Time in Sydney                          │
│ Fri, Dec 20, 02:30 PM                          │
├─────────────────────────────────────────────────┤
│ Business Hours         │ Sending Behavior       │
│ 9:00 - 17:00          │ ⏰ Respect hours        │
├─────────────────────────────────────────────────┤
│ ☑ Respect business hours (slow down outside)   │
│ ☑ Respect weekends (slow down on Sat/Sun)      │
│ ☑ Avoid night sending (10PM - 6AM)             │
├─────────────────────────────────────────────────┤
│ 💡 Tip: Campaign timing will adapt to the       │
│    target timezone's current time, regardless   │
│    of your location.                            │
└─────────────────────────────────────────────────┘
```

The current time updates **every minute** to show you live time in the target timezone.

---

## Technical Implementation

### Key Files Modified

1. **`src/lib/timezoneConfig.ts`** (NEW - 200+ lines)
   - `TIMEZONE_PRESETS`: Pre-configured timezone settings
   - `getCurrentHourInTimezone()`: Get current hour in target timezone
   - `getCurrentDayInTimezone()`: Get day of week in target timezone
   - `isBusinessHours()`: Check if currently business hours
   - `isWeekend()`: Check if currently weekend
   - `getTimezoneDelayMultiplier()`: Calculate speed adjustment
   - `getMillisecondsUntilBusinessHours()`: Calculate wait time
   - `getTimezoneStatusMessage()`: Human-readable status

2. **`src/lib/utils.ts`** (UPDATED)
   - `calculateHumanLikeDelay()`: Now accepts `timezoneConfig` parameter
   - Uses `getTimezoneDelayMultiplier()` to adjust delays dynamically

3. **`src/types/index.ts`** (UPDATED)
   - Added `TimezoneConfig` interface
   - Updated `CampaignFormData` to include `timezoneConfig`
   - Updated `CampaignStatus` to include `timezoneConfig`

4. **`src/pages/api/campaigns/send.ts`** (UPDATED)
   - Accepts `timezoneConfig` from request body
   - Passes timezone config through to email sending logic
   - Logs timezone status at campaign start
   - Implements auto-wait for business hours

5. **`src/components/sections/ComposeSection.tsx`** (UPDATED)
   - Added timezone dropdown selector
   - Real-time clock showing target timezone time
   - Configuration checkboxes (business hours, weekends, night)
   - Visual feedback with current timezone status

6. **`src/pages/index.tsx`** (UPDATED)
   - Updated `campaignFormData` state to include `timezoneConfig`
   - Timezone config persists in localStorage

---

## Algorithm Behavior Examples

### Example 1: Business Hours (Optimal)
**Scenario:** Sydney time is 2:30 PM (Friday)
- ✅ Business hours active (9 AM - 5 PM)
- ✅ Weekday
- **Result:** Speed multiplier = **0.7x** (30% faster)
- **Effect:** Base delay of 60s becomes 42s

### Example 2: Weekend
**Scenario:** Sydney time is 11:00 AM (Saturday)
- ❌ Weekend (Saturday)
- ✅ Within "business hours" range, but weekend overrides
- **Result:** Speed multiplier = **3.0x** (3x slower)
- **Effect:** Base delay of 60s becomes 180s (3 minutes)

### Example 3: Night Time
**Scenario:** Sydney time is 11:30 PM (Thursday)
- ❌ Night hours (10 PM - 6 AM)
- ✅ Weekday
- **Result:** Speed multiplier = **5.0x** (5x slower)
- **Effect:** Base delay of 60s becomes 300s (5 minutes)

### Example 4: Early Evening
**Scenario:** Sydney time is 6:45 PM (Wednesday)
- ❌ After business hours (after 5 PM)
- ❌ Before night hours (before 10 PM)
- ✅ Weekday
- **Result:** Speed multiplier = **1.5x** (50% slower)
- **Effect:** Base delay of 60s becomes 90s

### Example 5: No Timezone Selected
**Scenario:** No timezone configuration provided
- **Result:** Uses original algorithm based on elapsed campaign time
- **Effect:** Simulates workday pattern (faster early, slower later)

---

## Time Estimates with Timezone (1000 Emails Example)

### Scenario: Target Australia/Sydney Business Hours

**Assumptions:**
- 1000 emails total
- Campaign runs during Sydney business hours (9 AM - 5 PM)
- All timezone respect options enabled

**Breakdown:**

| Phase | Emails | Base Time | Timezone Multiplier | Actual Time |
|-------|--------|-----------|---------------------|-------------|
| **Business Hours** | 600 | 30 hours | 0.7x | **21 hours** |
| **After Hours** | 250 | 12.5 hours | 1.5x | **18.75 hours** |
| **Night/Weekend** | 150 | 7.5 hours | 3.0x - 5.0x | **22.5 - 37.5 hours** |
| **Pauses** | - | 16 hours | 1.0x | **16 hours** |
| **TOTAL** | 1000 | - | - | **~58-93 hours** |

**Note:** Time varies significantly based on *when* the campaign runs relative to Sydney time:
- **Best case:** Entire campaign during business hours = ~45 hours
- **Worst case:** Mix of business hours, evenings, weekends = ~90+ hours
- **Recommended:** Start campaign early Monday morning (Sydney time) for fastest completion

---

## Console Output Examples

### Campaign Start with Timezone
```
🚀 Starting campaign "Australian Outreach Q4"
📧 Total emails to send: 250
👥 Available senders: 5
📋 Subject: "Your Business Growth Opportunity"
🌍 Timezone: Australia/Sydney
📍 Status: Business hours (2:30 PM, Fri) - sending at normal pace
✅ Campaign will respect business hours
✅ Campaign will respect weekends
⏰ Night sending blocked (10 PM - 6 AM)
```

### Auto-Wait for Business Hours
```
🚀 Starting campaign "Australian Outreach Q4"
🌍 Timezone: Australia/Sydney
📍 Status: Outside business hours (11:30 PM, Fri)
⏰ Waiting 570 minutes until business hours in Australia/Sydney...
[Campaign pauses automatically]
✅ Business hours started in Australia/Sydney. Resuming campaign...
```

### During Campaign Execution
```
📤 1/250 - Sending from: sender1@domain.com [Sequence: 0]
✅ SUCCESS john@example.com via sender1@domain.com — delay: 42000ms (0.7x business hours)
⏱️  Waiting 42 seconds before next email... (1/250)

📤 2/250 - Sending from: sender2@domain.com [Sequence: 1]
✅ SUCCESS jane@example.com via sender2@domain.com — delay: 45000ms (0.7x business hours)
⏱️  Waiting 45 seconds before next email... (2/250)
```

---

## Best Practices

### 1. **Start Campaigns at Optimal Times**
- For Australia: Start Monday 9:00 AM Sydney time for fastest completion
- For USA: Start Monday 9:00 AM EST/PST for fastest completion
- Avoid starting campaigns Friday afternoon (target time)

### 2. **Choose Appropriate Settings**
- **B2B Campaigns:** Enable all respect options (business hours, weekends, night)
- **B2C Campaigns:** Consider disabling weekend respect for consumer products
- **Urgent Campaigns:** Disable all respect options for 24/7 sending

### 3. **Monitor Timezone Status**
- Check the real-time clock in the compose section
- Ensure target timezone is in business hours when starting
- Account for timezone differences when planning campaign start times

### 4. **Test with Small Batches**
- Send test campaign with 10-20 recipients first
- Verify timing behavior matches expectations
- Adjust settings based on test results

---

## Environment Variables (No Changes Required)

The timezone feature works **out-of-the-box** with existing environment variables:
- No new environment variables needed
- Uses JavaScript's native timezone support
- All configuration done via UI

Existing variables still control base algorithm behavior:
- `MIN_DELAY_SECONDS` (default: 30)
- `MAX_DELAY_SECONDS` (default: 300)
- Timezone multipliers apply **on top** of these base values

---

## Troubleshooting

### Issue: Campaign not respecting timezone
**Solution:** Check that:
1. Timezone is selected in dropdown (not "No timezone targeting")
2. Checkboxes are enabled (respect business hours, etc.)
3. Campaign status console shows timezone information

### Issue: Campaign waiting too long
**Solution:** 
- Campaign may be auto-waiting for business hours
- Check console: look for "Waiting X minutes until business hours"
- Disable "Respect Business Hours" to start immediately

### Issue: Delays too fast/slow
**Solution:**
- Verify target timezone's current time in UI
- Check if it's actually business hours in that timezone
- Remember: 0.7x during business hours means 30% faster

---

## Future Enhancements (Roadmap)

Potential future improvements:

1. **Custom Business Hours:** Allow users to set custom hours per timezone (e.g., 8 AM - 6 PM)
2. **Holiday Calendar:** Skip major holidays in target timezone
3. **Multi-Timezone Campaigns:** Different recipients in different timezones
4. **Timezone Analytics:** Report showing when emails were sent in recipient local time
5. **Smart Scheduling:** AI-suggested best times based on historical engagement

---

## Summary

The timezone-aware campaign system allows you to:
- ✅ Target recipients in any global timezone
- ✅ Respect their local business hours automatically
- ✅ Send from anywhere, optimized for recipient location
- ✅ Improve deliverability with human-like timing patterns
- ✅ Maximize engagement by sending during optimal hours

**Key Benefit:** You can work during *your* business hours in Sri Lanka while the system automatically optimizes sending for *their* business hours in Australia, USA, UK, or any other timezone.
