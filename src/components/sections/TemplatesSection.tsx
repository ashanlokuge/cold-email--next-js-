import React, { useState } from 'react';
import { expandSpintax, personalizeContent } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  createdAt: string;
}

const sampleTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Cold Outreach - SaaS',
    subject: 'Quick question about {company|your business|your organization}',
    body: `Hi {{name}},

I noticed that {you work at|you're with} {{company}} and thought you might be interested in {our new solution|what we're building}.

{We help companies like yours|Many businesses similar to yours use our platform to} {streamline their workflow|automate their processes|save time and money}.

Would you be {interested in|open to} a {quick 15-minute call|brief conversation} to see if this could be valuable for {{company}}?

Best regards,
{{senderName}}`,
    category: 'Sales',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Follow-up Email',
    subject: 'Following up on {our conversation|my previous email}',
    body: `Hi {{name}},

I wanted to follow up on {my previous email|our conversation} from {last week|a few days ago}.

{I understand you're probably busy|I know things can get hectic}, but I {believe|think} this could be {really valuable|quite beneficial} for {{company}}.

{Would you have|Do you have} {5 minutes|a few minutes} for a quick call this week?

Thanks,
{{senderName}}`,
    category: 'Follow-up',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Partnership Proposal',
    subject: 'Partnership opportunity with {{company}}',
    body: `Hello {{name}},

I'm reaching out because I {believe|think} there could be a {great|valuable} partnership opportunity between our companies.

We work with {businesses like yours|companies in your industry} to {provide|deliver} {better solutions|enhanced services} to their customers.

{Would you be interested in|Are you open to} exploring how we might {work together|collaborate}?

Best regards,
{{senderName}}`,
    category: 'Partnership',
    createdAt: new Date().toISOString()
  }
];

interface TemplatesSectionProps {
  templates: EmailTemplate[];
  setTemplates: (templates: EmailTemplate[]) => void;
}

