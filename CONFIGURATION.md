# Environment Configuration Guide

This document explains all configurable parameters in the ColdSendz email campaign system.

## Required Environment Variables

These must be set in your `.env` file:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=coldemail

# Authentication
JWT_SECRET=your-secret-key-change-in-production-make-it-long-and-random

# Initialization secret for remote DB initialization endpoint (keep secret)
DB_INIT_SECRET=some-long-random-string

# Azure Communication Services (for email sending)
AZURE_COMMUNICATION_CONNECTION_STRING=your-azure-communication-services-connection-string
AZURE_COMMUNICATION_DOMAIN=your-domain.example.com

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production
```

---

## Algorithm Configuration (Code-Level)

These parameters are currently **hardcoded** in `src/lib/utils.ts` but can be extracted to environment variables if needed.

### Base Timing Parameters

```typescript
// Location: src/lib/utils.ts - calculateHumanLikeDelay() function
const MIN_DELAY_SECONDS = 30;    // Minimum delay between emails (seconds)
const MAX_DELAY_SECONDS = 300;   // Maximum delay between emails (seconds)
```

**How to make configurable:**
```bash
# Add to .env
MIN_DELAY_SECONDS=30
MAX_DELAY_SECONDS=300
```

```typescript
// Update src/lib/utils.ts
const MIN_DELAY_SECONDS = parseInt(process.env.MIN_DELAY_SECONDS || '30');
const MAX_DELAY_SECONDS = parseInt(process.env.MAX_DELAY_SECONDS || '300');
```

### Strategic Pause Configuration

```typescript
// Location: src/lib/utils.ts - calculateHumanLikeDelay()

// Pause trigger: Every N emails
const PAUSE_EVERY_N_EMAILS = 50;

// Pause trigger: Random chance percentage (5% = 0.05)
const RANDOM_PAUSE_CHANCE = 0.05;

// Pause trigger: After continuous sending time (milliseconds)
const PAUSE_AFTER_CONTINUOUS_TIME_MS = 30 * 60 * 1000; // 30 minutes
```

**How to make configurable:**
```bash
# Add to .env
PAUSE_EVERY_N_EMAILS=50
RANDOM_PAUSE_CHANCE=0.05
PAUSE_AFTER_CONTINUOUS_TIME_MS=1800000  # 30 minutes in milliseconds
```

### Pause Duration Configuration

```typescript
// Location: src/lib/utils.ts - calculateHumanLikeDelay()

// Short pause: 5-10 minutes (30% probability)
const SHORT_PAUSE_MIN = 5 * 60 * 1000;
const SHORT_PAUSE_MAX = 10 * 60 * 1000;
const SHORT_PAUSE_PROBABILITY = 0.3;

// Medium pause: 10-15 minutes (30% probability)
const MEDIUM_PAUSE_MIN = 10 * 60 * 1000;
const MEDIUM_PAUSE_MAX = 15 * 60 * 1000;
const MEDIUM_PAUSE_PROBABILITY = 0.3;

// Long pause: 15-20 minutes (40% probability)
const LONG_PAUSE_MIN = 15 * 60 * 1000;
const LONG_PAUSE_MAX = 20 * 60 * 1000;
const LONG_PAUSE_PROBABILITY = 0.4;
```

**How to make configurable:**
```bash
# Add to .env
SHORT_PAUSE_MIN_MINUTES=5
SHORT_PAUSE_MAX_MINUTES=10
MEDIUM_PAUSE_MIN_MINUTES=10
MEDIUM_PAUSE_MAX_MINUTES=15
LONG_PAUSE_MIN_MINUTES=15
LONG_PAUSE_MAX_MINUTES=20
```

### Workday Simulation Parameters

```typescript
// Location: src/lib/utils.ts - calculateHumanLikeDelay()

// Simulated workday length (for non-timezone campaigns)
const SIMULATED_WORKDAY_MS = 8 * 60 * 60 * 1000; // 8 hours

