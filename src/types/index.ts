export interface Recipient {
  email: string;
  name?: string;
}

export interface Sender {
  email: string;
  displayName: string;
  username: string;
  domain: string;
}

export interface CampaignStatus {
  isRunning: boolean;
  campaignName: string;
  sent: number;
  successful: number;
  failed: number;
  total: number;
  completed: boolean;
  startTime: number | null;
}

export interface EmailDetail {
  timestamp: string;
  recipient: string;
  subject: string;
  status: 'success' | 'failed';
  error?: string;
  sender: string;
}

export interface CSVPreview {
  headers: string[];
  data: any[];
  totalRows: number;
  emailColumn?: string;
  nameColumn?: string;
  suggestions: {
    emailColumns: string[];
    nameColumns: string[];
  };
}

export interface DeliverySettings {
  maxEmailsPerHour: number;
  delayBetweenEmails: number;
  maxRetries: number;
  retryDelay: number;
  useWarmup: boolean;
  useProperHeaders: boolean;
}