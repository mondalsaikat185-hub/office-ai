import { NavLink } from 'react-router-dom';
import { Home, Edit3, Folder, Inbox, Settings, Layers, Briefcase, CalendarDays, IndianRupee, BarChart2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const { user } = useStore();
  
  const navItems = [
    { to: "/home", icon: <Home className="w-5 h-5" />, label: "Dashboard" },
    { to: "/write", icon: <Edit3 className="w-5 h-5" />, label: "Write" },
    { to: "/reports", icon: <BarChart2 className="w-5 h-5" />, label: "Reports" },
    { to: "/files", icon: <Folder className="w-5 h-5" />, label: "Files" },
    { to: "/diary", icon: <CalendarDays className="w-5 h-5" />, label: "Diary" },
    { to: "/cases", icon: <Briefcase className="w-5 h-5" />, label: "Case Register" },
    { to: "/demand", icon: <IndianRupee className="w-5 h-5" />, label: "Recovery" },
    { to: "/inbox", icon: <Inbox className="w-5 h-5" />, label: "Inbox" },
    { to: "/bulk", icon: <Layers className="w-5 h-5" />, label: "Bulk / Merge" },
    { to: "/settings", icon: <Settings className="w-5 h-5" />, label: "Settings" }
  ];

  return (
    <aside className="w-64 border-r-2 border-black/10 dark:border-white/10 h-full flex flex-col bg-[#f8fafc] dark:bg-[#0A0A0A]">
      <div className="p-6 border-b-2 border-black/10 dark:border-white/10">
        <h1 className="text-2xl font-black uppercase tracking-tighter leading-none"><span className="text-[#22C55E]">Office</span><br/>Assistant</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({isActive}) => cn(
              "flex items-center gap-4 px-4 py-3 rounded-none font-bold uppercase tracking-widest text-xs transition-colors",
              isActive ? "bg-[#22C55E] text-black" : "text-black dark:text-white/60 hover:bg-black/5 dark:bg-white/5 hover:text-black dark:text-white"
            )}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t-2 border-black/10 dark:border-white/10 text-xs font-mono text-black dark:text-white/40 break-all">
        <p className="uppercase font-bold tracking-widest text-black dark:text-white/60 mb-1 select-none">Logged In</p>
        {user?.email}
      </div>
    </aside>
  );
}
