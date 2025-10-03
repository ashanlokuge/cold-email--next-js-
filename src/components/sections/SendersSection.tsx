import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Sender {
  email: string;
  username: string;
  displayName: string;
  domain: string;
  provisioningState?: string;
}

interface SendersSectionProps {
  senders: string[];
  setSenders: (senders: string[]) => void;
}

export default function SendersSection({ senders, setSenders }: SendersSectionProps) {
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [newSender, setNewSender] = useState({
    username: '',
    displayName: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSenders();
    loadDomains();
  }, []);

  const loadSenders = async () => {
    try {
      const response = await fetch('/api/senders');
      if (response.ok) {
        const data = await response.json();
        // The API returns { domain, count, senders } so we need data.senders
        setSenders(data.senders || []);
      }
    } catch (error) {
      console.error('Error loading senders:', error);
    }
  };

  const loadDomains = async () => {
    try {
      const response = await fetch('/api/domains');
      if (response.ok) {
        const data = await response.json();
        if (data.domains && data.domains.length > 0) {
          const domainNames = data.domains.map((d: any) => d.name);
          setDomains(domainNames);
          if (domainNames.length > 0) {
            setSelectedDomain(domainNames[0]);
          }
        } else {
          toast.error('No domains available');
        }
      } else {
        toast.error('Failed to load domains');
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Error loading domains');
    }
  };

  const addSender = async () => {
    if (!newSender.username || !newSender.displayName || !selectedDomain) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newSender.username,
          displayName: newSender.displayName,
          domain: selectedDomain
        })
      });

      if (response.ok) {
        toast.success('Sender added successfully');
        setNewSender({ username: '', displayName: '' });
        loadSenders();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add sender');
      }
    } catch (error) {
      console.error('Error adding sender:', error);
      toast.error('Error adding sender');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSender = async (username: string) => {
    if (!confirm('Are you sure you want to delete this sender?')) return;

    try {
      const response = await fetch('/api/senders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        toast.success('Sender deleted successfully');
        loadSenders();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete sender');
      }
    } catch (error) {
      console.error('Error deleting sender:', error);
      toast.error('Error deleting sender');
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-4">
          Sender Management
        </h1>
        <p className="text-lg text-gray-600">
          Configure and manage your verified email sender addresses
        </p>
      </div>

      {/* Add New Sender Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-blue">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Add New Sender</h2>
            <p className="text-gray-600">Create a new verified sender address</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Username
            </label>
            <input
              type="text"
              value={newSender.username}
              onChange={(e) => setNewSender({ ...newSender, username: e.target.value })}
              placeholder="e.g., support"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Display Name
            </label>
            <input
              type="text"
              value={newSender.displayName}
              onChange={(e) => setNewSender({ ...newSender, displayName: e.target.value })}
              placeholder="e.g., Support Team"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
            >
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={addSender}
          disabled={isLoading}
          className="mt-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-2xl hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-blue hover:shadow-large font-semibold"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Adding...</span>
            </div>
          ) : (
            'Add Sender'
          )}
        </button>
      </div>

      {/* Existing Senders */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-500 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Current Senders</h2>
              <p className="text-gray-600">{senders.length} active sender{senders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {senders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No senders configured yet</h3>
            <p className="text-gray-500 mb-6">Add your first sender above to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {senders.map((sender) => (
              <div
                key={sender}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200/60 p-4 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {sender.split('@')[0].charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{sender}</h3>
                      <p className="text-gray-600 text-xs truncate">{sender.split('@')[0]}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteSender(sender.split('@')[0])}
                    className="ml-2 bg-gradient-to-r from-error-500 to-error-600 text-white px-3 py-1.5 rounded-lg hover:from-error-600 hover:to-error-700 transition-all duration-300 font-medium text-xs flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Domain Status */}
      {domains.length > 0 && (
        <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-3xl p-8 border border-primary-200/60">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-blue">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Available Domains</h3>
              <p className="text-gray-600">{domains.length} verified domain{domains.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => (
              <div key={domain} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/60 shadow-soft">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-800">{domain}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}