// Energy/productivity curve percentages
const MORNING_ENERGY = 1.0;      // 100% speed (fastest)
const MIDDAY_ENERGY = 0.9;       // 90% speed
const AFTERNOON_ENERGY = 0.7;    // 70% speed (slowest normal time)
const EVENING_ENERGY = 0.95;     // 95% speed (slight recovery)
```

**How to make configurable:**
```bash
# Add to .env
SIMULATED_WORKDAY_HOURS=8
MORNING_ENERGY_MULTIPLIER=1.0
MIDDAY_ENERGY_MULTIPLIER=0.9
AFTERNOON_ENERGY_MULTIPLIER=0.7
EVENING_ENERGY_MULTIPLIER=0.95
```

### Variability & Randomness

```typescript
// Location: src/lib/utils.ts - calculateHumanLikeDelay()

// Per-sender personality adjustment range
const SENDER_PERSONALITY_MIN = 0.85;  // 15% slower
const SENDER_PERSONALITY_MAX = 1.15;  // 15% faster

// Random variability range (applied to every email)
const RANDOM_VARIABILITY_MIN = 0.90;  // 10% slower
const RANDOM_VARIABILITY_MAX = 1.10;  // 10% faster

// Occasional spike chance (rapid burst)
const SPIKE_CHANCE = 0.05;            // 5% chance
const SPIKE_MULTIPLIER = 0.5;         // 50% of normal delay (2x faster)
```

**How to make configurable:**
```bash
# Add to .env
SENDER_PERSONALITY_VARIANCE=0.15  # ±15%
RANDOM_VARIABILITY=0.10           # ±10%
SPIKE_CHANCE=0.05                 # 5%
SPIKE_SPEED_MULTIPLIER=0.5        # 2x faster (0.5 = half delay)
```

---

## Timezone Configuration (UI-Level)

These are configured **per-campaign** via the web interface. No environment variables needed.

### Available Presets

```typescript
// Location: src/lib/timezoneConfig.ts - TIMEZONE_PRESETS

const TIMEZONE_PRESETS = {
  AUSTRALIA_SYDNEY: {
    targetTimezone: 'Australia/Sydney',
    businessHourStart: 9,      // 9 AM
    businessHourEnd: 17,       // 5 PM
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false   // Block 10 PM - 6 AM
  },
  // ... 7 more presets
}
```

### Timezone Speed Multipliers

```typescript
// Location: src/lib/timezoneConfig.ts - getTimezoneDelayMultiplier()

// Business hours (9 AM - 5 PM in target timezone)
const BUSINESS_HOURS_MULTIPLIER = 0.7;  // 30% faster

// Weekends (Saturday/Sunday in target timezone)
const WEEKEND_MULTIPLIER = 3.0;         // 3x slower

// Night hours (10 PM - 6 AM in target timezone)
const NIGHT_MULTIPLIER = 5.0;           // 5x slower

// Outside business hours (but not night)
const OUTSIDE_HOURS_MULTIPLIER = 1.5;   // 50% slower
```

**How to make configurable:**
```bash
# Add to .env
TZ_BUSINESS_HOURS_MULTIPLIER=0.7
TZ_WEEKEND_MULTIPLIER=3.0
TZ_NIGHT_MULTIPLIER=5.0
TZ_OUTSIDE_HOURS_MULTIPLIER=1.5
```

```typescript
// Update src/lib/timezoneConfig.ts
const BUSINESS_HOURS_MULTIPLIER = parseFloat(process.env.TZ_BUSINESS_HOURS_MULTIPLIER || '0.7');
const WEEKEND_MULTIPLIER = parseFloat(process.env.TZ_WEEKEND_MULTIPLIER || '3.0');
const NIGHT_MULTIPLIER = parseFloat(process.env.TZ_NIGHT_MULTIPLIER || '5.0');
const OUTSIDE_HOURS_MULTIPLIER = parseFloat(process.env.TZ_OUTSIDE_HOURS_MULTIPLIER || '1.5');
```

### Night Hours Definition

```typescript
// Location: src/lib/timezoneConfig.ts - getTimezoneDelayMultiplier()

