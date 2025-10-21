import React, { useState, useEffect } from 'react';

interface CampaignStatus {
  isRunning: boolean;
  campaignName: string;
  sent: number;
  successful: number;
  failed: number;
  total: number;
  completed: boolean;
  startTime: number | null;
  duration?: number;
  subject?: string;
  status?: 'idle' | 'running' | 'paused' | 'stopped' | 'completed';
  nextEmailIn?: number | null;
  lastDelay?: number | null;
}

interface EmailDetail {
  timestamp: string;
  recipient: string;
  subject: string;
  status: 'success' | 'failed';
  error?: string;
  sender: string;
  campaignName?: string;
  campaignId?: string;
}

interface CampaignHistory {
  name: string;
  subject: string;
  totalSent: number;
  successful: number;
  failed: number;
  duration: number;
  timestamp: string;
  totalRecipients: number;
}

export default function AnalyticsSection() {
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>({
    isRunning: false,
    campaignName: '',
    sent: 0,
    successful: 0,
    failed: 0,
    total: 0,
    completed: false,
    startTime: null,
    status: 'idle'
  });
  const [emailDetails, setEmailDetails] = useState<EmailDetail[]>([]);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [campaignHistory, setCampaignHistory] = useState<CampaignHistory[]>([]);
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [runningCampaigns, setRunningCampaigns] = useState<any[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [campaignStats, setCampaignStats] = useState<any>(null);

  // Separate timer for duration display (updates every 1 second)
  useEffect(() => {
    let durationInterval: NodeJS.Timeout;

    if (campaignStatus.isRunning && campaignStatus.startTime) {
      const updateDuration = () => {
        const elapsed = Date.now() - campaignStatus.startTime!;
        setCurrentDuration(elapsed);
      };

      // Update immediately
      updateDuration();

      // Then update every seconduu
      durationInterval = setInterval(updateDuration, 1000);
    } else {
      setCurrentDuration(0);
    }

    return () => {
      if (durationInterval) clearInterval(durationInterval);
    };
  }, [campaignStatus.isRunning, campaignStatus.startTime]);

  // Load campaign history from localStorage on component mount
  useEffect(() => {
    loadCampaignHistory();
    checkForRunningCampaign();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Define fetch functions inside useEffect to avoid stale closures
    const fetchCampaignStatus = async () => {
      try {
        console.log('🔄 Polling campaign status at', new Date().toLocaleTimeString()); // Enhanced debug

        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/campaigns/multi-status', { headers });

        if (response.ok) {
          const data = await response.json();
          console.log('📡 Fetched multi-campaign status:', data); // Debug log
          console.log('📊 Running campaigns:', data.runningCampaigns?.length || 0); // Enhanced debug

          // Use the primary campaign status for backward compatibility
          const status = {
            isRunning: data.isRunning,
            campaignName: data.campaignName,
            sent: data.sent,
            successful: data.successful,
            failed: data.failed,
            total: data.total,
            subject: data.subject,
            completed: data.completed,
            startTime: data.startTime,
            status: data.status,
            campaignId: data.campaignId,
            nextEmailIn: data.nextEmailIn,
            lastDelay: data.lastDelay
          };

          // Update multi-campaign data
          setRunningCampaigns(data.runningCampaigns || []);
          setAllCampaigns(data.allCampaigns || []);
          setCampaignStats(data.stats || null);

          setCampaignStatus(prevStatus => {
            console.log('🔄 Previous status:', prevStatus); // Debug previous state
            console.log('🆕 New status:', status); // Debug new state

            // Check if campaign just completed or started (prevent spam)
            const wasRunning = prevStatus.isRunning;
            const wasCompleted = prevStatus.completed;
            const wasSent = prevStatus.sent;
            const isNowCompleted = !status.isRunning && status.completed && wasRunning;
            const justStarted = status.isRunning && !wasRunning && !wasCompleted;
            const progressChanged = status.isRunning && status.sent > wasSent;

            console.log('🔍 State changes - justStarted:', justStarted, 'progressChanged:', progressChanged, 'isNowCompleted:', isNowCompleted);

            // Add activity log entry only for actual state changes
            if (justStarted) {
              addToActivityLog(`🚀 Starting campaign: "${status.campaignName}" to ${status.total} recipients`);
              addToActivityLog(`✅ Campaign accepted by server - sending ${status.total} emails`);
            } else if (progressChanged) {
              addToActivityLog(`📈 Progress: ${status.sent}/${status.total} emails sent`);
            } else if (isNowCompleted) {
              addToActivityLog(`🎉 Campaign "${status.campaignName}" completed! ${status.successful}/${status.sent} emails sent successfully`);

              // Save completed campaign to history (like original HTML/JS project)
              const campaignData: CampaignHistory = {
                name: status.campaignName || 'Unknown Campaign',
                subject: status.subject || 'Unknown Subject',
                totalSent: status.sent,
                successful: status.successful,
                failed: status.failed,
                duration: status.startTime ? Date.now() - status.startTime : 0,
                timestamp: new Date().toLocaleString(),
                totalRecipients: status.total
              };

              saveCampaignToHistory(campaignData);
              addToActivityLog(`💾 Campaign data saved to history`);
            }

            return status;
          });
        }
      } catch (error) {
        console.error('❌ Error fetching campaign status:', error);
      }
    };

    const fetchEmailDetails = async () => {
      try {
        console.log('📧 Polling email details at', new Date().toLocaleTimeString()); // Enhanced debug
        const response = await fetch('/api/email-details');

        if (response.ok) {
          const details = await response.json();
          console.log('📧 Fetched email details:', details.length, 'entries'); // Debug log
          setEmailDetails(details);
        }
      } catch (error) {
        console.error('❌ Error fetching email details:', error);
      }
    };

    // Poll campaign status and email details every 1.5 seconds (matching original)
    const fetchData = async () => {
      console.log('🔄 Starting data fetch cycle at', new Date().toLocaleTimeString()); // Enhanced debug
      await fetchCampaignStatus();
      await fetchEmailDetails();
      console.log('✅ Data fetch cycle completed at', new Date().toLocaleTimeString()); // Enhanced debug
    };

    // Start polling immediately
    console.log('🚀 Starting real-time polling for campaign updates'); // Enhanced debug
    fetchData();

    interval = setInterval(fetchData, 1500);

    return () => {
      console.log('🛑 Stopping real-time polling'); // Enhanced debug
      if (interval) clearInterval(interval);
    };
  }, []); // Empty dependencies - functions are defined inside

  // Check for running campaigns on page load (like original HTML/JS project)
  const checkForRunningCampaign = async () => {
    try {
      const response = await fetch('/api/campaigns/status');
      if (response.ok) {
        const status = await response.json();

        if (status.isRunning) {
          // Restore campaign stats for polling (like original)
          const restoredStatus: CampaignStatus = {
            isRunning: true,
            campaignName: status.campaignName || 'Unknown Campaign',
            sent: status.sent || 0,
            successful: status.successful || 0,
            failed: status.failed || 0,
            total: status.total || 0,
            completed: false,
            startTime: Date.now() - (status.duration || 0), // Approximate start time
            subject: status.subject || 'Unknown Subject'
          };

          setCampaignStatus(restoredStatus);

          // Add activity log entries about reconnection
          addToActivityLog(`✅ Reconnected to running campaign: "${status.campaignName}"`);
          addToActivityLog(`📊 Current progress: ${status.sent}/${status.total} emails sent`);
          addToActivityLog(`✅ Successful: ${status.successful}, ❌ Failed: ${status.failed}`);
          addToActivityLog('🔄 Continuing to monitor campaign progress...');
        }
      }
    } catch (error) {
      // No running campaign found or server not available
    }
  };

  // Load campaign history from localStorage
  const loadCampaignHistory = () => {
    try {
      const history = localStorage.getItem('campaignHistory');
      if (history) {
        const parsed = JSON.parse(history);
        setCampaignHistory(parsed);
      }
    } catch (error) {
      console.error('❌ Error loading campaign history:', error);
    }
  };

  // Save campaign to history (like original HTML/JS project)
  const saveCampaignToHistory = (campaignData: CampaignHistory) => {
    try {
      const history = JSON.parse(localStorage.getItem('campaignHistory') || '[]');
      history.unshift(campaignData);

      // Keep only last 10 campaigns
      if (history.length > 10) {
        history.splice(10);
      }

      localStorage.setItem('campaignHistory', JSON.stringify(history));
      setCampaignHistory(history);
    } catch (error) {
      console.error('Error saving campaign to history:', error);
    }
  };

  const addToActivityLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setActivityLog(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 entries
  };

  // Manual refresh function for buttons
  const manualFetchEmailDetails = async () => {
    try {
      const response = await fetch('/api/email-details');
      if (response.ok) {
        const details = await response.json();
        setEmailDetails(details);
      }
    } catch (error) {
      console.error('Error fetching email details:', error);
    }
  };

  // Manual test status fetch
  const testStatusFetch = async () => {
    try {
      console.log('🧪 Testing status API...');
      const response = await fetch('/api/campaigns/status');
      const data = await response.json();
      console.log('🧪 Status API response:', data);
      setCampaignStatus(data);
      addToActivityLog(`🧪 Manual status fetch: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('🧪 Status test failed:', error);
      addToActivityLog(`❌ Status test failed: ${error.message}`);
    }
  };

  const clearLog = () => {
    setActivityLog([]);
  };

  const clearDetails = () => {
    setEmailDetails([]);
  };

  // Helper to update local runningCampaigns status optimistically
  const updateLocalCampaignStatus = (campaignId: string, status: string) => {
    setRunningCampaigns(prev => prev.map((c: any) => c.campaignId === campaignId ? { ...c, status } : c));
    // also update primary campaignStatus when applicable
    setCampaignStatus(prev => {
      try {
        if ((prev as any).campaignId && (prev as any).campaignId === campaignId) {
          return { ...(prev as any), status } as any;
        }
      } catch (e) {
        // ignore
      }
      return prev;
    });
  };

  const resetCampaign = async () => {
    try {
      const response = await fetch('/api/campaigns/reset', { method: 'POST' });
      if (response.ok) {
        setCampaignStatus({
          isRunning: false,
          campaignName: '',
          sent: 0,
          successful: 0,
          failed: 0,
          total: 0,
          completed: false,
          startTime: null,
          status: 'idle'
        });
        addToActivityLog('🔄 Campaign manually reset');
      }
    } catch (error) {
      console.error('Error resetting campaign:', error);
      addToActivityLog('❌ Failed to reset campaign');
    }
  };

  // Campaign control functions
  const pauseCampaign = async (arg?: any) => {
    // arg may be a MouseEvent when used as onClick, or a campaignId when called directly
    const campaignId = typeof arg === 'string' ? arg : undefined;
    try {
      const body = campaignId ? { campaignId } : {};
      const response = await fetch('/api/campaigns/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        addToActivityLog(`⏸️ Campaign ${campaignId ? `"${campaignId}"` : ''} paused by user`);
        setRunningCampaigns(prev => prev.map((c: any) => c.campaignId === campaignId ? { ...c, status: 'paused' } : c));
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      addToActivityLog('❌ Failed to pause campaign');
    }
  };

  const resumeCampaign = async (arg?: any) => {
    const campaignId = typeof arg === 'string' ? arg : undefined;
    try {
      const body = campaignId ? { campaignId } : {};
      const response = await fetch('/api/campaigns/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        addToActivityLog(`▶️ Campaign ${campaignId ? `"${campaignId}"` : ''} resumed by user`);
        setRunningCampaigns(prev => prev.map((c: any) => c.campaignId === campaignId ? { ...c, status: 'running' } : c));
      }
    } catch (error) {
      console.error('Error resuming campaign:', error);
      addToActivityLog('❌ Failed to resume campaign');
    }
  };

  const stopCampaign = async (arg?: any) => {
    const campaignId = typeof arg === 'string' ? arg : undefined;
    try {
      const body = campaignId ? { campaignId } : {};
      const response = await fetch('/api/campaigns/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        addToActivityLog(`⏹️ Campaign ${campaignId ? `"${campaignId}"` : ''} stopped by user`);
        setRunningCampaigns(prev => prev.map((c: any) => c.campaignId === campaignId ? { ...c, status: 'stopped' } : c));
      }
    } catch (error) {
      console.error('Error stopping campaign:', error);
      addToActivityLog('❌ Failed to stop campaign');
    }
  };

  const getProgressPercentage = () => {
    if (campaignStatus.total === 0) return 0;
    return Math.round((campaignStatus.sent / campaignStatus.total) * 100);
  };

  const getSuccessRate = () => {
    if (campaignStatus.sent === 0) return 0;
    return Math.round((campaignStatus.successful / campaignStatus.sent) * 100);
  };

  const formatDuration = () => {
    if (!campaignStatus.startTime) return '0s';
    const duration = currentDuration;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <div className="space-y-8 animate-slide-up pb-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-4">
          Campaign Analytics
        </h1>
        <p className="text-lg text-gray-600">
          Monitor your email campaign performance and real-time metrics
        </p>
      </div>

      <div className="space-y-8">
        {/* Running Campaigns - Shows all campaigns with independent data */}
        {runningCampaigns.length > 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-green">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Running Campaigns ({runningCampaigns.length})</h2>
                <p className="text-gray-600">Monitor active email campaigns with real-time progress</p>
              </div>
            </div>

            <div className="grid gap-6">
              {runningCampaigns.map((campaign, index) => {
                // Filter emails for this specific campaign. Some legacy details may not have campaignId;
                // fall back to matching campaignName if available.
                const campaignEmails = emailDetails.filter(detail => {
                  if (detail.campaignId) return detail.campaignId === campaign.campaignId;
                  if (detail.campaignName) return detail.campaignName === campaign.campaignName;
                  return false;
                });
                
                // Debug logging
                console.log(`🎯 Campaign: ${campaign.campaignName}`, {
                  nextEmailIn: campaign.nextEmailIn,
                  emailsCount: campaignEmails.length,
                  status: campaign.status
                });
                
                return (
                  <div key={campaign.campaignId} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${campaign.status === 'running' ? 'bg-green-500 animate-pulse' :
                            campaign.status === 'paused' ? 'bg-yellow-500' :
                              'bg-red-500'
                          }`}></div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{campaign.campaignName}</h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <p className="text-sm text-gray-600">
                              Status: <span className="font-medium capitalize">{campaign.status}</span>
                            </p>
                            {campaign.nextEmailIn && campaign.nextEmailIn > 0 ? (
                              <div className="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs text-blue-700 font-semibold">
                                  Next: {campaign.nextEmailIn}s
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-green-600">
                          {Math.round((campaign.sent / campaign.total) * 100)}%
                        </span>
                        <div className="text-sm text-gray-500">
                          {campaign.sent}/{campaign.total} emails
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((campaign.sent / campaign.total) * 100)}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-lg font-bold text-green-600">{campaign.successful}</div>
                        <div className="text-xs text-gray-600">Successful</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-lg font-bold text-red-600">{campaign.failed}</div>
                        <div className="text-xs text-gray-600">Failed</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-lg font-bold text-blue-600">
                          {Math.round((campaign.successful / campaign.sent) * 100) || 0}%
                        </div>
                        <div className="text-xs text-gray-600">Success Rate</div>
                      </div>
                    </div>

                    {/* Recent Emails for this Campaign */}
                    {campaignEmails.length > 0 && (
                      <div className="mb-4 bg-white rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Recent Emails (Last {Math.min(campaignEmails.length, 5)})
                        </h4>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {campaignEmails.slice(0, 5).map((detail, idx) => {
                            const isSuccess = detail.status === 'success';
                            return (
                              <div key={idx} className="flex items-center space-x-2 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                <span className={`${isSuccess ? 'text-green-500' : 'text-red-500'} text-sm`}>
                                  {isSuccess ? '✅' : '❌'}
                                </span>
                                <span className="text-gray-700 font-medium flex-1 truncate">{detail.recipient}</span>
                                <span className="text-gray-400 text-xs">→</span>
                                <span className="text-blue-600 font-mono text-xs truncate max-w-[150px]" title={detail.sender}>
                                  {detail.sender}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={async () => {
                          // Optimistically update UI and call API
                          updateLocalCampaignStatus(campaign.campaignId, 'paused');
                          try {
                            await pauseCampaign(campaign.campaignId);
                          } catch (err) {
                            // Revert on error
                            updateLocalCampaignStatus(campaign.campaignId, campaign.status);
                          }
                        }}
                        disabled={campaign.status !== 'running'}
                        className="flex-1 bg-yellow-100 hover:bg-yellow-200 disabled:bg-gray-100 disabled:text-gray-400 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-yellow-200"
                      >
                        ⏸️ Pause
                      </button>
                      <button
                        onClick={async () => {
                          updateLocalCampaignStatus(campaign.campaignId, 'running');
                          try {
                            await resumeCampaign(campaign.campaignId);
                          } catch (err) {
                            updateLocalCampaignStatus(campaign.campaignId, campaign.status);
                          }
                        }}
                        disabled={campaign.status !== 'paused'}
                        className="flex-1 bg-green-100 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-green-200"
                      >
                        ▶️ Resume
                      </button>
                      <button
                        onClick={async () => {
                          updateLocalCampaignStatus(campaign.campaignId, 'stopped');
                          try {
                            await stopCampaign(campaign.campaignId);
                          } catch (err) {
                            updateLocalCampaignStatus(campaign.campaignId, campaign.status);
                          }
                        }}
                        disabled={campaign.status === 'stopped'}
                        className="flex-1 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-red-200"
                      >
                        ⏹️ Stop
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No Active Campaigns</h3>
            <p className="text-gray-600 mb-6">Start a new campaign from the Compose section to see real-time progress here.</p>
          </div>
        )}

        {/* Real-time Email Sending Details */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-blue">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Email Sending Details</h2>
                <p className="text-gray-600">Real-time email delivery status with sender mapping</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 h-80 overflow-y-auto">
            {emailDetails.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">Email sending details will appear here when campaigns are running...</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Campaign Header */}
                {campaignStatus.campaignName && (
                  <div className="mb-4">
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold text-blue-800">📧 {campaignStatus.campaignName}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Details List */}
                <div className="space-y-1">
                  {emailDetails.map((detail, index) => {
                    const timestamp = new Date(detail.timestamp).toLocaleTimeString();
                    const isSuccess = detail.status === 'success';

                    return (
                      <div key={index} className="flex items-center space-x-3 p-2 text-sm font-mono bg-white rounded border hover:bg-gray-50 transition-colors">
                        <span className="text-gray-500 text-xs min-w-[80px]">[{timestamp}]</span>
                        <span className={`text-lg ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                          {isSuccess ? '✅' : '❌'}
                        </span>
                        <span className="text-gray-800 font-medium flex-1">{detail.recipient}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 min-w-[150px]">{detail.sender}</span>
                        {!isSuccess && detail.error && (
                          <span className="text-red-600 text-xs ml-2 max-w-[200px] truncate" title={detail.error}>
                            ({detail.error})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-500 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Activity Log</h2>
                <p className="text-gray-600">System events and campaign updates</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={clearLog}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-all duration-300 font-medium border border-gray-200"
              >
                Clear Log
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 h-60 overflow-y-auto">
            {activityLog.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">Activity log is empty</p>
                <p className="text-sm">System events and campaign updates will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityLog.map((entry, index) => (
                  <div key={index} className="text-gray-700 p-2 text-sm bg-white rounded border hover:bg-gray-50 transition-colors">
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}