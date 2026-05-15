import { useStore } from '../../lib/store';
import { Building2, FolderOpen, FileText, Signature, ChevronDown, Cpu, Plus, PenTool, Moon, Sun } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function Header() {
  const { 
    workspaces, 
    activeWorkspaceId, 
    activeDirectoryId, 
    activeFileId,
    activeSignatureId,
    apiKeys,
    selectedModel,
    saveUserData,
    theme,
    setTheme
  } = useStore();

  const [openDropdown, setOpenDropdown] = useState<'workspace' | 'dir' | 'file' | 'sig' | 'ai' | null>(null);

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    type: 'prompt' | 'prompt-2' | 'prompt-3';
    value: string;
    value2: string;
    value3: string;
    label1: string;
    label2: string;
    label3: string;
    onConfirm: (v1: string, v2: string, v3: string) => void;
  }>({ isOpen: false, title: '', type: 'prompt', value: '', value2: '', value3: '', label1: '', label2: '', label3: '', onConfirm: () => {} });

  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

  const openPrompt = (title: string, value: string, onConfirm: (val: string) => void) => {
    setDialog({ isOpen: true, title, type: 'prompt', value, value2: '', value3: '', label1: '', label2: '', label3: '', onConfirm: (v1) => onConfirm(v1) });
  };
  const openPrompt2 = (title: string, label1: string, label2: string, value: string, value2: string, onConfirm: (v1: string, v2: string) => void) => {
    setDialog({ isOpen: true, title, type: 'prompt-2', label1, label2, value, value2, value3: '', label3: '', onConfirm: (v1, v2) => onConfirm(v1, v2) });
  };
  const openPrompt3 = (title: string, label1: string, label2: string, label3: string, value: string, value2: string, value3: string, onConfirm: (v1: string, v2: string, v3: string) => void) => {
    setDialog({ isOpen: true, title, type: 'prompt-3', label1, label2, label3, value, value2, value3, onConfirm });
  };

  const ws = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const dir = ws?.directories.find(d => d.id === activeDirectoryId) || ws?.directories[0];
  const file = dir?.files?.find(f => f.id === activeFileId) || dir?.files?.[0];
  const sig = ws?.signatures.find(s => s.id === activeSignatureId) || ws?.signatures[0];

  const models = [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B (Light)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
  ];

  // Make sure we have active items if none selected but available
  useEffect(() => {
    if (ws && (!activeWorkspaceId || !activeDirectoryId || !activeSignatureId)) {
      saveUserData({
        activeWorkspaceId: ws.id,
        activeDirectoryId: dir?.id,
        activeFileId: file?.id,
        activeSignatureId: sig?.id
      });
    }
  }, [workspaces]);

  const switchWorkspace = (id: string) => {
    const newWs = workspaces.find(w => w.id === id);
    if (newWs) {
      saveUserData({
        activeWorkspaceId: newWs.id,
        activeDirectoryId: newWs.directories[0]?.id,
        activeFileId: newWs.directories[0]?.files[0]?.id,
        activeSignatureId: newWs.signatures[0]?.id
      });
      setOpenDropdown(null);
    }
  };

  const switchDir = (id: string) => {
    const newDir = ws?.directories.find(d => d.id === id);
    saveUserData({ 
      activeDirectoryId: id,
      activeFileId: newDir?.files[0]?.id
    });
    setOpenDropdown(null);
  };

  const switchFile = (id: string) => {
    saveUserData({ activeFileId: id });
    setOpenDropdown(null);
  };

  const switchSig = (id: string) => {
    saveUserData({ activeSignatureId: id });
    setOpenDropdown(null);
  };

  const handleEditWorkspace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ws) return;
    openPrompt('Edit Workspace Name', ws.name, (name) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const idx = wsList.findIndex(w => w.id === ws.id);
      if (idx !== -1) {
        wsList[idx].name = name;
        saveUserData({ workspaces: wsList });
      }
    });
  };

  const handleAddWorkspace = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPrompt('New Workspace Name', '', (name) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const newWs = {
        id: Date.now().toString(),
        name,
        office_en: '', office_hi: '', address: '', phone: '', email: '', logo: '', createdAt: Date.now(),
        directories: [],
        signatures: []
      };
      wsList.push(newWs);
      saveUserData({ workspaces: wsList, activeWorkspaceId: newWs.id });
    });
  };

  const handleEditDir = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ws || !dir) return;
    openPrompt('Edit Folder Name', dir.name, (name) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wIdx = wsList.findIndex(w => w.id === ws.id);
      const dIdx = wsList[wIdx].directories.findIndex(d => d.id === dir.id);
      if (wIdx !== -1 && dIdx !== -1) {
        wsList[wIdx].directories[dIdx].name = name;
        saveUserData({ workspaces: wsList });
      }
    });
  };

  const handleAddDir = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ws) return;
    openPrompt('New Folder Name', '', (name) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wIdx = wsList.findIndex(w => w.id === ws.id);
      if (wIdx !== -1) {
        const newDir = { id: Date.now().toString(), name, filePrefix: name.substring(0, 3).toUpperCase(), files: [] };
        wsList[wIdx].directories.push(newDir);
        saveUserData({ workspaces: wsList, activeDirectoryId: newDir.id });
      }
    });
  };

  const handleEditFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ws || !dir || !file) return;
    openPrompt2('Edit File', 'Subject / Name', 'File No', file.name, file.fileNumber || '', (name, fileNumber) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wIdx = wsList.findIndex(w => w.id === ws.id);
      const dIdx = wsList[wIdx].directories.findIndex(d => d.id === dir.id);
      const fIdx = wsList[wIdx].directories[dIdx].files.findIndex(f => f.id === file.id);
      if (wIdx !== -1 && dIdx !== -1 && fIdx !== -1) {
        wsList[wIdx].directories[dIdx].files[fIdx] = { ...file, name, fileNumber };
        saveUserData({ workspaces: wsList });
      }
    });
  };

  const handleAddFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ws || !dir) return;
    openPrompt2('New File', 'Subject / Name', 'File No', '', '', (name, fileNumber) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wIdx = wsList.findIndex(w => w.id === ws.id);
      const dIdx = wsList[wIdx].directories.findIndex(d => d.id === dir.id);
      if (wIdx !== -1 && dIdx !== -1) {
        const newFile = { id: Date.now().toString(), name, fileNumber, createdAt: Date.now() };
        wsList[wIdx].directories[dIdx].files.push(newFile);
        saveUserData({ workspaces: wsList, activeFileId: newFile.id });
      }
    });
  };

  const handleEditSig = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ws || !sig) return;
    openPrompt3('Edit Signature', 'Name', 'Designation', 'Section (Optional)', sig.name, sig.designation, sig.section || '', (name, designation, section) => {
      if (!name || !designation) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wIdx = wsList.findIndex(w => w.id === ws.id);
      const sIdx = wsList[wIdx].signatures.findIndex(s => s.id === sig.id);
      if (wIdx !== -1 && sIdx !== -1) {
        wsList[wIdx].signatures[sIdx] = { ...sig, name, designation, section, active: sig.active || false };
        saveUserData({ workspaces: wsList });
      }
    });
  };

  const handleAddSig = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ws) return;
    openPrompt3('New Signature', 'Name', 'Designation', 'Section (Optional)', '', '', '', (name, designation, section) => {
      if (!name || !designation) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wIdx = wsList.findIndex(w => w.id === ws.id);
      if (wIdx !== -1) {
        const newSig = { id: Date.now().toString(), name, designation, section, active: true };
        wsList[wIdx].signatures.push(newSig);
        saveUserData({ workspaces: wsList, activeSignatureId: newSig.id });
      }
    });
  };

  return (
    <header className="border-b-2 border-black/10 dark:border-white/10 bg-[#f8fafc] dark:bg-[#0A0A0A] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 relative" style={{ zIndex: 9999 }}>
      <div className="flex flex-wrap gap-2 md:gap-4 items-center w-full">
        {/* Workspace Chip */}
        <div className="relative flex items-center">
          <div 
            onClick={() => setOpenDropdown(openDropdown === 'workspace' ? null : 'workspace')}
            className="flex items-center gap-2 border border-[#22C55E]/30 bg-[#22C55E]/5 px-3 py-1.5 rounded-none cursor-pointer hover:border-[#22C55E] transition-colors h-8"
          >
            <Building2 className="w-3.5 h-3.5 text-[#22C55E]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white max-w-[100px] truncate">
              {ws ? ws.name : 'No Workspace'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#22C55E]" />
          </div>
          {ws && (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleEditWorkspace} title="Edit Workspace" className="text-[#22C55E]/60 hover:text-[#22C55E] p-1"><PenTool className="w-3.5 h-3.5" /></button>
              <button onClick={handleAddWorkspace} title="New Workspace" className="text-[#22C55E]/60 hover:text-[#22C55E] p-1"><Plus className="w-4 h-4" /></button>
            </div>
          )}
          {!ws && (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleAddWorkspace} title="New Workspace" className="text-[#22C55E]/60 hover:text-[#22C55E] p-1"><Plus className="w-4 h-4" /></button>
            </div>
          )}
          {openDropdown === 'workspace' && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-black border-2 border-[#22C55E] w-48 shadow-lg shadow-[#22C55E]/20 max-h-64 overflow-y-auto" style={{ zIndex: 10000 }}>
              {workspaces.map(w => (
                <div 
                  key={w.id} 
                  onClick={() => switchWorkspace(w.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#22C55E]/20 ${w.id === activeWorkspaceId ? 'text-[#22C55E]' : 'text-black dark:text-white/60'}`}
                >
                  {w.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Directory Chip */}
        <div className="relative flex items-center">
          <div 
            onClick={() => setOpenDropdown(openDropdown === 'dir' ? null : 'dir')}
            className="flex items-center gap-2 border border-blue-500/30 bg-blue-500/5 px-3 py-1.5 rounded-none cursor-pointer hover:border-blue-500 transition-colors h-8"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white max-w-[120px] truncate">
              {dir ? dir.name : '—'}
            </span>
            <ChevronDown className="w-3 h-3 text-blue-400" />
          </div>
          {dir ? (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleEditDir} title="Edit Folder" className="text-blue-400/60 hover:text-blue-400 p-1"><PenTool className="w-3.5 h-3.5" /></button>
              <button onClick={handleAddDir} title="New Folder" className="text-blue-400/60 hover:text-blue-400 p-1"><Plus className="w-4 h-4" /></button>
            </div>
          ) : ws ? (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleAddDir} title="New Folder" className="text-blue-400/60 hover:text-blue-400 p-1"><Plus className="w-4 h-4" /></button>
            </div>
          ) : null}
          {openDropdown === 'dir' && ws && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-black border-2 border-blue-500 w-48 shadow-lg shadow-blue-500/20 max-h-64 overflow-y-auto" style={{ zIndex: 10000 }}>
              {ws.directories.map(d => {
                const parentDir = ws.directories.find(p => p.id === d.parentId);
                const displayName = parentDir ? `${parentDir.name} / ${d.name}` : d.name;
                return (
                  <div 
                    key={d.id} 
                    onClick={() => switchDir(d.id)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-blue-500/20 ${d.id === activeDirectoryId ? 'text-blue-400' : 'text-black dark:text-white/60'}`}
                  >
                    {displayName}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* File Chip */}
        <div className="relative flex items-center">
          <div 
            onClick={() => setOpenDropdown(openDropdown === 'file' ? null : 'file')}
            className="flex items-center gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 rounded-none cursor-pointer hover:border-amber-500 transition-colors h-8"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white max-w-[120px] truncate">
              {file ? file.name : '—'}
            </span>
            <ChevronDown className="w-3 h-3 text-amber-400" />
          </div>
          {file ? (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleEditFile} title="Edit File" className="text-amber-500/60 hover:text-amber-500 p-1"><PenTool className="w-3.5 h-3.5" /></button>
              <button onClick={handleAddFile} title="New File" className="text-amber-500/60 hover:text-amber-500 p-1"><Plus className="w-4 h-4" /></button>
            </div>
          ) : dir ? (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleAddFile} title="New File" className="text-amber-500/60 hover:text-amber-500 p-1"><Plus className="w-4 h-4" /></button>
            </div>
          ) : null}
          {openDropdown === 'file' && dir && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-black border-2 border-amber-500 w-48 shadow-lg shadow-amber-500/20 max-h-64 overflow-y-auto" style={{ zIndex: 10000 }}>
              {dir.files.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => switchFile(f.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-amber-500/20 ${f.id === activeFileId ? 'text-amber-400' : 'text-black dark:text-white/60'}`}
                >
                  {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Signature Chip */}
        <div className="relative ml-auto sm:ml-0 flex items-center">
          <div 
            onClick={() => setOpenDropdown(openDropdown === 'sig' ? null : 'sig')}
            className="flex items-center gap-2 border border-purple-500/30 bg-purple-500/5 px-3 py-1.5 rounded-none cursor-pointer hover:border-purple-500 transition-colors h-8"
          >
            <Signature className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white max-w-[120px] truncate">
              {sig ? `${sig.designation.split(/[(\/]/)[0].trim()} - ${sig.name.split(' ').slice(-1)[0]}` : '—'}
            </span>
            <ChevronDown className="w-3 h-3 text-purple-400" />
          </div>
          {sig ? (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleEditSig} title="Edit Signature" className="text-purple-400/60 hover:text-purple-400 p-1"><PenTool className="w-3.5 h-3.5" /></button>
              <button onClick={handleAddSig} title="New Signature" className="text-purple-400/60 hover:text-purple-400 p-1"><Plus className="w-4 h-4" /></button>
            </div>
          ) : ws ? (
            <div className="flex items-center gap-1 ml-1 h-8 px-1">
              <button onClick={handleAddSig} title="New Signature" className="text-purple-400/60 hover:text-purple-400 p-1"><Plus className="w-4 h-4" /></button>
            </div>
          ) : null}
          {openDropdown === 'sig' && ws && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-black border-2 border-purple-500 w-48 shadow-lg shadow-purple-500/20 max-h-64 overflow-y-auto" style={{ zIndex: 10000 }}>
              {ws.signatures.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => switchSig(s.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 ${s.id === activeSignatureId ? 'text-purple-400' : 'text-black dark:text-white/60'}`}
                >
                  {s.name} ({s.designation})
                </div>
              ))}
            </div>
          )}
        </div>
        {/* AI Model Chip & Theme Toggle */}
        <div className="relative ml-auto sm:ml-0 flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center p-1.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors h-8"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          </button>
          <div className="relative">
            <div 
              onClick={() => setOpenDropdown(openDropdown === 'ai' ? null : 'ai')}
              className="flex items-center gap-2 border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 rounded-none cursor-pointer hover:border-rose-500 transition-colors h-8"
            >
            <Cpu className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white max-w-[120px] truncate">
              {models.find(m => m.id === selectedModel)?.name.split(' ')[2] || models.find(m => m.id === 'gemini-2.0-flash')?.name.split(' ')[2] || 'AI'}
            </span>
            <ChevronDown className="w-3 h-3 text-rose-400" />
          </div>
          {openDropdown === 'ai' && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-black border-2 border-rose-500 w-64 shadow-lg shadow-rose-500/20 p-2" style={{ zIndex: 10000 }}>
              <div className="mb-2 border-b border-rose-500/20 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Model Selection</p>
                {models.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => { saveUserData({ selectedModel: m.id }); setOpenDropdown(null); }}
                    className={`px-3 py-2 text-xs font-bold tracking-wider cursor-pointer hover:bg-rose-500/20 ${m.id === selectedModel ? 'text-rose-400' : 'text-black dark:text-white/60'}`}
                  >
                    {m.name}
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">Active Keys</p>
                {apiKeys.map(k => (
                  <div key={k.key} className="px-3 py-1 text-xs text-black/80 dark:text-white/80 border-b border-black/10 dark:border-white/10 last:border-0 flex justify-between">
                    <span>{k.label}</span>
                    <button onClick={(e) => { e.stopPropagation(); saveUserData({ apiKeys: apiKeys.filter(ak => ak.key !== k.key) }); }} className="text-red-500 hover:text-red-400">Del</button>
                  </div>
                ))}
                {apiKeys.length === 0 && <p className="px-3 py-1 text-[10px] text-rose-400">No keys added. Go to settings.</p>}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      
      {openDropdown && (
        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpenDropdown(null)}></div>
      )}

      {/* Header Dialog */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
          <div className="bg-white dark:bg-neutral-900 border-2 border-black/20 dark:border-white/20 p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#22C55E] mb-4">{dialog.title}</h2>
            
            <div className="space-y-4 mb-6">
               <div>
                 {dialog.label1 && <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">{dialog.label1}</label>}
                 <input 
                   autoFocus
                   className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-3 text-sm focus:border-[#22C55E] outline-none" 
                   value={dialog.value} 
                   onChange={e => setDialog(d => ({...d, value: e.target.value}))} 
                   onKeyDown={e => { if (e.key === 'Enter' && dialog.type === 'prompt') { dialog.onConfirm(dialog.value, '', ''); closeDialog(); } }}
                 />
               </div>
               {(dialog.type === 'prompt-2' || dialog.type === 'prompt-3') && (
                 <div>
                   {dialog.label2 && <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">{dialog.label2}</label>}
                   {dialog.type === 'prompt-3' ? (
                     <textarea 
                       className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-3 text-sm focus:border-[#22C55E] outline-none min-h-[80px] resize-y" 
                       value={dialog.value2} 
                       onChange={e => setDialog(d => ({...d, value2: e.target.value}))} 
                       onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { dialog.onConfirm(dialog.value, dialog.value2, dialog.value3); closeDialog(); } }}
                     />
                   ) : (
                     <input 
                       className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-3 text-sm focus:border-[#22C55E] outline-none" 
                       value={dialog.value2} 
                       onChange={e => setDialog(d => ({...d, value2: e.target.value}))} 
                       onKeyDown={e => { if (e.key === 'Enter' && dialog.type === 'prompt-2') { dialog.onConfirm(dialog.value, dialog.value2, ''); closeDialog(); } }}
                     />
                   )}
                 </div>
               )}
               {dialog.type === 'prompt-3' && (
                 <div>
                   {dialog.label3 && <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">{dialog.label3}</label>}
                   <textarea 
                     className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-3 text-sm focus:border-[#22C55E] outline-none min-h-[80px] resize-y" 
                     value={dialog.value3} 
                     onChange={e => setDialog(d => ({...d, value3: e.target.value}))} 
                     onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { dialog.onConfirm(dialog.value, dialog.value2, dialog.value3); closeDialog(); } }}
                   />
                 </div>
               )}
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={closeDialog} className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
              <button 
                onClick={() => { dialog.onConfirm(dialog.value, dialog.value2, dialog.value3); closeDialog(); }}
                className="bg-[#22C55E] hover:bg-[#1fb355] text-black px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

