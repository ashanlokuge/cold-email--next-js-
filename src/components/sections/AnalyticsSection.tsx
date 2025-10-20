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

      // Then update every second
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
        {/* Current Campaign Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-blue">
              {campaignStatus.isRunning ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Campaign Status</h2>
              <p className="text-gray-600">Real-time campaign monitoring</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-lg font-semibold text-gray-800">
                  {campaignStatus.isRunning
                    ? `"${campaignStatus.campaignName}": Sending ${campaignStatus.sent} of ${campaignStatus.total} emails...`
                    : campaignStatus.completed
                      ? `"${campaignStatus.campaignName}" completed: ${campaignStatus.sent}/${campaignStatus.total}`
                      : 'No active campaign'
                  }
                </span>
                {campaignStatus.isRunning && (
                  <div className="flex flex-col space-y-1 mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-success-600 font-medium">Live Campaign</span>
                    </div>
                    {campaignStatus.nextEmailIn && campaignStatus.nextEmailIn > 0 && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-blue-600 font-medium">
                          Next email in {campaignStatus.nextEmailIn}s
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  {getProgressPercentage()}%
                </span>
                <div className="text-sm text-gray-500">Complete</div>
                {(campaignStatus.isRunning || campaignStatus.completed) && (
                  <button
                    onClick={resetCampaign}
                    className="mt-2 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-xs transition-all duration-300 font-medium border border-red-200"
                  >
                    Reset Campaign
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
              <div
                className="bg-gradient-to-r from-primary-500 to-accent-500 h-4 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>

          {/* Modern Campaign Control Panel */}
          {campaignStatus.isRunning && (
            <div className="mb-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${campaignStatus.status === 'running' ? 'bg-green-500 animate-pulse' :
                        campaignStatus.status === 'paused' ? 'bg-yellow-500' :
                          'bg-red-500'
                      }`}></div>
                    <span className="text-lg font-semibold text-gray-700">
                      Campaign Control
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Status: <span className="font-medium text-gray-700 capitalize">{campaignStatus.status || 'running'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {campaignStatus.status === 'running' ? (
                    <button
                      onClick={pauseCampaign}
                      className="group relative flex items-center space-x-2 bg-white hover:bg-yellow-50 text-yellow-700 px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-yellow-200 hover:border-yellow-300 shadow-sm hover:shadow-md transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                      </svg>
                      <span>Pause Campaign</span>
                      <div className="absolute inset-0 bg-yellow-100 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </button>
                  ) : campaignStatus.status === 'paused' ? (
                    <button
                      onClick={resumeCampaign}
                      className="group relative flex items-center space-x-2 bg-white hover:bg-green-50 text-green-700 px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Resume Campaign</span>
                      <div className="absolute inset-0 bg-green-100 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </button>
                  ) : null}

                  <button
                    onClick={stopCampaign}
                    className="group relative flex items-center space-x-2 bg-white hover:bg-red-50 text-red-700 px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                    <span>Stop Campaign</span>
                    <div className="absolute inset-0 bg-red-100 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{campaignStatus.sent}</div>
                  <div className="text-sm text-gray-600">Sent</div>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{campaignStatus.successful}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{campaignStatus.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{campaignStatus.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {campaignStatus.startTime && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200/60 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-700 mb-1">Duration: {formatDuration()}</div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-700 mb-1">Success Rate: {getSuccessRate()}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${campaignStatus.status === 'running' ? 'bg-green-500 animate-pulse' :
                        campaignStatus.status === 'paused' ? 'bg-yellow-500' :
                          campaignStatus.status === 'stopped' ? 'bg-red-500' :
                            campaignStatus.status === 'completed' ? 'bg-blue-500' :
                              'bg-gray-400'
                      }`}></div>
                    <span className="text-lg font-bold text-gray-700">
                      {campaignStatus.status === 'running' ? 'Running' :
                        campaignStatus.status === 'paused' ? 'Paused' :
                          campaignStatus.status === 'stopped' ? 'Stopped' :
                            campaignStatus.status === 'completed' ? 'Completed' :
                              'Idle'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Campaign Status</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Multiple Running Campaigns */}
        {runningCampaigns.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-green">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Running Campaigns ({runningCampaigns.length})</h2>
                <p className="text-gray-600">Multiple campaigns running simultaneously</p>
              </div>
            </div>

            <div className="grid gap-6">
              {runningCampaigns.map((campaign, index) => (
                <div key={campaign.campaignId} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200/60">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${campaign.status === 'running' ? 'bg-green-500 animate-pulse' :
                          campaign.status === 'paused' ? 'bg-yellow-500' :
                            'bg-red-500'
                        }`}></div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{campaign.campaignName}</h3>
                        <p className="text-sm text-gray-600">Status: {campaign.status}</p>
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

                  <div className="grid grid-cols-3 gap-4 text-center">
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

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => pauseCampaign(campaign.campaignId)}
                      disabled={campaign.status !== 'running'}
                      className="flex-1 bg-yellow-100 hover:bg-yellow-200 disabled:bg-gray-100 disabled:text-gray-400 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-yellow-200"
                    >
                      ⏸️ Pause
                    </button>
                    <button
                      onClick={() => resumeCampaign(campaign.campaignId)}
                      disabled={campaign.status !== 'paused'}
                      className="flex-1 bg-green-100 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-green-200"
                    >
                      ▶️ Resume
                    </button>
                    <button
                      onClick={() => stopCampaign(campaign.campaignId)}
                      disabled={campaign.status === 'stopped'}
                      className="flex-1 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-red-200"
                    >
                      ⏹️ Stop
                    </button>
                  </div>
                </div>
              ))}
            </div>
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