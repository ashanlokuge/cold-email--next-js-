import { Recipient } from '@/types';
import { TimezoneConfig, getTimezoneDelayMultiplier, getCurrentHourInTimezone, isWeekend } from './timezoneConfig';

// Spintax expansion with seeded randomization
export function expandSpintax(text: string, seed: number | null = null): string {
  console.log('🔧 expandSpintax START:', { textLength: text?.length, seed, hasSpintax: /{[^{}]*\|[^{}]*}/.test(text || '') });

  if (!text || typeof text !== 'string') {
    console.log('❌ expandSpintax ABORT: Invalid input');
    return text;
  }

  // Set up seeded random if provided
  let random = Math.random;
  if (seed !== null) {
    // Simple seeded random number generator
    let currentSeed = seed;
    random = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  let result = text;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops

  // Match single braces with pipe, but NOT double braces {{...}}
  // Regex: { followed by (not { or }), then |, then (not { or }), then }
  const spintaxPattern = /{([^{}]+\|[^{}]+)}/;

  while (spintaxPattern.test(result) && iterations < maxIterations) {
    const beforeReplace = result;
    // Process each spintax block one at a time to ensure different random values
    result = result.replace(spintaxPattern, (match, content) => {
      const options = content.split('|').map((s: string) => s.trim());
      if (options.length <= 1) return match;

      // Get a NEW random value for each spintax block
      const randomIndex = Math.floor(random() * options.length);
      const chosen = options[randomIndex] || options[0];
      console.log(`  ✓ Replaced "${match}" → "${chosen}" (index ${randomIndex}/${options.length})`);
      return chosen;
    });
    iterations++;
  }

  console.log('✅ expandSpintax END:', { iterations, stillHasSpintax: spintaxPattern.test(result) });

  return result;
}

// Personalize content with variables and spintax
export function personalizeContent(
  content: string,
  recipient: Recipient,
  recipientIndex: number = 0,
  senderEmail: string = '',
  senderDisplayName?: string
): string {
  if (!content || !recipient) return content;

  // Create unique seed for consistent personalization
  const emailDomain = recipient.email.split('@')[1] || '';
  const contentHash = simpleHash(content.substring(0, 100));
  const uniqueString = `${recipient.email}_${recipientIndex}_${emailDomain}_${contentHash}`;
  const seed = simpleHash(uniqueString);

  console.log('🔍 PersonalizeContent called:', {
    recipient: recipient.email,
    recipientName: recipient.name,
    recipientCompany: recipient.company,
    hasSpintax: /{[^}]*\|[^}]*}/.test(content),
    seed: seed,
    contentPreview: content.substring(0, 100)
  });

  let personalized = expandSpintax(content, seed);

  console.log('✅ After spintax expansion:', {
    stillHasSpintax: /{[^}]*\|[^}]*}/.test(personalized),
    result: personalized.substring(0, 100)
  });

  console.log('🏢 Company replacement:', {
    originalContent: personalized.includes('{{company}}'),
    companyValue: recipient.company || 'NO COMPANY DATA',
    willReplace: recipient.company ? 'YES' : 'NO'
  });

  // Determine sender name to use
  let senderName = senderDisplayName; // Use provided displayName if available

  // Fallback to mapping if no displayName provided
  if (!senderName) {
    const senderNames: { [key: string]: string } = {
      'sales': 'John from Sales',
      'support': 'Sarah from Support',
      'marketing': 'Mike from Marketing',
      'info': 'The Team',
      'hello': 'Customer Success',
      'contact': 'Business Development'
    };

    const senderUsername = senderEmail.split('@')[0] || '';
    senderName = senderNames[senderUsername] || 'The Team';
  }

  // Variable replacement
  personalized = personalized
    .replace(/\{\{name\}\}/g, recipient.name || recipient.email.split('@')[0])
    .replace(/\{\{email\}\}/g, recipient.email)
    .replace(/\{\{firstName\}\}/g, (recipient.name || recipient.email.split('@')[0]).split(' ')[0])
    .replace(/\{\{lastName\}\}/g, (recipient.name || recipient.email.split('@')[0]).split(' ').slice(1).join(' ') || '')
    .replace(/\{\{company\}\}/g, recipient.company || '')
    .replace(/\{\{senderName\}\}/g, senderName);

  console.log('🎯 Final personalized content:', {
    hasCompanyPlaceholder: personalized.includes('{{company}}'),
    finalResult: personalized.substring(0, 150)
  });

  return personalized;
}

