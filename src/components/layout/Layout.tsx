import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#0A0A0A] text-slate-900 dark:text-[#F0F0F0] font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
        
        {/* Bottom Nav for Mobile */}
        <div className="md:hidden shrink-0">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
