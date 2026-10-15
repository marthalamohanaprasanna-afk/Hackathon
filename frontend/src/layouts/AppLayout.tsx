import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.js';
import { Topbar } from '../components/layout/Topbar.js';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 py-6 bg-gradient-to-b from-navy-950 via-navy-900/50 to-navy-950">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