// Simple hash function for seeding
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Parse recipients from text input
export function parseRecipients(text: string): Recipient[] {
  if (!text) return [];

  const lines = text.split('\n').filter(line => line.trim());
  const recipients: Recipient[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Email only
    if (trimmed.includes('@') && !trimmed.includes(',')) {
      recipients.push({ email: trimmed, name: trimmed.split('@')[0] });
      continue;
    }

    // CSV format: name,email,company or email,name,company or email,company
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const emailPart = parts.find(p => p.includes('@'));
      const nonEmailParts = parts.filter(p => !p.includes('@'));

      if (emailPart) {
        recipients.push({
          email: emailPart,
          name: nonEmailParts[0] || emailPart.split('@')[0],
          company: nonEmailParts[1] || ''
        });
      }
    }
  }

  return dedupeRecipients(recipients);
}

// Remove duplicate recipients
export function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const result: Recipient[] = [];

  for (const recipient of recipients) {
    const email = recipient.email.toLowerCase().trim();
    if (email && !seen.has(email)) {
      seen.add(email);
      result.push({
        email: email,
        name: recipient.name?.trim() || email.split('@')[0],
        company: recipient.company?.trim() || ''
      });
    }
  }

  return result;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Sanitize recipients array
export function sanitizeRecipients(input: any[]): Recipient[] {
  const list = Array.isArray(input) ? input : [];
  const mapped = list.map(r => ({
    email: String(r?.email || '').trim(),
    name: (String(r?.name || '').trim()) || String(r?.email || '').split('@')[0],
    company: String(r?.company || '').trim()
  })).filter(r => r.email && isValidEmail(r.email));

  return dedupeRecipients(mapped);
}

