import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Sidebar from '@/components/Sidebar';
import ComposeSection from '@/components/sections/ComposeSection';
import SendersSection from '@/components/sections/SendersSection';
import TemplatesSection from '@/components/sections/TemplatesSection';
import RecipientsSection from '@/components/sections/RecipientsSection';
import AnalyticsSection from '@/components/sections/AnalyticsSection';
import UserManagementSection from '@/components/sections/UserManagementSection';
import CampaignsHistorySection from '@/components/sections/CampaignsHistorySection';
import { withAuth } from '../lib/auth';
import type { TimezoneConfig } from '@/types';

function Home() {
  const [activeSection, setActiveSection] = useState('compose');

  // Shared state for recipients across all components
  const [recipients, setRecipients] = useState([]);

  // Shared state for senders across all components
  const [senders, setSenders] = useState<string[]>([]);

  // Shared state for templates across all components
  const [templates, setTemplates] = useState([]);

  // Persistent campaign form state with localStorage
  const [campaignFormData, setCampaignFormData] = useState<{
    campaignName: string;
    subject: string;
    body: string;
    selectedSenders: string[];
    timezoneConfig?: TimezoneConfig | null;
  }>({
    campaignName: '',
    subject: '',
    body: '',
    selectedSenders: [],
    timezoneConfig: null
  });

  // Load form data from localStorage on component mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('campaignFormData');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setCampaignFormData(parsedData);
      } catch (error) {
        console.log('Error loading saved form data:', error);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('campaignFormData', JSON.stringify(campaignFormData));
  }, [campaignFormData]);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'compose':
        return <ComposeSection
          recipients={recipients}
          senders={senders}
          templates={templates}
          campaignFormData={campaignFormData}
          setCampaignFormData={setCampaignFormData}
        />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'campaigns':
        return <CampaignsHistorySection />;
      case 'recipients':
        return <RecipientsSection
          recipients={recipients}
          setRecipients={setRecipients}
        />;
      case 'senders':
        return <SendersSection
          senders={senders}
          setSenders={setSenders}
        />;
      case 'templates':
        return <TemplatesSection
          templates={templates}
          setTemplates={setTemplates}
        />;
      case 'user-management':
        return <UserManagementSection />;
      default:
        return <ComposeSection
          recipients={recipients}
          senders={senders}
          templates={templates}
          campaignFormData={campaignFormData}
          setCampaignFormData={setCampaignFormData}
        />;
    }
  };

  return (
    <Layout>
      <Head>
        <title> Cold Email App | coldsendz</title>
        <meta name="description" content="Compose, send, and track cold email campaigns" />
      </Head>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <main className="flex-1 h-screen overflow-y-auto animate-fade-in">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveSection()}
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default withAuth(Home);