export default function TemplatesSection({ templates, setTemplates }: TemplatesSectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  // Form states
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Sales');

  // Initialize templates if empty
  React.useEffect(() => {
    if (templates.length === 0) {
      setTemplates(sampleTemplates);
    }
  }, [templates, setTemplates]);
  
  // Preview states
  const [previewRecipient, setPreviewRecipient] = useState({
    email: 'john.doe@example.com',
    name: 'John Doe'
  });

  const categories = ['Sales', 'Follow-up', 'Partnership', 'Marketing', 'Support', 'Other'];

  const startCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateBody('');
    setTemplateCategory('Sales');
  };

  const startEdit = (template: EmailTemplate) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateBody(template.body);
    setTemplateCategory(template.category);
  };

  const saveTemplate = () => {
    if (!templateName.trim() || !templateSubject.trim() || !templateBody.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const templateData: EmailTemplate = {
      id: selectedTemplate?.id || Date.now().toString(),
      name: templateName.trim(),
      subject: templateSubject.trim(),
      body: templateBody.trim(),
      category: templateCategory,
      createdAt: selectedTemplate?.createdAt || new Date().toISOString()
    };

    if (isEditing && selectedTemplate) {
      setTemplates(templates.map(t => t.id === selectedTemplate.id ? templateData : t));
      toast.success('Template updated successfully');
    } else {
      setTemplates([...templates, templateData]);
      toast.success('Template created successfully');
    }

    cancelEdit();
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedTemplate(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateBody('');
    setTemplateCategory('Sales');
  };

  const deleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        cancelEdit();
      }
      toast.success('Template deleted successfully');
    }
  };

  const copyTemplate = (template: EmailTemplate) => {
    // In a real app, this would populate the main compose form
    toast.success(`Template "${template.name}" copied to compose section`);
  };

  const getPreviewContent = () => {
    const subject = personalizeContent(templateSubject, previewRecipient, 0, 'sales@company.com');
    const body = personalizeContent(templateBody, previewRecipient, 0, 'sales@company.com');
    return { subject, body };
  };

  const renderTemplateList = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Email Templates</h2>
          <p className="text-gray-600">{templates.length} template{templates.length !== 1 ? 's' : ''} available</p>
        </div>
        <button
          onClick={startCreate}
          className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-blue hover:shadow-large font-semibold flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200/60 p-6 hover:shadow-medium transition-all duration-300 group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-1">{template.name}</h3>
                <span className="px-3 py-1 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
                  {template.category}
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 font-medium mb-2">Subject:</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 line-clamp-2">
                {template.subject}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => copyTemplate(template)}
                className="flex-1 bg-gradient-to-r from-success-500 to-success-600 text-white px-3 py-2 rounded-xl hover:from-success-600 hover:to-success-700 transition-all duration-300 font-medium text-sm"
              >
                Use
              </button>
              <button
                onClick={() => startEdit(template)}
                className="flex-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white px-3 py-2 rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all duration-300 font-medium text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => deleteTemplate(template.id)}
                className="flex-1 bg-gradient-to-r from-error-500 to-error-600 text-white px-3 py-2 rounded-xl hover:from-error-600 hover:to-error-700 transition-all duration-300 font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTemplateEditor = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Edit Template' : 'Create New Template'}
          </h2>
          <p className="text-gray-600">
            {isEditing ? 'Update your email template' : 'Design your new email template'}
          </p>
        </div>
        <button
          onClick={cancelEdit}
          className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-2xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold"
        >
          Back to Templates
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 overflow-hidden">
            <div className="flex border-b border-gray-200/60">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'editor'
                    ? 'bg-white text-primary-600 border-b-2 border-primary-600'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'preview'
                    ? 'bg-white text-primary-600 border-b-2 border-primary-600'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Preview
              </button>
            </div>

            <div className="p-8">
              {activeTab === 'editor' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter template name"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Category
                      </label>
                      <select
                        value={templateCategory}
                        onChange={(e) => setTemplateCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={templateSubject}
                      onChange={(e) => setTemplateSubject(e.target.value)}
                      placeholder="Enter subject line with variables and spintax"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm"
                    />
                    <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
                      <p className="text-xs text-primary-700 font-medium">
                        Tip: Use variables: {'{{name}}'}, {'{{email}}'}, {'{{company}}'} and spintax: {'{option1|option2}'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Email Body
                    </label>
                    <textarea
                      value={templateBody}
                      onChange={(e) => setTemplateBody(e.target.value)}
                      rows={12}
                      placeholder="Enter email body with variables and spintax..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm resize-none"
                    />
                    <div className="bg-accent-50 border border-accent-200 rounded-xl p-3">
                      <p className="text-xs text-accent-700 font-medium">
                        Support for spintax variations and personalization variables
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
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
                    />
                  </div>
                  
                  <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden shadow-soft">
                    <div className="bg-gradient-to-r from-primary-50 to-accent-50 px-6 py-4 border-b border-gray-200/60">
                      <div className="font-bold text-gray-900 text-lg">
                        {getPreviewContent().subject || 'Subject Line'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        To: {previewRecipient.name} &lt;{previewRecipient.email}&gt;
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {getPreviewContent().body || 'Email body will appear here...'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={saveTemplate}
              disabled={!templateName.trim() || !templateSubject.trim() || !templateBody.trim()}
              className={`flex-1 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 ${
                !templateName.trim() || !templateSubject.trim() || !templateBody.trim()
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-blue hover:shadow-large'
              }`}
            >
              {isEditing ? 'Update Template' : 'Save Template'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-6 py-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-2xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-3xl p-6 shadow-soft">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-bold text-primary-900 text-lg">Template Tips</h3>
            </div>
            <ul className="text-sm text-primary-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-0.5">•</span>
                <span><strong>Variables:</strong> Use {'{{name}}'}, {'{{email}}'}, {'{{company}}'} for personalization</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-0.5">•</span>
                <span><strong>Spintax:</strong> Use {'{option1|option2|option3}'} for content variation</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-0.5">•</span>
                <span><strong>Sender:</strong> Use {'{{senderName}}'} for dynamic sender names</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-0.5">•</span>
                <span><strong>Testing:</strong> Always preview your templates before using</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-success-50 to-success-100 border border-success-200 rounded-3xl p-6 shadow-soft">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-success-900 text-lg">Best Practices</h3>
            </div>
            <ul className="text-sm text-success-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-success-600 mt-0.5">•</span>
                <span>Keep subject lines under 50 characters</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-success-600 mt-0.5">•</span>
                <span>Use spintax to avoid spam detection</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-success-600 mt-0.5">•</span>
                <span>Personalize with recipient names and companies</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-success-600 mt-0.5">•</span>
                <span>Include clear call-to-action</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-success-600 mt-0.5">•</span>
                <span>Test templates with different recipients</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-4">
          Email Templates
        </h1>
        <p className="text-lg text-gray-600">
          Create and manage reusable email templates with variables and spintax
        </p>
      </div>
      
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-soft border border-gray-200/60 p-8">
        {(isCreating || isEditing) ? renderTemplateEditor() : renderTemplateList()}
      </div>
    </div>
  );
}