import React, { useState, useEffect } from 'react';
import { personalizeContent, expandSpintax } from '@/lib/utils';
import type { Recipient, TimezoneConfig } from '@/types';
import { TIMEZONE_PRESETS, getCurrentHourInTimezone, getCurrentDayInTimezone } from '@/lib/timezoneConfig';

interface ComposeSectionProps {
  recipients: Recipient[];
  senders: string[];
  templates: any[];
  campaignFormData: {
    campaignName: string;
    subject: string;
    body: string;
    selectedSenders: string[];
    timezoneConfig?: TimezoneConfig | null;
  };
  setCampaignFormData: React.Dispatch<React.SetStateAction<{
    campaignName: string;
    subject: string;
    body: string;
    selectedSenders: string[];
    timezoneConfig?: TimezoneConfig | null;
  }>>;
}

export default function ComposeSection({ recipients, senders, templates, campaignFormData, setCampaignFormData }: ComposeSectionProps) {
  // Use persistent form data from parent component
  const { campaignName, subject, body, selectedSenders, timezoneConfig } = campaignFormData;
  
  // Local state for UI-only data
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [currentTimeInTimezone, setCurrentTimeInTimezone] = useState<string>('');

  // Helper functions to update persistent form data
  const setCampaignName = (value: string) => {
    setCampaignFormData(prev => ({ ...prev, campaignName: value }));
  };

  const setSubject = (value: string) => {
    setCampaignFormData(prev => ({ ...prev, subject: value }));
  };

  const setBody = (value: string) => {
    setCampaignFormData(prev => ({ ...prev, body: value }));
  };

  const setSelectedSenders = (value: string[]) => {
    setCampaignFormData(prev => ({ ...prev, selectedSenders: value }));
  };

  const setTimezoneConfig = (value: TimezoneConfig | null) => {
    setCampaignFormData(prev => ({ ...prev, timezoneConfig: value }));
  };

  const clearForm = () => {
    setCampaignFormData({
      campaignName: '',
      subject: '',
      body: '',
      selectedSenders: [],
      timezoneConfig: null
    });
    setStatus('Form cleared');
    setTimeout(() => setStatus(''), 2000);
  };

  // Update current time in selected timezone every minute
  useEffect(() => {
    const updateTimezoneTime = () => {
      if (timezoneConfig) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezoneConfig.targetTimezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        setCurrentTimeInTimezone(formatter.format(now));
      }
    };

    updateTimezoneTime();
    const interval = setInterval(updateTimezoneTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timezoneConfig]);

  // Preview states
  const [previewRecipient, setPreviewRecipient] = useState<Recipient>({ 
    email: 'john.doe@example.com', 
    name: 'John Doe' 
  });

  const handleSendCampaign = async () => {
    console.log('🚀 Send Campaign button clicked!');
    console.log('📊 Campaign data:', { campaignName, subject, body: body.substring(0, 50), recipients: recipients.length, selectedSenders });
    
    if (!campaignName || !subject || !body || recipients.length === 0 || selectedSenders.length === 0) {
      console.log('❌ Validation failed:', { campaignName: !!campaignName, subject: !!subject, body: !!body, recipients: recipients.length, selectedSenders: selectedSenders.length });
      setStatus('Please fill in all fields, select sender emails, and add recipients');
      return;
    }

    console.log('✅ Validation passed, starting campaign...');
    setIsLoading(true);
    setStatus('Starting campaign...');

    try {
      console.log('📡 Sending request to /api/campaigns/send...');
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignName,
          subject,
          text: body,
          recipients,
          selectedSenders: selectedSenders,
          timezoneConfig: timezoneConfig
        }),
      });

      console.log('📨 Response received:', response.status, response.ok);
      const result = await response.json();
      console.log('📄 Response data:', result);

      if (response.ok) {
        console.log('✅ Campaign started successfully!');
        setStatus(`Campaign started! Sending to ${result.totalRecipients} recipients.`);
      } else {
        console.log('❌ Campaign start failed:', result.error);
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      console.log('💥 Network error:', error);
      setStatus('Error starting campaign');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = () => {
    const previewSubject = personalizeContent(subject, previewRecipient, 0, '');
    const previewBody = personalizeContent(body, previewRecipient, 0, '');

    return (
      <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden shadow-soft">
        <div className="bg-gradient-to-r from-primary-50 to-accent-50 px-6 py-4 border-b border-gray-200/60">
          <div className="font-bold text-gray-900 text-lg">{previewSubject || 'Subject Line'}</div>
          <div className="text-sm text-gray-600 mt-1">
            To: {previewRecipient.name} &lt;{previewRecipient.email}&gt;
          </div>
        </div>
        <div className="p-6">
          <div 
            className="whitespace-pre-wrap text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: (previewBody || 'Email body will appear here...').replace(/\n/g, '<br>') 
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-slide-up pb-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-4">
          Compose Campaign
        </h1>
        <p className="text-lg text-gray-600">
          Create and personalize your email campaigns with advanced features
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compose Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-blue">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Campaign Details</h2>
              <p className="text-gray-600">Configure your email campaign</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
                placeholder="My Awesome Campaign"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Sender Emails ({selectedSenders.length} selected)
              </label>
              <div className="bg-white border border-gray-300 rounded-2xl p-4 max-h-64 overflow-y-auto">
                {senders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No sender emails configured</p>
                    <p className="text-sm text-gray-400 mt-1">Go to Manage Senders to add sender addresses</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Select senders for this campaign:</span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSenders([...senders])}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSenders([])}
                          className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    {senders.map((sender, index) => (
                      <label key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSenders.includes(sender)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSenders([...selectedSenders, sender]);
                            } else {
                              setSelectedSenders(selectedSenders.filter(email => email !== sender));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {sender.split('@')[0]}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {sender}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedSenders.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-700 font-medium">
                    <strong>Selected {selectedSenders.length} senders:</strong> Campaign will rotate between these sender addresses
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedSenders.slice(0, 3).map((email, index) => (
                      <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {email.split('@')[0]}
                      </span>
                    ))}
                    {selectedSenders.length > 3 && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        +{selectedSenders.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Settings */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                📅 Schedule Settings
              </label>
              <select
                value={timezoneConfig?.targetTimezone || ''}
                onChange={(e) => {
                  if (e.target.value === '') {
                    setTimezoneConfig(null);
                  } else {
                    const preset = Object.values(TIMEZONE_PRESETS).find(
                      p => p.targetTimezone === e.target.value
                    );
                    if (preset) {
                      setTimezoneConfig({...preset});
                    }
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
              >
                <option value="">No schedule (send anytime)</option>
                <option value={TIMEZONE_PRESETS.AUSTRALIA_SYDNEY.targetTimezone}>🇦🇺 Australia/Sydney (AEDT/AEST)</option>
                <option value={TIMEZONE_PRESETS.AUSTRALIA_MELBOURNE.targetTimezone}>🇦🇺 Australia/Melbourne (AEDT/AEST)</option>
                <option value={TIMEZONE_PRESETS.SRI_LANKA.targetTimezone}>🇱🇰 Asia/Colombo (Sri Lanka)</option>
                <option value={TIMEZONE_PRESETS.SINGAPORE.targetTimezone}>🇸🇬 Asia/Singapore</option>
                <option value={TIMEZONE_PRESETS.DUBAI.targetTimezone}>🇦� Asia/Dubai (UAE)</option>
                <option value={TIMEZONE_PRESETS.LONDON.targetTimezone}>🇬🇧 Europe/London (GMT/BST)</option>
                <option value={TIMEZONE_PRESETS.NEW_YORK.targetTimezone}>🇺🇸 America/New_York (EST/EDT)</option>
                <option value={TIMEZONE_PRESETS.LOS_ANGELES.targetTimezone}>🇺🇸 America/Los_Angeles (PST/PDT)</option>
              </select>
              
              {timezoneConfig && (
                <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-5 mt-4">
                  {/* Current Time Display */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Current Time in {timezoneConfig.targetTimezone.split('/')[1]}</span>
                      <span className="text-base font-mono font-semibold text-gray-900">{currentTimeInTimezone}</span>
                    </div>
                  </div>

                  {/* Send These Days */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Send these days
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'sunday', label: 'Sunday' },
                        { key: 'monday', label: 'Monday' },
                        { key: 'tuesday', label: 'Tuesday' },
                        { key: 'wednesday', label: 'Wednesday' },
                        { key: 'thursday', label: 'Thursday' },
                        { key: 'friday', label: 'Friday' },
                        { key: 'saturday', label: 'Saturday' }
                      ].map((day) => {
                        const isSelected = timezoneConfig?.sendDays?.[day.key as keyof typeof timezoneConfig.sendDays];
                        return (
                          <label
                            key={day.key}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected || false}
                              onChange={(e) => {
                                if (!timezoneConfig) return;
                                setTimezoneConfig({
                                  ...timezoneConfig,
                                  sendDays: {
                                    ...timezoneConfig.sendDays,
                                    [day.key]: e.target.checked
                                  }
                                });
                              }}
                              className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">{day.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Period */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Time Period Between Sequences
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">From</label>
                        <select
                          value={timezoneConfig.sendTimeStart}
                          onChange={(e) => setTimezoneConfig({
                            ...timezoneConfig,
                            sendTimeStart: parseInt(e.target.value),
                            businessHourStart: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                            <option key={hour} value={hour}>
                              {hour.toString().padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">To</label>
                        <select
                          value={timezoneConfig.sendTimeEnd}
                          onChange={(e) => setTimezoneConfig({
                            ...timezoneConfig,
                            sendTimeEnd: parseInt(e.target.value),
                            businessHourEnd: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                            <option key={hour} value={hour}>
                              {hour.toString().padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active Window Display */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          Active window: <span className="font-semibold">
                            {timezoneConfig.sendTimeStart.toString().padStart(2, '0')}:00 - 
                            {timezoneConfig.sendTimeEnd.toString().padStart(2, '0')}:00
                          </span>
                        </span>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-300">
                          {timezoneConfig.sendTimeEnd - timezoneConfig.sendTimeStart} hours
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Badge */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-300">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Schedule:</span> Sending on selected days from{' '}
                      {timezoneConfig.sendTimeStart.toString().padStart(2, '0')}:00 to{' '}
                      {timezoneConfig.sendTimeEnd.toString().padStart(2, '0')}:00{' '}
                      ({timezoneConfig.targetTimezone})
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
                placeholder="Your compelling subject line..."
              />
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
                <p className="text-xs text-primary-700 font-medium">
                  <strong>Tip:</strong> Use variables: {'{{name}}'}, {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Email Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm resize-none"
                placeholder="Hi {{name}},

I hope this email finds you well...

Best regards,
{{senderName}}"
              />
              <div className="bg-accent-50 border border-accent-200 rounded-xl p-3">
                <p className="text-xs text-accent-700 font-medium">
                  <strong>Advanced:</strong> Use spintax for variations: {'{'} option1|option2|option3 {'}'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Recipients ({recipients.length})
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl min-h-[150px]">
                {recipients.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No recipients imported. Go to the Recipients section to import your email list.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {recipients.slice(0, 5).map((recipient, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {recipient.name && recipient.name !== recipient.email.split('@')[0] 
                          ? `${recipient.name} <${recipient.email}>` 
                          : recipient.email
                        }
                      </div>
                    ))}
                    {recipients.length > 5 && (
                      <div className="text-sm text-gray-500 font-medium">
                        ... and {recipients.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700 font-medium">
                  <strong>Tip:</strong> Use the Recipients section to import your email list from CSV files or paste them directly.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={clearForm}
                className="px-4 py-3 rounded-2xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-300 border border-gray-300 hover:border-gray-400"
              >
                Clear Form
              </button>
              
              <button
                onClick={handleSendCampaign}
                disabled={isLoading || recipients.length === 0 || selectedSenders.length === 0}
                className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                  isLoading || recipients.length === 0 || selectedSenders.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-blue hover:shadow-large'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Starting Campaign...</span>
                  </div>
                ) : recipients.length === 0 ? (
                  'Import Recipients First'
                ) : selectedSenders.length === 0 ? (
                  'Select Sender Emails'
                ) : (
                  `Send to ${recipients.length} Recipients (${selectedSenders.length} senders)`
                )}
              </button>
            </div>

            {status && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 rounded-2xl p-4 shadow-soft">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">Campaign Status</h4>
                    <pre className="text-sm whitespace-pre-wrap text-gray-700">{status}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-500 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Email Preview</h2>
              <p className="text-gray-600">See how your email will look</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Preview for recipient:
              </label>
              <input
                type="email"
                value={previewRecipient.email}
                onChange={(e) => setPreviewRecipient({
                  ...previewRecipient,
                  email: e.target.value,
                  name: e.target.value.split('@')[0]
                })}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 shadow-sm"
                placeholder="preview@example.com"
              />
            </div>

            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
}