import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen bg-gradient-to-br from-primary-50 to-accent-50 overflow-hidden">
      <div className="flex h-screen">
        {children}
      </div>
    </div>
  );
}