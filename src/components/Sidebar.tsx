import React, { useState } from 'react';
import { useAuth } from '../lib/auth';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navigation = [
    { id: 'compose', name: 'Run Campaign', icon: 'campaign', description: 'Start new email campaigns' },
    { id: 'analytics', name: 'Campaign Progress', icon: 'chart', description: 'Track your campaigns' },
    { id: 'campaigns', name: 'Campaign History', icon: 'history', description: 'View past campaigns' },
    { id: 'recipients', name: 'Import Recipients', icon: 'users', description: 'Manage your audience' },
    { id: 'senders', name: 'Manage Senders', icon: 'mail', description: 'Configure sender accounts' },
    { id: 'templates', name: 'Email Templates', icon: 'template', description: 'Create stunning emails' },
  ];

  const adminNavigation = [
    { id: 'user-management', name: 'User Management', icon: 'admin', description: 'Manage user accounts' },
  ];

  const getIcon = (iconName: string) => {
    const iconClass = "w-5 h-5";
    switch (iconName) {
      case 'campaign':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'chart':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'history':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'users':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        );
      case 'mail':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'template':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'admin':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return <span className={iconClass}>{iconName}</span>;
    }
  };

  const renderNavSection = (items: typeof navigation, title: string, startIndex = 0) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          {title}
        </h2>
        <div className="w-12 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
      </div>
      
      <nav className="space-y-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`group relative w-full flex items-center px-4 py-4 text-left rounded-2xl transition-all duration-300 ease-out ${
              activeSection === item.id
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25 transform scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-lg hover:shadow-slate-200/50 hover:scale-[1.01]'
            }`}
            style={{
              animationDelay: `${(startIndex + index) * 50}ms`
            }}
          >
            {/* Background glow effect for active item */}
            {activeSection === item.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl blur-xl opacity-20 -z-10"></div>
            )}
            
            {/* Icon container */}
            <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center mr-4 transition-all duration-300 ${
              activeSection === item.id 
                ? 'bg-white/20 shadow-lg' 
                : 'bg-slate-100 group-hover:bg-white group-hover:shadow-md'
            }`}>
              <div className={`transition-all duration-300 ${
                activeSection === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'
              }`}>
                {getIcon(item.icon)}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm transition-all duration-300 ${
                activeSection === item.id ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'
              }`}>
                {item.name}
              </div>
              <div className={`text-xs transition-all duration-300 ${
                activeSection === item.id ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-600'
              }`}>
                {item.description}
              </div>
            </div>
            
            {/* Active indicator */}
            {activeSection === item.id && (
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse"></div>
                <div className="w-1 h-1 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
            
            {/* Hover arrow */}
            {activeSection !== item.id && (
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="w-80 h-screen bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 flex flex-col overflow-hidden backdrop-blur-xl">
      {/* Brand Header */}
      <div className="p-8 flex-shrink-0 border-b border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              ColdSendz
            </h1>
            <p className="text-sm text-slate-500 font-medium">Professional Email Platform</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 px-6 py-8 overflow-y-auto scrollbar-hide">
        {renderNavSection(navigation, 'Dashboard')}
        {isAdmin && renderNavSection(adminNavigation, 'Administration', navigation.length)}
      </div>
    </div>
  );
}