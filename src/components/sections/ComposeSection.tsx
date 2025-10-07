import React, { useState, useEffect } from 'react';
import { personalizeContent, expandSpintax } from '@/lib/utils';
import type { Recipient } from '@/types';

interface ComposeSectionProps {
  recipients: Recipient[];
  senders: string[];
  templates: any[];
  campaignFormData: {
    campaignName: string;
    subject: string;
    body: string;
    selectedSenders: string[];
  };
  setCampaignFormData: React.Dispatch<React.SetStateAction<{
    campaignName: string;
    subject: string;
    body: string;
    selectedSenders: string[];
  }>>;
}

export default function ComposeSection({ recipients, senders, templates, campaignFormData, setCampaignFormData }: ComposeSectionProps) {
  // Use persistent form data from parent component
  const { campaignName, subject, body, selectedSenders } = campaignFormData;
  
  // Local state for UI-only data
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

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

  const clearForm = () => {
    setCampaignFormData({
      campaignName: '',
      subject: '',
      body: '',
      selectedSenders: []
    });
    setStatus('Form cleared');
    setTimeout(() => setStatus(''), 2000);
  };

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
          selectedSenders: selectedSenders
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
    <div className="space-y-8 animate-slide-up">
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