// Timezone configuration for campaigns

export interface TimezoneConfig {
  targetTimezone: string;
  // Time window settings
  sendTimeStart: number;     // Hour (0-23) - e.g., 9 for 9 AM
  sendTimeEnd: number;        // Hour (0-23) - e.g., 17 for 5 PM
  // Day selection (true = send on this day)
  sendDays: {
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
  // Legacy fields for backward compatibility
  businessHourStart: number;
  businessHourEnd: number;
  respectBusinessHours: boolean;
  respectWeekends: boolean;
  allowNightSending: boolean;
}

export const TIMEZONE_PRESETS = {
  AUSTRALIA_SYDNEY: {
    targetTimezone: 'Australia/Sydney',
    sendTimeStart: 9,
    sendTimeEnd: 17,
    sendDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    businessHourStart: 9,
    businessHourEnd: 17,
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false
  },
  AUSTRALIA_MELBOURNE: {
    targetTimezone: 'Australia/Melbourne',
    sendTimeStart: 9,
    sendTimeEnd: 17,
    sendDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    businessHourStart: 9,
    businessHourEnd: 17,
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false
  },
  SRI_LANKA: {
    targetTimezone: 'Asia/Colombo',
    sendTimeStart: 9,
    sendTimeEnd: 17,
    sendDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    businessHourStart: 9,
    businessHourEnd: 17,
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false
  },
  NEW_YORK: {
    targetTimezone: 'America/New_York',
    sendTimeStart: 9,
    sendTimeEnd: 17,
    sendDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    businessHourStart: 9,
    businessHourEnd: 17,
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false
  },
  LOS_ANGELES: {
    targetTimezone: 'America/Los_Angeles',
    sendTimeStart: 9,
    sendTimeEnd: 17,
    sendDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    businessHourStart: 9,
    businessHourEnd: 17,
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false
  },
  LONDON: {
    targetTimezone: 'Europe/London',
    sendTimeStart: 9,
    sendTimeEnd: 17,
    sendDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    businessHourStart: 9,
    businessHourEnd: 17,
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false
  },
  SINGAPORE: {
    targetTimezone: 'Asia/Singapore',
    sendTimeStart: 9,
    sendTimeEnd: 18,
    sendDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    businessHourStart: 9,
    businessHourEnd: 18,
    respectBusinessHours: true,
    respectWeekends: true,
    allowNightSending: false
  },
  DUBAI: {
    targetTimezone: 'Asia/Dubai',
    sendTimeStart: 8,
    sendTimeEnd: 17,
    sendDays: {
      sunday: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: false,  // UAE weekend
      saturday: false  // UAE weekend
    },
    businessHourStart: 8,
    businessHourEnd: 17,
    respectBusinessHours: true,
    respectWeekends: false, // Different weekend in UAE (Fri-Sat)
    allowNightSending: false
  }
} as const;

/**
 * Get current hour in target timezone
 */
export function getCurrentHourInTimezone(timezone: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(now));
}

/**
 * Get current day of week in target timezone (0 = Sunday, 6 = Saturday)
 */
export function getCurrentDayInTimezone(timezone: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short'
  });
  const dayName = formatter.format(now);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.indexOf(dayName);
}

/**
 * Check if current time is within business hours in target timezone
 */
export function isBusinessHours(config: TimezoneConfig): boolean {
  const currentHour = getCurrentHourInTimezone(config.targetTimezone);

  // Handle overnight business hours (e.g., 22:00-2:00)
  if (config.businessHourStart > config.businessHourEnd) {
    // Overnight range: current hour should be >= start OR < end
    return currentHour >= config.businessHourStart || currentHour < config.businessHourEnd;
  } else {
    // Normal range: current hour should be >= start AND < end
    return currentHour >= config.businessHourStart && currentHour < config.businessHourEnd;
  }
}

/**
 * Check if current day is a weekend in target timezone
 */
