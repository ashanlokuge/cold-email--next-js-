import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';

interface Campaign {
  _id: string;
  userId: string;
  userEmail: string;
  campaignName: string;
  subject: string;
  status: 'running' | 'stopped' | 'completed';
  totalRecipients: number;
  sentCount: number;
  successCount: number;
  failedCount: number;
  startTime: string;
  endTime?: string;
  selectedSenders: string[];
  emailLogs?: EmailLogEntry[];
  nextEmailIn?: number;
}

interface EmailLogEntry {
  email: string;
  name?: string;
  status: 'sent' | 'failed';
  timestamp: string;
  error?: string;
  sender?: string;
}

interface CampaignStats {
  totalCampaigns: number;
  runningCampaigns: number;
  completedCampaigns: number;
  totalEmailsSent: number;
  totalSuccessful: number;
  totalFailed: number;
}

const CampaignsHistorySection = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');

  useEffect(() => {
    fetchCampaigns();
    
    // Check if there are running campaigns
    const hasRunningCampaigns = campaigns.some(c => c.status === 'running');
    
    // Auto-refresh more frequently if campaigns are running
    const refreshInterval = hasRunningCampaigns ? 2000 : 10000; // 2s for running, 10s otherwise
    
    const interval = setInterval(() => {
      fetchCampaigns();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [campaigns]); // Re-run when campaigns change to adjust refresh rate

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/campaigns/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
        setStats(data.stats);
      } else {
        toast.error('Failed to fetch campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Error fetching campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const viewCampaignDetails = async (campaign: Campaign) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/campaigns/details?id=${campaign._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedCampaign(data.campaign);
        setShowDetails(true);
      } else {
        toast.error('Failed to fetch campaign details');
      }
    } catch (error) {
      toast.error('Error fetching campaign details');
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    if (filter === 'running') return campaign.status === 'running';
    if (filter === 'completed') return campaign.status === 'completed' || campaign.status === 'stopped';
    return true;
  });

  const calculateSuccessRate = (success: number, total: number) => {
    if (total === 0) return '0.0';
    return ((success / total) * 100).toFixed(1);
  };

  // Campaign control handlers (pause/resume removed)

  const handleStopCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to stop this campaign? This action cannot be undone and will permanently stop the campaign.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch('/api/campaigns/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId })
      });

      if (response.ok) {
        toast.success('Campaign stopped successfully');
        fetchCampaigns(); // Refresh the list
      } else if (response.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (response.status === 404) {
        toast.error('Campaign not found. It may have already completed.');
        fetchCampaigns(); // Refresh to remove from list
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(`Failed to stop campaign: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error stopping campaign:', error);
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  // Timer component for next email countdown
  const NextEmailTimer = ({ nextEmailIn }: { nextEmailIn?: number }) => {
    const [timeLeft, setTimeLeft] = useState(nextEmailIn || 0);

    useEffect(() => {
      setTimeLeft(nextEmailIn || 0);
    }, [nextEmailIn]);

    useEffect(() => {
      if (timeLeft <= 0) return;

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Refresh campaigns when timer reaches 0
            fetchCampaigns();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }, [timeLeft]);

    if (!nextEmailIn || timeLeft <= 0) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="text-xs text-blue-600 font-medium">
        Next email in: {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign History</h1>
          <p className="text-gray-600 mt-1">View and manage all your email campaigns</p>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            fetchCampaigns();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCampaigns}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.runningCampaigns} running · {stats.completedCampaigns} completed
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmailsSent.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 012 2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              {stats.totalSuccessful.toLocaleString()} successful
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {calculateSuccessRate(stats.totalSuccessful, stats.totalEmailsSent)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-red-600 mt-2">
              {stats.totalFailed.toLocaleString()} failed
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setFilter('all')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Campaigns ({campaigns.length})
            </button>
            <button
              onClick={() => setFilter('running')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                filter === 'running'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active ({campaigns.filter(c => c.status === 'running').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                filter === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed ({campaigns.filter(c => c.status === 'completed' || c.status === 'stopped').length})
            </button>
          </nav>
        </div>

        {/* Campaigns Table */}
        <div className="overflow-x-auto">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new campaign.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => (
                  <tr 
                    key={campaign._id} 
                    className={`hover:bg-gray-50 ${campaign.status === 'running' ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {campaign.status === 'running' && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{campaign.campaignName}</div>
                          <div className="text-sm text-gray-500">{campaign.subject}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{campaign.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const sent = Number.isFinite(Number(campaign.sentCount)) ? Number(campaign.sentCount) : 0;
                        const total = Number.isFinite(Number(campaign.totalRecipients)) ? Number(campaign.totalRecipients) : 0;
                        const pct = total > 0 ? Math.min(100, Math.max(0, (sent / total) * 100)) : 0;

                        return (
                          <>
                            <div className="text-sm text-gray-900">
                              {sent} / {total}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const success = Number.isFinite(Number(campaign.successCount)) ? Number(campaign.successCount) : 0;
                        const sentSoFar = Number.isFinite(Number(campaign.sentCount)) ? Number(campaign.sentCount) : 0;
                        const rate = sentSoFar > 0 ? ((success / sentSoFar) * 100).toFixed(1) : '0.0';

                        return (
                          <>
                            <div className="text-sm text-gray-900">{rate}%</div>
                            <div className="text-xs text-gray-500">{success} / {sentSoFar} sent</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(campaign.startTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col gap-1">
                        {/* Control buttons for running campaigns */}
                        {(campaign.status === 'running' || campaign.status === 'stopped' || campaign.status === 'completed') && (
                          <div className="flex gap-1 mb-1">
                            <button
                              onClick={() => handleStopCampaign(campaign._id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                              title="Stop campaign"
                            >
                              ⏹️ Stop
                            </button>
                          </div>
                        )}
                        
                        {/* Next email timer for running campaigns */}
                        {campaign.status === 'running' && campaign.nextEmailIn && (
                          <NextEmailTimer nextEmailIn={campaign.nextEmailIn} />
                        )}
                        
                        {/* View Details button */}
                        <button
                          onClick={() => viewCampaignDetails(campaign)}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {showDetails && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{selectedCampaign.campaignName}</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Campaign Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCampaign.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subject</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCampaign.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCampaign.status)}`}>
                    {selectedCampaign.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Started</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(selectedCampaign.startTime).toLocaleString()}</p>
                </div>
                {selectedCampaign.endTime && (
                  <div>
                    <p className="text-sm text-gray-500">Ended</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(selectedCampaign.endTime).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Total Recipients</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCampaign.totalRecipients}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Emails Sent</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCampaign.sentCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Successful</p>
                  <p className="text-sm font-medium text-green-600">{selectedCampaign.successCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Failed</p>
                  <p className="text-sm font-medium text-red-600">{selectedCampaign.failedCount}</p>
                </div>
              </div>

              {/* Senders Used */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Senders Used</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaign.selectedSenders.map((sender, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {sender}
                    </span>
                  ))}
                </div>
              </div>

              {/* Email Logs */}
              {selectedCampaign.emailLogs && selectedCampaign.emailLogs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Email Logs (Last 200)</h4>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedCampaign.emailLogs.map((log, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {log.name || log.email}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {log.status === 'sent' ? (
                                <span className="text-green-600">✓ Sent</span>
                              ) : (
                                <span className="text-red-600" title={log.error}>✗ Failed</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{log.sender}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsHistorySection;