const NIGHT_START_HOUR = 22;  // 10 PM
const NIGHT_END_HOUR = 6;     // 6 AM
```

**How to make configurable:**
```bash
# Add to .env
NIGHT_START_HOUR=22  # 10 PM
NIGHT_END_HOUR=6     # 6 AM
```

---

## Complete Example .env with All Parameters

```bash
# ===========================
# REQUIRED - System Configuration
# ===========================

# Database Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=coldemail

# Authentication
JWT_SECRET=your-secret-key-change-in-production-make-it-long-and-random
DB_INIT_SECRET=some-long-random-string

# Azure Communication Services
AZURE_COMMUNICATION_CONNECTION_STRING=your-azure-communication-services-connection-string
AZURE_COMMUNICATION_DOMAIN=your-domain.example.com

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production

# ===========================
# OPTIONAL - Algorithm Tuning
# ===========================

# Base Timing (seconds)
MIN_DELAY_SECONDS=30
MAX_DELAY_SECONDS=300

# Pause Triggers
PAUSE_EVERY_N_EMAILS=50
RANDOM_PAUSE_CHANCE=0.05              # 5% chance per email
PAUSE_AFTER_CONTINUOUS_TIME_MS=1800000 # 30 minutes

# Pause Durations (minutes)
SHORT_PAUSE_MIN_MINUTES=5
SHORT_PAUSE_MAX_MINUTES=10
MEDIUM_PAUSE_MIN_MINUTES=10
MEDIUM_PAUSE_MAX_MINUTES=15
LONG_PAUSE_MIN_MINUTES=15
LONG_PAUSE_MAX_MINUTES=20

# Workday Simulation
SIMULATED_WORKDAY_HOURS=8
MORNING_ENERGY_MULTIPLIER=1.0
MIDDAY_ENERGY_MULTIPLIER=0.9
AFTERNOON_ENERGY_MULTIPLIER=0.7
EVENING_ENERGY_MULTIPLIER=0.95

# Randomness & Variability
SENDER_PERSONALITY_VARIANCE=0.15  # ±15%
RANDOM_VARIABILITY=0.10           # ±10%
SPIKE_CHANCE=0.05                 # 5%
SPIKE_SPEED_MULTIPLIER=0.5        # 2x faster

# Timezone Multipliers
TZ_BUSINESS_HOURS_MULTIPLIER=0.7  # 30% faster
TZ_WEEKEND_MULTIPLIER=3.0         # 3x slower
TZ_NIGHT_MULTIPLIER=5.0           # 5x slower
TZ_OUTSIDE_HOURS_MULTIPLIER=1.5   # 50% slower

