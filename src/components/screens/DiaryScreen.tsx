import { useStore } from '../../lib/store';
import { Calendar, Plus, Trash2, CalendarDays, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { DiaryItem } from '../../types';

export default function DiaryScreen() {
  const { diary = [], saveUserData, activeWorkspaceId, tgBotToken, tgChatId } = useStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [adding, setAdding] = useState(false);
  
  const [newItem, setNewItem] = useState<Partial<DiaryItem>>({
    date: new Date().toISOString().slice(0, 10),
    type: 'hearing',
    title: '',
    description: '',
  });

  const sendTelegramNotif = async (item: DiaryItem) => {
    if (!tgBotToken || !tgChatId) return;
    try {
      const msg = `📅 *New Diary Entry Added*\n\n*Type:* ${item.type}\n*Title:* ${item.title}\n*Date:* ${new Date(item.date).toLocaleDateString('en-IN')}`;
      const url = `https://api.telegram.org/bot${tgBotToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: msg, parse_mode: 'Markdown' })
      });
    } catch(e) {
      console.warn("Failed to send TG notification", e);
    }
  };

  const handleCreate = () => {
    if (!newItem.title || !newItem.date) return;
    const item: DiaryItem = {
      id: Date.now().toString(36),
      date: newItem.date,
      title: newItem.title,
      description: newItem.description || '',
      type: newItem.type as any,
      isCompleted: false,
      workspaceId: activeWorkspaceId || '',
      createdAt: Date.now()
    };
    saveUserData({ diary: [...diary, item] });
    sendTelegramNotif(item);
    setAdding(false);
    setNewItem({ date: new Date().toISOString().slice(0, 10), type: 'hearing', title: '', description: '' });
  };

  const toggleStatus = (id: string) => {
    const arr = [...diary];
    const idx = arr.findIndex(i => i.id === id);
    if(idx > -1) {
      arr[idx].isCompleted = !arr[idx].isCompleted;
      saveUserData({ diary: arr });
    }
  };

  const deleteItem = (id: string) => {
    saveUserData({ diary: diary.filter(i => i.id !== id) });
  };

  const sortedDiary = [...diary]
    .filter(i => filter === 'all' || (filter === 'pending' ? !i.isCompleted : i.isCompleted))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      <header className="mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
          <CalendarDays className="w-8 h-8 text-[#22C55E]" /> Target & Hearing Diary
        </h1>
        <p className="text-black dark:text-white/50 text-sm mt-2">Track hearings, appeals, submissions, and deadlines.</p>
      </header>
      
      <div className="flex justify-between items-end border-b border-black/10 dark:border-white/10 pb-4">
         <div className="flex gap-2 bg-black/5 dark:bg-white/5 p-1 rounded">
           {(['pending', 'done', 'all'] as const).map(f => (
             <button 
               key={f}
               onClick={() => setFilter(f)}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'bg-[#22C55E] text-black shadow-sm' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
             >
               {f}
             </button>
           ))}
         </div>
         <button onClick={() => setAdding(!adding)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Date
         </button>
      </div>

      {adding && (
        <div className="border border-blue-500 p-4 bg-blue-500/10 mb-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500">Add New Calendar Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">Date</label>
              <input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-2 text-xs outline-none focus:border-[#22C55E]" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">Type</label>
              <select value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value as any})} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-xs outline-none focus:border-[#22C55E] uppercase font-bold tracking-widest cursor-pointer">
                <option value="hearing">Hearing Date</option>
                <option value="deadline">Submission/Appeal Deadline</option>
                <option value="meeting">Meeting</option>
                <option value="general">General Follow-up</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">Subject / Title</label>
              <input type="text" placeholder="e.g. GST Appeal Hearing - M/s ABC Ltd" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-2 text-xs outline-none focus:border-[#22C55E]" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setAdding(false)} className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
            <button onClick={handleCreate} disabled={!newItem.title || !newItem.date} className="bg-[#22C55E] hover:bg-[#1fb355] text-black font-bold uppercase tracking-widest text-xs px-4 py-2 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {sortedDiary.length === 0 ? (
        <div className="border-2 border-black/10 dark:border-white/10 p-12 text-center text-black dark:text-white/40 font-mono text-sm uppercase tracking-widest">
           No items found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDiary.map(item => {
            const isLate = !item.isCompleted && new Date(item.date).getTime() < Date.now() - 86400000;
            const isToday = !item.isCompleted && item.date === new Date().toISOString().slice(0, 10);
            return (
              <div key={item.id} className={`group border-2 p-5 bg-black/5 dark:bg-white/5 transition-colors relative flex flex-col ${item.isCompleted ? 'border-[#22C55E]/50 opacity-60' : isLate ? 'border-red-500 shadow-lg shadow-red-500/10' : isToday ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-black/10 dark:border-white/10'}`}>
                {isLate && <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] px-2 py-1 uppercase font-bold tracking-widest">Overdue</span>}
                {isToday && <span className="absolute -top-3 -right-3 bg-amber-500 text-black text-[10px] px-2 py-1 uppercase font-bold tracking-widest">Today</span>}
                <div className="flex justify-between items-start mb-3">
                  <div className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 border ${item.type === 'hearing' ? 'border-blue-500 text-blue-500' : item.type === 'deadline' ? 'border-red-500 text-red-500' : 'border-gray-500 text-gray-500'}`}>
                    {item.type}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.isCompleted} onChange={() => toggleStatus(item.id)} className="w-5 h-5 cursor-pointer accent-[#22C55E]" />
                  </div>
                </div>
                <h3 className={`font-bold text-base mb-1 ${item.isCompleted ? 'line-through text-black/50 dark:text-white/50' : ''}`}>{item.title}</h3>
                
                {(!item.isCompleted && item.type === 'deadline') && (
                   <div className="mt-2 text-xs font-bold font-mono">
                     {(() => {
                        const dl = new Date(item.date).getTime();
                        const now = new Date().getTime();
                        const diff = dl - now;
                        const days = Math.ceil(diff / (1000 * 3600 * 24));
                        if(days > 0) return <span className="text-orange-500 bg-orange-500/10 px-2 py-1 rounded">⏳ Limitation: {days} days left</span>;
                        if(days === 0) return <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded">⚠️ Limitation Expires Today!</span>;
                        return <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded">💀 Barred by Limitation! ({Math.abs(days)} days late)</span>;
                     })()}
                   </div>
                )}
                
                <div className="text-xs text-black/60 dark:text-white/60 font-mono flex items-center gap-2 mt-auto pt-4">
                  <Calendar className="w-4 h-4" /> {new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button onClick={() => deleteItem(item.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline text-[10px] font-bold uppercase tracking-widest">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
