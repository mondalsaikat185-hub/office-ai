import { useStore } from '../../lib/store';
import { Bot, FileSignature, Sparkles, Wand2, Inbox, Gavel, Search, Filter, CalendarDays, IndianRupee, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function HomeScreen() {
  const { user, letters, inbox, workspaces, diary = [] } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const name = user?.displayName || user?.email?.split('@')[0] || 'Officer';

  let totalFiles = 0;
  workspaces.forEach(w => w.directories.forEach(d => totalFiles += (d.files?.length || 0)));

  const pendingInbox = inbox.filter(i => i.status !== 'done').length;

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="bg-gradient-to-br from-[#22C55E]/10 to-transparent border-2 border-[#22C55E]/30 p-8">
        <h2 className="text-[#22C55E] font-mono text-sm tracking-widest uppercase mb-2">{greeting()}</h2>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8">{name}</h1>
        
        <div className="grid grid-cols-3 gap-4 border-t-2 border-black/10 dark:border-white/10 pt-8">
          <div>
            <p className="text-4xl font-bold text-[#22C55E]">{letters.length}</p>
            <p className="text-[10px] text-black dark:text-white/50 uppercase font-bold tracking-widest mt-1">Letters</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-black dark:text-white">{totalFiles}</p>
            <p className="text-[10px] text-black dark:text-white/50 uppercase font-bold tracking-widest mt-1">Files</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-amber-500">{pendingInbox}</p>
            <p className="text-[10px] text-black dark:text-white/50 uppercase font-bold tracking-widest mt-1">Inbox</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#22C55E] mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <button onClick={() => navigate('/write?mode=ai')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-[#22C55E] p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <Bot className="w-6 h-6 text-[#22C55E] mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">AI Generate</h4>
          </button>
          
          <button onClick={() => navigate('/write?mode=note')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-amber-500 p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <FileSignature className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">Note Sheet</h4>
          </button>

          <button onClick={() => navigate('/write?mode=order')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-red-500 p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <Gavel className="w-6 h-6 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">Order Letter</h4>
          </button>

          <button onClick={() => navigate('/write?mode=format')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-blue-500 p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <Sparkles className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">Format Only</h4>
          </button>

          <button onClick={() => navigate('/inbox')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-purple-500 p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <Inbox className="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">Inbox</h4>
          </button>

          <button onClick={() => navigate('/diary')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-orange-500 p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <CalendarDays className="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">Diary</h4>
          </button>

          <button onClick={() => navigate('/demand')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-emerald-500 p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <IndianRupee className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">Demand</h4>
          </button>
          
          <button onClick={() => navigate('/reports')} className="text-left border-2 border-black/10 dark:border-white/10 hover:border-sky-500 p-4 transition-all group bg-black/5 dark:bg-white/5 hover:bg-white/10">
            <BarChart2 className="w-6 h-6 text-sky-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold uppercase tracking-wide text-[10px] mb-1">Reports</h4>
          </button>
        </div>
      </section>

      {/* Today's Agenda (Diary) */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-6">Today's Agenda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {diary.filter(d => !d.isCompleted && d.date === new Date().toISOString().slice(0, 10)).map(item => (
            <div key={item.id} onClick={() => navigate('/diary')} className="border border-amber-500/30 bg-amber-500/5 p-4 cursor-pointer hover:border-amber-500 transition-colors">
               <div className="flex justify-between items-start mb-2">
                 <div className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 border ${item.type === 'hearing' ? 'border-blue-500 text-blue-500' : item.type === 'deadline' ? 'border-red-500 text-red-500' : 'border-gray-500 text-gray-500'}`}>
                   {item.type}
                 </div>
               </div>
               <h4 className="font-bold text-sm">{item.title}</h4>
            </div>
          ))}
          {(!diary || diary.filter(d => !d.isCompleted && d.date === new Date().toISOString().slice(0, 10)).length === 0) && (
            <div className="col-span-full border border-black/10 dark:border-white/10 p-6 text-center text-black/50 dark:text-white/50 text-xs font-mono uppercase tracking-widest bg-black/5 dark:bg-white/5">
              No pending items for today.
            </div>
          )}
        </div>
      </section>

      {/* Letter History */}
      <section>
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b-2 border-black/10 dark:border-white/10 pb-4">
           <h3 className="text-sm font-black uppercase tracking-widest text-[#22C55E]">Letter History</h3>
           <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                <input 
                  type="text" 
                  placeholder="Search subject or file..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-[#22C55E]"
                />
              </div>
              <select 
                value={filterMode} 
                onChange={e => setFilterMode(e.target.value)}
                className="bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="ai">AI Gen</option>
                <option value="format">Format</option>
                <option value="note">Note</option>
                <option value="order">Order</option>
              </select>
           </div>
         </div>
         <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
           {letters.length === 0 ? (
             <div className="border-2 border-black/10 dark:border-white/10 p-8 text-center text-black dark:text-white/40 font-mono text-sm uppercase tracking-widest">
               No letters yet
             </div>
           ) : (
             letters
              .filter(l => filterMode === 'all' || l.mode === filterMode)
              .filter(l => !search || l.subject?.toLowerCase().includes(search.toLowerCase()) || l.fileName?.toLowerCase().includes(search.toLowerCase()))
              .map(letter => (
               <div key={letter.id} onClick={() => navigate('/write?editId=' + letter.id)} className="border-2 border-black/10 dark:border-white/10 p-4 hover:border-[#22C55E] cursor-pointer transition-colors bg-black/5 dark:bg-white/5 flex items-center justify-between group">
                 <div>
                   <h4 className="font-bold uppercase tracking-wide text-sm mb-1 group-hover:text-[#22C55E] transition-colors">{letter.subject || '(Untitled)'}</h4>
                   <p className="text-[10px] text-black dark:text-white/50 font-mono">{letter.fileName} • {new Date(letter.createdAt).toLocaleDateString()} • <span className="uppercase text-[#22C55E]/80">{letter.mode}</span></p>
                 </div>
                 {letter.confidentiality !== 'routine' && (
                    <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-1 font-bold uppercase tracking-widest border border-red-500/50">
                      {letter.confidentiality}
                    </span>
                 )}
               </div>
             ))
           )}
           {letters.length > 0 && letters
              .filter(l => filterMode === 'all' || l.mode === filterMode)
              .filter(l => !search || l.subject?.toLowerCase().includes(search.toLowerCase()) || l.fileName?.toLowerCase().includes(search.toLowerCase()))
              .length === 0 && (
                <div className="border border-black/10 dark:border-white/10 p-4 text-center text-black dark:text-white/40 text-xs uppercase tracking-widest">
                  No letters found.
                </div>
           )}
         </div>
      </section>
    </div>
  );
}
