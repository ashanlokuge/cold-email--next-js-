import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Sidebar from '@/components/Sidebar';
import ComposeSection from '@/components/sections/ComposeSection';
import SendersSection from '@/components/sections/SendersSection';
import TemplatesSection from '@/components/sections/TemplatesSection';
import RecipientsSection from '@/components/sections/RecipientsSection';
import AnalyticsSection from '@/components/sections/AnalyticsSection';

export default function Home() {
  const [activeSection, setActiveSection] = useState('compose');
  
  // Shared state for recipients across all components
  const [recipients, setRecipients] = useState([]);
  
  // Shared state for senders across all components
  const [senders, setSenders] = useState<string[]>([]);
  
  // Shared state for templates across all components
  const [templates, setTemplates] = useState([]);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'compose':
        return <ComposeSection 
          recipients={recipients}
          senders={senders}
          templates={templates}
        />;
      case 'analytics':
        return <AnalyticsSection />;
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
      default:
        return <ComposeSection 
          recipients={recipients}
          senders={senders}
          templates={templates}
        />;
    }
  };

  return (
    <Layout>
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