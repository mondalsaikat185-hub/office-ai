import { useState } from 'react';
import { useStore } from '../../lib/store';
import { IndianRupee, Plus, Trash2, Download } from 'lucide-react';
import { generateDemandRegister } from '../../lib/excelReports';

export default function DemandScreen() {
  const { demands = [], saveUserData, activeWorkspaceId, workspaces } = useStore();
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  const officeName = activeWs?.name || 'COMMISSIONERATE OF CGST & CUSTOMS';
  
  const [newDemand, setNewDemand] = useState({ 
    date: '', partyName: '', oioNo: '', oioDate: '', tax: 0, penalty: 0, interest: 0, recoveredAmount: 0, remarks: '' 
  });

  const addDemand = () => {
    if(newDemand.partyName && (newDemand.tax > 0 || newDemand.penalty > 0)) {
      const amount = (newDemand.tax || 0) + (newDemand.penalty || 0) + (newDemand.interest || 0);
      saveUserData({ demands: [...demands, { ...newDemand, tax: newDemand.tax.toString(), penalty: newDemand.penalty.toString(), interest: newDemand.interest.toString(), party: newDemand.partyName, oio: newDemand.oioNo, recovered: newDemand.recoveredAmount, amount, id: Date.now().toString(), status: 'Pending' }] });
      setNewDemand({ date: '', partyName: '', oioNo: '', oioDate: '', tax: 0, penalty: 0, interest: 0, recoveredAmount: 0, remarks: '' });
    }
  };

  const updateField = (id: string, field: string, value: string | number) => {
    saveUserData({ demands: demands.map((d:any) => {
       if (d.id === id) {
          const updated = { ...d, [field]: value };
          if (field === 'tax' || field === 'penalty' || field === 'interest') {
             updated.amount = (Number(updated.tax) || 0) + (Number(updated.penalty) || 0) + (Number(updated.interest) || 0);
          }
          if (field === 'recoveredAmount' || updated.amount !== undefined) {
             const amt = updated.amount !== undefined ? updated.amount : d.amount;
             const rec = updated.recoveredAmount !== undefined ? updated.recoveredAmount : (d.recoveredAmount || 0);
             updated.status = rec >= amt ? 'Recovered' : (rec > 0 ? 'Partial' : 'Pending');
          }
          return updated;
       }
       return d;
    })});
  };

  const deleteDemand = (id: string) => {
    saveUserData({ demands: demands.filter((d:any) => d.id !== id) });
  };

  const totalDemand = demands.reduce((acc:any, d:any) => acc + (d.amount || 0), 0);
  const totalRecovered = demands.reduce((acc:any, d:any) => acc + (d.recoveredAmount || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <header className="mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4 text-emerald-500">
            <IndianRupee className="w-8 h-8" /> Demand & Recovery
          </h1>
          <p className="text-black dark:text-white/50 text-sm mt-2">OIO demand, arrears, and recovery progress tracking.</p>
        </div>
        <button 
          onClick={() => {
            generateDemandRegister(demands, officeName, new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2 flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="border border-red-500/30 bg-red-500/5 p-6 text-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">Total Demand Arrears</h3>
            <div className="text-3xl font-mono text-red-500">₹{totalDemand.toLocaleString('en-IN')}</div>
         </div>
         <div className="border border-green-500/30 bg-green-500/5 p-6 text-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-2">Total Recovered</h3>
            <div className="text-3xl font-mono text-green-500">₹{totalRecovered.toLocaleString('en-IN')}</div>
         </div>
         <div className="border border-orange-500/30 bg-orange-500/5 p-6 text-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-2">Balance Pending</h3>
            <div className="text-3xl font-mono text-orange-500">₹{(totalDemand - totalRecovered).toLocaleString('en-IN')}</div>
         </div>
      </div>

      <div className="border border-emerald-500/30 bg-emerald-500/5 p-4 mb-8">
         <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4">Add New Demand</h3>
         <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
           <div>
             <label className="text-[9px] uppercase font-bold opacity-60">Party Name</label>
             <input type="text" value={newDemand.partyName} onChange={e => setNewDemand({...newDemand, partyName: e.target.value})} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 text-xs" />
           </div>
           <div>
             <label className="text-[9px] uppercase font-bold opacity-60">OIO No. & Date</label>
             <input type="text" placeholder="OIO No." value={newDemand.oioNo} onChange={e => setNewDemand({...newDemand, oioNo: e.target.value})} className="w-full mb-1 bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 text-xs" />
             <input type="date" value={newDemand.oioDate} onChange={e => setNewDemand({...newDemand, oioDate: e.target.value})} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 text-xs" />
           </div>
           <div>
             <label className="text-[9px] uppercase font-bold opacity-60">Tax / Duty ₹</label>
             <input type="number" value={newDemand.tax || ''} onChange={e => setNewDemand({...newDemand, tax: Number(e.target.value)})} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 text-xs" />
           </div>
           <div>
             <label className="text-[9px] uppercase font-bold opacity-60">Penalty ₹</label>
             <input type="number" value={newDemand.penalty || ''} onChange={e => setNewDemand({...newDemand, penalty: Number(e.target.value)})} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 text-xs" />
           </div>
           <div>
             <label className="text-[9px] uppercase font-bold opacity-60">Interest ₹</label>
             <input type="number" value={newDemand.interest || ''} onChange={e => setNewDemand({...newDemand, interest: Number(e.target.value)})} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 text-xs" />
           </div>
           <button onClick={addDemand} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest text-xs px-4 py-2 mt-2 h-[34px]">Add</button>
         </div>
      </div>

      <div className="overflow-x-auto border border-black/20 dark:border-white/20 bg-white/50 dark:bg-black/50">
        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5">
              <th className="p-2 font-bold uppercase tracking-widest text-[10px]">Party Name</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px]">OIO Details</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px] text-right text-red-600">Tax ₹</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px] text-right text-red-600">Penalty ₹</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px] text-right text-red-600">Interest ₹</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px] text-right">Total ₹</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px] text-right text-green-600">Recovered ₹</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px] text-center">Status</th>
              <th className="p-2 font-bold uppercase tracking-widest text-[10px] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {demands.map(d => (
              <tr key={d.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                <td className="p-2 font-bold">
                   <input type="text" value={d.partyName} onChange={e=>updateField(d.id, 'partyName', e.target.value)} className="bg-transparent border-b border-black/20 outline-none w-32" />
                </td>
                <td className="p-2">
                   <div className="flex flex-col gap-1">
                      <input type="text" value={d.oioNo} onChange={e=>updateField(d.id, 'oioNo', e.target.value)} className="bg-transparent border-b border-black/20 outline-none w-24 text-[10px]" placeholder="OIO No." />
                      <input type="date" value={d.oioDate} onChange={e=>updateField(d.id, 'oioDate', e.target.value)} className="bg-transparent border-b border-black/20 outline-none w-28 text-[10px]" />
                   </div>
                </td>
                <td className="p-2 font-mono text-right text-red-500">
                    <input type="number" value={d.tax || ''} onChange={e=>updateField(d.id, 'tax', e.target.value)} className="bg-transparent border-b border-black/20 outline-none w-20 text-right hide-arrows" />
                </td>
                <td className="p-2 font-mono text-right text-red-500">
                    <input type="number" value={d.penalty || ''} onChange={e=>updateField(d.id, 'penalty', e.target.value)} className="bg-transparent border-b border-black/20 outline-none w-20 text-right hide-arrows" />
                </td>
                <td className="p-2 font-mono text-right text-red-500">
                    <input type="number" value={d.interest || ''} onChange={e=>updateField(d.id, 'interest', e.target.value)} className="bg-transparent border-b border-black/20 outline-none w-20 text-right hide-arrows" />
                </td>
                <td className="p-2 font-mono text-right font-bold w-24">₹{(d.amount || 0).toLocaleString()}</td>
                <td className="p-2 font-mono text-right text-green-500">
                     <input 
                       type="number" 
                       value={d.recoveredAmount || ''} 
                       onChange={e => updateField(d.id, 'recoveredAmount', Number(e.target.value))}
                       className="w-24 bg-transparent border-b border-green-500/50 text-right outline-none focus:border-green-500 hide-arrows font-bold"
                     />
                </td>
                <td className="p-2 text-center">
                  <span className={`px-2 py-1 text-[9px] uppercase font-bold tracking-widest border ${d.status === 'Recovered' ? 'border-green-500 text-green-500 bg-green-500/10' : d.status === 'Partial' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-red-500 text-red-500 bg-red-500/10'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <button onClick={() => deleteDemand(d.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {demands.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-black/40 dark:text-white/40 font-bold uppercase tracking-widest text-xs">No demands found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

