import React, { useState, useRef } from 'react';
import { parseRecipients, dedupeRecipients, isValidEmail } from '@/lib/utils';
import { Recipient } from '@/types';
import toast from 'react-hot-toast';

interface CSVPreview {
  headers: string[];
  data: any[];
  totalRows: number;
  emailColumn?: string;
  nameColumn?: string;
}

interface RecipientsSectionProps {
  recipients: Recipient[];
  setRecipients: (recipients: Recipient[]) => void;
}

export default function RecipientsSection({ recipients, setRecipients }: RecipientsSectionProps) {
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    duplicatesRemoved: 0
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsProcessing(true);
    try {
      await parseCSVFile(file);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Error parsing CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSVFile = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          // Parse headers
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Find email and name columns
          const emailColumn = findEmailColumn(headers);
          const nameColumn = findNameColumn(headers);

          if (!emailColumn) {
            reject(new Error('No email column found. Please ensure your CSV has an "email" column.'));
            return;
          }

          // Parse data rows (first 5 for preview)
          const previewData = lines.slice(1, 6).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });

          setCsvPreview({
            headers,
            data: previewData,
            totalRows: lines.length - 1,
            emailColumn,
            nameColumn
          });
          setShowPreview(true);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  const findEmailColumn = (headers: string[]): string | undefined => {
    const emailPatterns = ['email', 'e_mail', 'emailaddress', 'email_address', 'e-mail'];
    return headers.find(header => 
      emailPatterns.some(pattern => 
        header.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  };

  const findNameColumn = (headers: string[]): string | undefined => {
    const namePatterns = ['name', 'first_name', 'last_name', 'full_name', 'firstname', 'lastname', 'fullname'];
    return headers.find(header => 
      namePatterns.some(pattern => 
        header.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  };

  const importCSVRecipients = async () => {
    if (!csvPreview || !fileInputRef.current?.files?.[0]) return;

    setIsProcessing(true);
    try {
      const file = fileInputRef.current.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const emailColumnIndex = headers.indexOf(csvPreview.emailColumn!);
        const nameColumnIndex = csvPreview.nameColumn ? headers.indexOf(csvPreview.nameColumn) : -1;

        const newRecipients: Recipient[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const email = values[emailColumnIndex]?.toLowerCase();
          const name = nameColumnIndex >= 0 ? values[nameColumnIndex] : email?.split('@')[0];
          
          if (email && isValidEmail(email)) {
            newRecipients.push({ email, name: name || email.split('@')[0] });
          }
        }

        // Combine with existing recipients and remove duplicates
        const allRecipients = [...recipients, ...newRecipients];
        const uniqueRecipients = dedupeRecipients(allRecipients);
        
        setRecipients(uniqueRecipients);
        updateStats(newRecipients, uniqueRecipients.length - recipients.length);
        setShowPreview(false);
        setCsvPreview(null);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast.success(`Imported ${uniqueRecipients.length - recipients.length} new recipients`);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error('Error importing recipients');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStats = (newRecipients: Recipient[], actuallyAdded: number) => {
    const validCount = newRecipients.filter(r => isValidEmail(r.email)).length;
    const duplicatesRemoved = newRecipients.length - actuallyAdded;
    
    setStats({
      total: recipients.length + actuallyAdded,
      valid: recipients.filter(r => isValidEmail(r.email)).length + validCount,
      duplicatesRemoved: stats.duplicatesRemoved + duplicatesRemoved
    });
  };

  const removeRecipient = (index: number) => {
    const newRecipients = recipients.filter((_, i) => i !== index);
    setRecipients(newRecipients);
    setStats({
      ...stats,
      total: newRecipients.length,
      valid: newRecipients.filter(r => isValidEmail(r.email)).length
    });
  };

  const clearAllRecipients = () => {
    if (recipients.length > 0 && confirm('Are you sure you want to clear all recipients?')) {
      setRecipients([]);
      setStats({ total: 0, valid: 0, duplicatesRemoved: 0 });
      toast.success('All recipients cleared');
    }
  };

  const exportRecipientsCSV = () => {
    if (recipients.length === 0) {
      toast.error('No recipients to export');
      return;
    }

    const csvContent = 'email,name\n' + recipients.map(r => `${r.email},${r.name}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recipients.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Recipients exported successfully');
  };

  const cancelImport = () => {
    setShowPreview(false);
    setCsvPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
        handleFileChange({ target: { files: dt.files } } as any);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Import Recipients</h1>
        <p className="text-gray-600">
          Upload CSV files to import and manage recipient email addresses
        </p>
      </div>
      
      <div className="space-y-6">
        {/* CSV Upload Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h2>
          
          <div 
            className="border-2 border-dashed border-primary-300 rounded-3xl p-12 text-center bg-gradient-to-br from-primary-50 to-accent-50 transition-all duration-300 hover:border-primary-400 hover:from-primary-100 hover:to-accent-100"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="text-6xl mb-6">�</div>
            <div className="mb-6">
              <p className="text-xl text-gray-700 mb-3 font-semibold">Drop your CSV file here or click to browse</p>
              <p className="text-sm text-gray-500">Supports CSV files up to 5MB with email addresses</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleFileSelect}
              disabled={isProcessing}
              className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 ${
                isProcessing
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-blue hover:shadow-large'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                'Browse Files'
              )}
            </button>
          </div>

          <div className="mt-8 bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-primary-900 text-lg">CSV Format Requirements</h3>
            </div>
            <ul className="text-sm text-primary-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-0.5">•</span>
                <span><strong>Required:</strong> <code className="bg-primary-200 px-2 py-1 rounded text-primary-900">email</code> column with valid email addresses</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-0.5">•</span>
                <span><strong>Optional:</strong> <code className="bg-primary-200 px-2 py-1 rounded text-primary-900">name</code> column with recipient names</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-0.5">•</span>
                <span><strong>Alternative names:</strong> <code className="bg-primary-200 px-2 py-1 rounded text-primary-900">e_mail</code>, <code className="bg-primary-200 px-2 py-1 rounded text-primary-900">emailaddress</code>, <code className="bg-primary-200 px-2 py-1 rounded text-primary-900">first_name</code>, <code className="bg-primary-200 px-2 py-1 rounded text-primary-900">full_name</code></span>
              </li>
            </ul>
          </div>
        </div>

        {/* CSV Preview Section */}
        {showPreview && csvPreview && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">File Preview</h2>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-md border text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="font-medium text-gray-700">File contains:</span> 
                  <span className="ml-2 text-blue-600 font-semibold">{csvPreview.totalRows} rows</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email column:</span> 
                  <span className="ml-2 text-blue-600 font-semibold">{csvPreview.emailColumn}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Name column:</span> 
                  <span className="ml-2 text-green-600 font-semibold">{csvPreview.nameColumn || 'Not found'}</span>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {csvPreview.headers.map((header, index) => (
                        <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                          {header === csvPreview.emailColumn && <span className="text-blue-600 ml-1">(Email)</span>}
                          {header === csvPreview.nameColumn && <span className="text-green-600 ml-1">(Name)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvPreview.data.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {csvPreview.headers.map((header, colIndex) => (
                          <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={importCSVRecipients}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isProcessing
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isProcessing ? 'Importing...' : 'Import Recipients'}
              </button>
              <button
                onClick={cancelImport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recipients List Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Imported Recipients</h2>
              <p className="text-sm text-gray-600 mt-1">Manage your recipient database</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border">
            <div className="text-center p-4">
              <div className="text-2xl font-semibold text-gray-900 mb-1">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Recipients</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-semibold text-green-600 mb-1">{stats.valid}</div>
              <div className="text-sm text-gray-600">Valid Emails</div>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-semibold text-orange-600 mb-1">{stats.duplicatesRemoved}</div>
              <div className="text-sm text-gray-600">Duplicates Removed</div>
            </div>
          </div>

          {/* Recipients List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {recipients.length === 0 ? (
              <div className="text-center py-12 bg-gray-50">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recipients imported yet</h3>
                <p className="text-gray-500">Upload a CSV file to get started with your recipients!</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recipients.map((recipient, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 font-medium text-sm">
                                {recipient.name?.charAt(0).toUpperCase() || recipient.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {recipient.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{recipient.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => removeRecipient(index)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-1 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={clearAllRecipients}
              disabled={recipients.length === 0}
              className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                recipients.length === 0
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Clear All Recipients
            </button>
            <button
              onClick={exportRecipientsCSV}
              disabled={recipients.length === 0}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                recipients.length === 0
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Export as CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}