export function isWeekend(timezone: string): boolean {
  const dayOfWeek = getCurrentDayInTimezone(timezone);
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Check if sending is allowed on current day based on sendDays configuration
 */
export function isSendingAllowedToday(config: TimezoneConfig): boolean {
  const dayOfWeek = getCurrentDayInTimezone(config.targetTimezone);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = dayNames[dayOfWeek];
  return config.sendDays[dayName];
}

/**
 * Check if current time is within allowed sending windowll
 */
export function isWithinSendingWindow(config: TimezoneConfig): boolean {
  const currentHour = getCurrentHourInTimezone(config.targetTimezone);

  // Handle overnight time ranges (e.g., 22:00-2:00)
  if (config.sendTimeStart > config.sendTimeEnd) {
    // Overnight range: current hour should be >= start OR < end
    return currentHour >= config.sendTimeStart || currentHour < config.sendTimeEnd;
  } else {
    // Normal range: current hour should be >= start AND < end
    return currentHour >= config.sendTimeStart && currentHour < config.sendTimeEnd;
  }
}

/**
 * Calculate delay multiplier based on timezone and schedule settings
 */
export function getTimezoneDelayMultiplier(config: TimezoneConfig): number {
  const currentHour = getCurrentHourInTimezone(config.targetTimezone);

  // Check if today is an allowed sending day
  if (!isSendingAllowedToday(config)) {
    return 10.0; // Very slow on non-sending days
  }

  // Check if within allowed sending window (sendTimeStart to sendTimeEnd)
  if (currentHour >= config.sendTimeStart && currentHour < config.sendTimeEnd) {
    return 0.7; // 30% faster during sending window
  }

  // Outside sending window - slow down significantly
  return 5.0; // Very slow outside window
}

/**
 * Calculate milliseconds until next business hour in target timezone
 */
export function getMillisecondsUntilBusinessHours(config: TimezoneConfig): number {
  if (!config.respectBusinessHours) {
    return 0;
  }

  const now = new Date();
  const currentHour = getCurrentHourInTimezone(config.targetTimezone);
  const currentDay = getCurrentDayInTimezone(config.targetTimezone);
  const isWeekendDay = currentDay === 0 || currentDay === 6;

  // If it's weekend, wait until Monday
  if (config.respectWeekends && isWeekendDay) {
    const daysUntilMonday = currentDay === 0 ? 1 : 2; // Sunday = 1 day, Saturday = 2 days
    const hoursUntilStart = (24 - currentHour) + (config.businessHourStart);
    return (daysUntilMonday * 24 * 60 * 60 * 1000) + (hoursUntilStart * 60 * 60 * 1000);
  }

  // If before business hours today
  if (currentHour < config.businessHourStart) {
    return (config.businessHourStart - currentHour) * 60 * 60 * 1000;
  }

  // If after business hours today, wait until tomorrow
  if (currentHour >= config.businessHourEnd) {
    const hoursUntilStart = (24 - currentHour) + config.businessHourStart;
    return hoursUntilStart * 60 * 60 * 1000;
  }

  return 0; // Already in business hours
}

/**
 * Format timezone-aware status message
 */
export function getTimezoneStatusMessage(config: TimezoneConfig): string {
  const currentHour = getCurrentHourInTimezone(config.targetTimezone);
  const currentDay = getCurrentDayInTimezone(config.targetTimezone);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.targetTimezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  const timeString = formatter.format(now);

  return `Target timezone: ${config.targetTimezone} | Current time: ${dayNames[currentDay]} ${timeString} | Business hours: ${config.businessHourStart}:00-${config.businessHourEnd}:00`;
}

/**
 * Get time offset between two timezones in hours
 */
export function getTimezoneOffset(fromTimezone: string, toTimezone: string): number {
  const now = new Date();
  const fromFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTimezone,
    hour: 'numeric',
    hour12: false
  });
  const toFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: toTimezone,
    hour: 'numeric',
    hour12: false
  });

  const fromHour = parseInt(fromFormatter.format(now));
  const toHour = parseInt(toFormatter.format(now));

  return toHour - fromHour;
}
