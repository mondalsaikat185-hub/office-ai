import { useState } from 'react';
import { useStore } from '../../lib/store';
import { Briefcase, Plus, Search, CalendarDays } from 'lucide-react';

export default function CaseRegisterScreen() {
    const { activeWorkspaceId } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    
    // Stub static cases since we don't have it in useStore yet (we could add it to useStore later)
    const [cases, setCases] = useState([
        { id: '1', caseNo: 'SCN/123/2026', party: 'M/s XYZ Trading', amount: '₹14,50,000', nextHearing: '2026-06-15', status: 'Pending Adjudication' },
        { id: '2', caseNo: 'App/45/2025', party: 'M/s ABC Corp', amount: '₹5,00,000', nextHearing: '2026-05-20', status: 'Appeal Pending' },
    ]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            <header className="mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4">
               <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4 text-purple-500">
                 <Briefcase className="w-8 h-8" /> Case & Appeal Register
               </h1>
               <p className="text-black dark:text-white/50 text-sm mt-2">Track Show Cause Notices, Adjudications, and Appeals.</p>
            </header>

            <div className="flex gap-4 mb-6">
               <div className="relative flex-1">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50" />
                   <input 
                     type="text" 
                     placeholder="Search by Case No. or Party Name..."
                     className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-xs font-bold uppercase tracking-widest outline-none focus:border-purple-500"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
               </div>
               <button className="bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2 flex items-center gap-2">
                 <Plus className="w-4 h-4"/> Add Case
               </button>
            </div>

            <div className="overflow-x-auto bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4">
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-black/20 dark:border-white/20 text-purple-600">
                            <th className="p-2 font-bold uppercase tracking-widest text-[10px]">Case No.</th>
                            <th className="p-2 font-bold uppercase tracking-widest text-[10px]">Party Name</th>
                            <th className="p-2 font-bold uppercase tracking-widest text-[10px]">Amount Involved</th>
                            <th className="p-2 font-bold uppercase tracking-widest text-[10px]">Next Date</th>
                            <th className="p-2 font-bold uppercase tracking-widest text-[10px]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cases.filter(c => c.party.toLowerCase().includes(searchTerm.toLowerCase()) || c.caseNo.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                            <tr key={c.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="p-2 font-bold">{c.caseNo}</td>
                                <td className="p-2">{c.party}</td>
                                <td className="p-2 font-mono text-xs">{c.amount}</td>
                                <td className="p-2 flex border-none items-center gap-2 text-black/60 dark:text-white/60"><CalendarDays className="w-3 h-3"/> {c.nextHearing}</td>
                                <td className="p-2">
                                    <span className="px-2 py-1 bg-black/5 dark:bg-white/5 rounded border border-black/10 text-[10px] uppercase tracking-widest font-bold">
                                        {c.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