// Calculate delay for human-like timing with sophisticated anti-spam patterns
export function calculateHumanLikeDelay(
  emailIndex: number,
  emailsSent: number,
  totalEmails: number,
  senderEmail: string,
  campaignStartTime: number,
  timezoneConfig?: TimezoneConfig | null
): number {
  const campaignElapsed = Date.now() - campaignStartTime;
  const progress = emailIndex / totalEmails;

  // BURST PHASE (first 10-20 emails): Quick sends to simulate initial activity
  if (emailIndex < Math.min(20, totalEmails * 0.1)) {
    const burstDelay = 15000 + Math.random() * 25000; // 15-40 seconds
    const jitter = (Math.random() - 0.5) * 10000; // ±5 seconds
    return Math.max(5000, burstDelay + jitter); // Minimum 5 seconds
  }

  // PAUSE DETECTION: Insert strategic pauses to mimic human breaks
  const shouldPause = (
    emailIndex % 50 === 0 || // Every 50 emails
    (emailIndex > 100 && Math.random() < 0.05) || // 5% chance after 100 emails
    (campaignElapsed > 1800000 && emailIndex % 25 === 0) // Every 25 emails after 30 min
  );

  if (shouldPause) {
    const pauseType = Math.random();
    if (pauseType < 0.3) {
      // Short break: 2-5 minutes
      return 120000 + Math.random() * 180000;
    } else if (pauseType < 0.6) {
      // Medium break: 5-10 minutes  
      return 300000 + Math.random() * 300000;
    } else {
      // Long break: 10-20 minutes (rare)
      return 600000 + Math.random() * 600000;
    }
  }

  // TIMEZONE-AWARE WORKDAY SIMULATION
  let workdayMultiplier = 1.0;

  if (timezoneConfig) {
    // Use target timezone's time instead of local time
    workdayMultiplier = getTimezoneDelayMultiplier(timezoneConfig);
  } else {
    // Original workday simulation based on elapsed time
    const simulatedHour = (campaignElapsed / 3600000) % 24; // Simulate 24-hour cycle

    if (simulatedHour >= 9 && simulatedHour <= 17) {
      // Business hours: Faster pace
      workdayMultiplier = 0.7;
    } else if (simulatedHour >= 18 && simulatedHour <= 22) {
      // Evening: Moderate pace
      workdayMultiplier = 1.0;
    } else {
      // Night/early morning: Slower pace
      workdayMultiplier = 1.5;
    }
  }

  // PROGRESSIVE SLOWDOWN: Gradually increase delays as campaign progresses
  const fatigueMultiplier = 1 + (progress * 0.8); // Up to 80% slower by end

  // SENDER-BASED VARIATION: Different senders have different "personalities"
  const senderHash = senderEmail.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const senderVariation = 0.8 + ((Math.abs(senderHash) % 100) / 100) * 0.4; // 0.8-1.2x

  // BASE DELAY CALCULATION with advanced patterns
  let baseDelay;

  if (progress < 0.3) {
    // Early phase: Variable but generally quickly
    baseDelay = 60000 + Math.random() * 60000; // 1-2 minutes
  } else if (progress < 0.7) {
    // Middle phase: More consistent timing
    baseDelay = 90000 + Math.random() * 60000; // 1.5-2.5 minutes
  } else {
    // Final phase: Slower and more varied
    baseDelay = 120000 + Math.random() * 120000; // 2-4 minutes
  }

  // ANTI-PATTERN DETECTION: Avoid too-regular intervals
  const lastDelayPattern = emailIndex % 7; // Create variation every 7 emails
  const patternBreaker = lastDelayPattern === 0 ? 1.5 :
    lastDelayPattern === 3 ? 0.6 : 1.0;

  // RANDOM SPIKE SIMULATION: Occasional random delays
  const spikeChance = Math.random();
  let spikeMultiplier = 1.0;

  if (spikeChance < 0.02) {
    // 2% chance of very long delay (5-15 minutes)
    spikeMultiplier = 6 + Math.random() * 14; // 6-20x normal delay
  } else if (spikeChance < 0.08) {
    // 6% chance of longer delay (2-5 minutes)
    spikeMultiplier = 2.5 + Math.random() * 4; // 2.5-6.5x normal delay
  } else if (spikeChance < 0.15) {
    // 7% chance of shorter delay (burst)
    spikeMultiplier = 0.3 + Math.random() * 0.4; // 0.3-0.7x normal delay
  }

  // COMBINE ALL FACTORS
  const finalDelay = baseDelay *
    workdayMultiplier *
    fatigueMultiplier *
    senderVariation *
    patternBreaker *
    spikeMultiplier;

  // JITTER: Add small random variation to break micro-patterns
  const jitter = (Math.random() - 0.5) * (finalDelay * 0.2); // ±10% jitter

  // BOUNDS: Ensure delays are within reasonable bounds
  const delayWithJitter = finalDelay + jitter;
  const minDelay = emailIndex < 10 ? 30000 : 45000; // First 10 emails: 30s min, others: 45s min
  const maxDelay = 1200000; // 20 minutes maximum

  return Math.max(minDelay, Math.min(maxDelay, delayWithJitter));
}

// Sleep utility
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Check if error is retryable
export function isRetryable(error: any): boolean {
  const code = error?.statusCode || error?.code;
  const retryableCodes = [429, 500, 502, 503, 504, 'TooManyRequests', 'ServiceUnavailable'];
  return retryableCodes.indexOf(code) !== -1;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}