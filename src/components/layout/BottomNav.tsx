import { NavLink } from 'react-router-dom';
import { Home, Edit3, Folder, Inbox, Settings, Layers, Briefcase, CalendarDays, IndianRupee, BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function BottomNav() {
  const navItems = [
    { to: "/home", icon: <Home className="w-5 h-5" />, label: "Dashboard" },
    { to: "/write", icon: <Edit3 className="w-5 h-5" />, label: "Write" },
    { to: "/cases", icon: <Briefcase className="w-5 h-5" />, label: "Cases" },
    { to: "/demand", icon: <IndianRupee className="w-5 h-5" />, label: "Recovery" },
    { to: "/inbox", icon: <Inbox className="w-5 h-5" />, label: "Inbox" }
  ];

  return (
    <nav className="border-t-2 border-black/10 dark:border-white/10 bg-[#f8fafc] dark:bg-[#0A0A0A] flex justify-around p-2 pb-safe">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({isActive}) => cn(
            "flex flex-col items-center gap-1 p-2 w-full text-center transition-colors",
            isActive ? "text-[#22C55E]" : "text-black dark:text-white/40 hover:text-black dark:text-white/80"
          )}
        >
          {item.icon}
          <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