# Timezone Night Definition
NIGHT_START_HOUR=22               # 10 PM
NIGHT_END_HOUR=6                  # 6 AM
```

---

## Configuration Priority Guide

### What to Configure First (Most Impact)

1. **Timezone Multipliers** - Biggest impact on international campaigns
   - `TZ_BUSINESS_HOURS_MULTIPLIER` (default: 0.7)
   - `TZ_WEEKEND_MULTIPLIER` (default: 3.0)
   - `TZ_NIGHT_MULTIPLIER` (default: 5.0)

2. **Base Delay Range** - Controls overall campaign speed
   - `MIN_DELAY_SECONDS` (default: 30)
   - `MAX_DELAY_SECONDS` (default: 300)

3. **Strategic Pauses** - Controls campaign rhythm
   - `PAUSE_EVERY_N_EMAILS` (default: 50)
   - `PAUSE_AFTER_CONTINUOUS_TIME_MS` (default: 1800000 = 30 min)

### What to Configure Later (Fine-Tuning)

4. **Pause Durations** - Adjust after seeing initial campaign behavior
5. **Energy Multipliers** - Fine-tune workday simulation
6. **Randomness Settings** - Adjust if patterns seem too predictable

### What to Leave Default (Unless Specific Need)

7. **Spike Chance** - Works well at 5%
8. **Night Hours** - 10 PM - 6 AM is standard
9. **Sender Personality** - ±15% provides good variation

---

## Testing Your Configuration

### Test Scenarios

1. **Quick Test Campaign (10 emails)**
   ```bash
   MIN_DELAY_SECONDS=5
   MAX_DELAY_SECONDS=30
   PAUSE_EVERY_N_EMAILS=100  # Disable pauses for test
   ```
   Expected duration: ~2-5 minutes

2. **Conservative Campaign (slower = safer)**
   ```bash
   MIN_DELAY_SECONDS=60
   MAX_DELAY_SECONDS=600
   TZ_BUSINESS_HOURS_MULTIPLIER=0.8  # Only 20% faster (was 30%)
   ```
   Expected duration: ~2x normal

3. **Aggressive Campaign (faster = riskier)**
   ```bash
   MIN_DELAY_SECONDS=15
   MAX_DELAY_SECONDS=120
   TZ_BUSINESS_HOURS_MULTIPLIER=0.5  # 50% faster (2x speed)
   PAUSE_EVERY_N_EMAILS=100          # Reduce pause frequency
   ```
   Expected duration: ~0.5x normal

---

## Monitoring & Adjustment

### Console Output to Watch

```bash
# Look for these patterns:
⏱️  Waiting 42 seconds before next email... (0.7x business hours)
⏱️  Waiting 180 seconds before next email... (3.0x weekend)
⏸️  Strategic pause triggered (random 5%)
⏸️  Strategic pause: 613000ms (~10 minutes)
```

### Adjustment Guidelines

**If sending too slow:**
- Decrease `MIN_DELAY_SECONDS` and `MAX_DELAY_SECONDS`
- Decrease `TZ_WEEKEND_MULTIPLIER` and `TZ_NIGHT_MULTIPLIER`
- Increase `PAUSE_EVERY_N_EMAILS` (less frequent pauses)

**If sending too fast:**
- Increase `MIN_DELAY_SECONDS` and `MAX_DELAY_SECONDS`
- Increase `TZ_WEEKEND_MULTIPLIER` and `TZ_NIGHT_MULTIPLIER`
- Decrease `PAUSE_EVERY_N_EMAILS` (more frequent pauses)

**If patterns too predictable:**
- Increase `RANDOM_VARIABILITY` (e.g., 0.20 for ±20%)
- Increase `SPIKE_CHANCE` (e.g., 0.10 for 10%)
- Increase `SENDER_PERSONALITY_VARIANCE` (e.g., 0.25 for ±25%)

---

## Summary Table

| Parameter | Default | Purpose | Impact |
|-----------|---------|---------|--------|
| `MIN_DELAY_SECONDS` | 30 | Minimum wait between emails | High - controls base speed |
| `MAX_DELAY_SECONDS` | 300 | Maximum wait between emails | High - controls max slowdown |
| `TZ_BUSINESS_HOURS_MULTIPLIER` | 0.7 | Speed during business hours | Very High - 30% faster |
| `TZ_WEEKEND_MULTIPLIER` | 3.0 | Slowdown on weekends | Very High - 3x slower |
| `TZ_NIGHT_MULTIPLIER` | 5.0 | Slowdown at night | High - 5x slower |
| `PAUSE_EVERY_N_EMAILS` | 50 | Pause frequency | Medium - affects rhythm |
| `RANDOM_PAUSE_CHANCE` | 0.05 | Random pause probability | Medium - adds unpredictability |
| `SHORT/MEDIUM/LONG_PAUSE` | 5-20 min | Pause duration ranges | Medium - affects total time |
| `SPIKE_CHANCE` | 0.05 | Burst sending probability | Low - adds variety |
| `SENDER_PERSONALITY_VARIANCE` | 0.15 | Per-sender speed variation | Low - subtle variation |

---

## Need Help?

- See `TIMEZONE-FEATURE.md` for timezone system details
- See `README.md` for general setup instructions
- Check console output for real-time delay information
- Test with small campaigns (10-20 emails) before large sends
