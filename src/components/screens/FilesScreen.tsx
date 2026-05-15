import { useStore } from '../../lib/store';
import { Folder, FileText, ChevronRight, Edit2, Plus, CornerDownRight, Trash2, Search, ArrowRightLeft, Copy, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FilesScreen() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, saveUserData, deleteFileCascade, deleteDirCascade, letters, deleteLetter } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();
  
  // Drill-down state
  const [currentDirId, setCurrentDirId] = useState<string | null>(null);

  // Letter history modal state
  const [selectedFile, setSelectedFile] = useState<{
    wsId: string; dirId: string; fileId: string; fileName: string; fileNumber: string;
  } | null>(null);
  const [previewLetter, setPreviewLetter] = useState<any | null>(null);
  const [letterTab, setLetterTab] = useState<'all' | 'ai' | 'format' | 'note' | 'order'>('all');

  const handleFileClick = (wsId: string, dirId: string, fileId: string, fileName: string, fileNumber: string) => {
    setActiveWorkspace(wsId);
    saveUserData({ activeDirectoryId: dirId, activeFileId: fileId });
    setSelectedFile({ wsId, dirId, fileId, fileName, fileNumber });
  };
  
  // Helpers to find active workspace and dir
  const currentWs = workspaces.find(w => w.directories.some(d => d.id === currentDirId)) || workspaces[0];
  const currentDir = currentWs?.directories.find(d => d.id === currentDirId);
  
  const getBreadcrumbs = () => {
    if (!currentDirId || !currentWs) return [];
    const crumbs = [];
    let curr = currentWs.directories.find(d => d.id === currentDirId);
    while (curr) {
      crumbs.unshift(curr);
      curr = currentWs.directories.find(d => d.id === curr?.parentId);
    }
    return crumbs;
  };

  const [editingDir, setEditingDir] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    type: 'prompt' | 'confirm' | 'prompt-2';
    value: string;
    value2: string;
    label1: string;
    label2: string;
    message: string;
    onConfirm: (v1: string, v2: string) => void;
  }>({ isOpen: false, title: '', type: 'prompt', value: '', value2: '', label1: '', label2: '', message: '', onConfirm: () => {} });

  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

  const openPrompt = (title: string, value: string, onConfirm: (val: string) => void) => {
    setDialog({ isOpen: true, title, type: 'prompt', value, value2: '', label1: '', label2: '', message: '', onConfirm: (v1) => onConfirm(v1) });
  };
  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, title, type: 'confirm', message, value: '', value2: '', label1: '', label2: '', onConfirm: () => onConfirm() });
  };
  const openPrompt2 = (title: string, label1: string, label2: string, value: string, value2: string, onConfirm: (v1: string, v2: string) => void) => {
    setDialog({ isOpen: true, title, type: 'prompt-2', label1, label2, value, value2, message: '', onConfirm });
  };

  const addDir = (wsId: string, parentId?: string) => {
    openPrompt('Create Directory', '', (name) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wsIdx = wsList.findIndex(w => w.id === wsId);
      if (wsIdx >= 0) {
        wsList[wsIdx].directories.push({
          id: Date.now().toString(),
          name,
          parentId,
          filePrefix: name.substring(0, 3).toUpperCase(),
          files: []
        });
        saveUserData({ workspaces: wsList });
      }
    });
  };

  const addFile = (wsId: string, dirId: string) => {
    openPrompt2('Create File', 'Subject / Name of File', 'Official File Number', '', '', (name, fileNumber) => {
      if (!name) return;
      const wsList = JSON.parse(JSON.stringify(workspaces));
      const wsIdx = wsList.findIndex(w => w.id === wsId);
      if (wsIdx >= 0) {
        const dirIdx = wsList[wsIdx].directories.findIndex(d => d.id === dirId);
        if (dirIdx >= 0) {
          wsList[wsIdx].directories[dirIdx].files.push({
            id: Date.now().toString(),
            name,
            fileNumber,
            createdAt: Date.now()
          });
          saveUserData({ workspaces: wsList });
        }
      }
    });
  };

  const editFile = (wsId: string, dirId: string, fileId: string) => {
    const wsList = JSON.parse(JSON.stringify(workspaces));
    const wsIdx = wsList.findIndex(w => w.id === wsId);
    if (wsIdx < 0) return;
    const dirIdx = wsList[wsIdx].directories.findIndex(d => d.id === dirId);
    if (dirIdx < 0) return;
    const fIdx = wsList[wsIdx].directories[dirIdx].files.findIndex(f => f.id === fileId);
    if (fIdx < 0) return;

    const file = wsList[wsIdx].directories[dirIdx].files[fIdx];
    openPrompt2('Edit File', 'Subject / Name of File', 'Official File Number', file.name, file.fileNumber || '', (newName, newFileNumber) => {
      if (!newName) return;
      wsList[wsIdx].directories[dirIdx].files[fIdx] = { ...file, name: newName, fileNumber: newFileNumber || '' };
      saveUserData({ workspaces: wsList });
    });
  };

  const deleteFile = (wsId: string, dirId: string, fileId: string) => {
    openConfirm('Delete File', 'Are you sure you want to delete this file recording? All letters inside will also be deleted.', () => {
      deleteFileCascade(wsId, dirId, fileId);
    });
  };

  const copyFile = (wsId: string, dirId: string, fileId: string) => {
    const wsList = JSON.parse(JSON.stringify(workspaces));
    const wsIdx = wsList.findIndex(w => w.id === wsId);
    if (wsIdx < 0) return;
    
    openPrompt('Copy File', '', (targetDirName) => {
      if (!targetDirName) return;
      const targetDirIdx = wsList[wsIdx].directories.findIndex(d => d.name.toLowerCase() === targetDirName.toLowerCase());
      if (targetDirIdx < 0) return alert('Directory not found in this workspace.');

      const dIdx = wsList[wsIdx].directories.findIndex(d => d.id === dirId);
      if (dIdx < 0) return;

      const fIdx = wsList[wsIdx].directories[dIdx].files.findIndex(f => f.id === fileId);
      if (fIdx < 0) return;

      const file = wsList[wsIdx].directories[dIdx].files[fIdx];
      const newFile = { ...file, id: Date.now().toString(), name: file.name + ' (Copy)' };
      wsList[wsIdx].directories[targetDirIdx].files.push(newFile);
      
      saveUserData({ workspaces: wsList });
    });
  };

  const moveFile = (wsId: string, oldDirId: string, fileId: string) => {
    const wsList = JSON.parse(JSON.stringify(workspaces));
    const wsIdx = wsList.findIndex(w => w.id === wsId);
    if (wsIdx < 0) return;
    
    openPrompt('Move File', '', (targetDirName) => {
      if (!targetDirName) return;

      const targetDirIdx = wsList[wsIdx].directories.findIndex(d => d.name.toLowerCase() === targetDirName.toLowerCase());
      if (targetDirIdx < 0) return alert('Directory not found in this workspace.');

      const oldDirIdx = wsList[wsIdx].directories.findIndex(d => d.id === oldDirId);
      if (oldDirIdx < 0) return;

      const fIdx = wsList[wsIdx].directories[oldDirIdx].files.findIndex(f => f.id === fileId);
      if (fIdx < 0) return;

      const file = wsList[wsIdx].directories[oldDirIdx].files[fIdx];
      wsList[wsIdx].directories[oldDirIdx].files.splice(fIdx, 1);
      wsList[wsIdx].directories[targetDirIdx].files.push(file);
      
      saveUserData({ workspaces: wsList });
    });
  };

  const editDir = (wsId: string, dirId: string) => {
    const wsList = JSON.parse(JSON.stringify(workspaces));
    const wsIdx = wsList.findIndex(w => w.id === wsId);
    if (wsIdx < 0) return;
    const dirIdx = wsList[wsIdx].directories.findIndex(d => d.id === dirId);
    if (dirIdx < 0) return;

    const dir = wsList[wsIdx].directories[dirIdx];
    openPrompt('Rename Directory', dir.name, (newName) => {
      if (!newName) return;
      wsList[wsIdx].directories[dirIdx] = { ...dir, name: newName };
      saveUserData({ workspaces: wsList });
    });
  };

  const deleteDir = (wsId: string, dirId: string) => {
    openConfirm('Delete Folder', 'Are you sure you want to delete this folder and all its contents? All letters inside this folder will also be deleted.', () => {
      deleteDirCascade(wsId, dirId);
    });
  };

  return (
    <div className="space-y-8">
      <header className="mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Directories & Files</h1>
        <p className="text-black dark:text-white/50 text-sm mt-2 mb-6">Manage nested directories and case records.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
           <div className="relative flex-1">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
             <input 
               type="text" 
               placeholder="Search files or directories..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 pl-10 pr-4 py-2 text-sm font-bold uppercase tracking-wider"
             />
           </div>
           <button 
             onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
             className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5"
           >
             Sort {sortOrder === 'asc' ? '▲' : '▼'}
           </button>
        </div>
      </header>

      <div className="space-y-12">
        {!currentDirId ? (
          // ROOT VIEW: Show Workspaces and their root directories
          workspaces.map(ws => (
            <div key={ws.id} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[#22C55E] font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                  <span className={activeWorkspaceId === ws.id ? 'w-2 h-2 bg-[#22C55E] rounded-full' : ''} />
                  {ws.name}
                </h2>
                <button onClick={() => addDir(ws.id)} className="border border-[#22C55E] text-[#22C55E] px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-[#22C55E] hover:text-black transition-colors flex items-center gap-2">
                  <Plus className="w-3 h-3" /> Root Folder
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {ws.directories
                  .filter(d => !d.parentId)
                  .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.files.some(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(dir => (
                  <div key={dir.id} className="border-2 border-black/10 dark:border-white/10 p-6 bg-black/5 dark:bg-white/5 group/dir cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors" onClick={() => setCurrentDirId(dir.id)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Folder className="w-8 h-8 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover/dir:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                         <button onClick={() => editDir(ws.id, dir.id)} className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4" /></button>
                         <button onClick={() => deleteDir(ws.id, dir.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <h3 className="font-bold uppercase text-lg mt-4">{dir.name}</h3>
                    <p className="text-xs text-black/50 dark:text-white/50">{dir.files.length} files, {ws.directories.filter(d => d.parentId === dir.id).length} folders</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          // DRILL-DOWN VIEW: Show contents of currentDirId
          <div className="space-y-6">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4">
              <button onClick={() => setCurrentDirId(null)} className="hover:text-black dark:hover:text-white">Rooms</button>
              {getBreadcrumbs().map((crumb, idx) => (
                 <div key={crumb.id} className="flex items-center gap-2">
                    <span>/</span>
                    <button 
                       onClick={() => setCurrentDirId(crumb.id)} 
                       className={idx === getBreadcrumbs().length - 1 ? 'text-[#22C55E]' : 'hover:text-black dark:hover:text-white'}
                    >
                      {crumb.name}
                    </button>
                 </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-black uppercase">{currentDir?.name}</h2>
               <div className="flex gap-4">
                 <button onClick={() => currentWs && currentDir && addDir(currentWs.id, currentDir.id)} className="border border-blue-500 text-blue-500 px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-2">
                   <Plus className="w-3 h-3" /> Folder
                 </button>
                 <button onClick={() => currentWs && currentDir && addFile(currentWs.id, currentDir.id)} className="border border-amber-500 text-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-colors flex items-center gap-2">
                   <Plus className="w-3 h-3" /> File
                 </button>
               </div>
            </div>

            {/* Folders Grid */}
            {currentWs && currentWs.directories.filter(d => d.parentId === currentDirId).length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-4">Folders</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {currentWs.directories.filter(d => d.parentId === currentDirId).map(subd => (
                    <div key={subd.id} className="border border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5 group/subd cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-between" onClick={() => setCurrentDirId(subd.id)}>
                      <div className="flex items-center gap-3">
                        <Folder className="w-6 h-6 text-blue-400" />
                        <h4 className="font-bold uppercase text-sm truncate">{subd.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover/subd:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                         <button onClick={() => editDir(currentWs.id, subd.id)} className="text-blue-400 hover:text-blue-300"><Edit2 className="w-3 h-3" /></button>
                         <button onClick={() => deleteDir(currentWs.id, subd.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files List */}
            {currentWs && currentDir && (currentDir.files?.length || 0) > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-4">Files</h3>
                <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-lg">
                  {currentDir.files.sort((a,b) => sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt).map((f, i) => {
                    const letterCount = (letters || []).filter(l => l.fileId === f.id).length;
                    return (
                    <div key={f.id} className={`flex items-center justify-between p-4 group transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${i !== currentDir.files.length - 1 ? 'border-b border-black/10 dark:border-white/10' : ''}`}>
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleFileClick(currentWs.id, currentDir.id, f.id, f.name, f.fileNumber || '')}>
                        <FileText className="w-6 h-6 text-amber-500" />
                        <div>
                          <p className="font-bold text-lg">{f.name}</p>
                          <div className="flex items-center gap-4 text-xs text-black/50 dark:text-white/50 mt-1 uppercase tracking-widest">
                            <span>File No: {f.fileNumber || 'N/A'}</span>
                            <span>Created: {new Date(f.createdAt).toLocaleDateString()}</span>
                            {letterCount > 0 && (
                              <span className="bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 px-2 py-0.5 font-bold">
                                {letterCount} চিঠি
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 shrink-0">
                        <button onClick={() => handleFileClick(currentWs.id, currentDir.id, f.id, f.name, f.fileNumber || '')} className="text-[#22C55E] p-2 hover:bg-[#22C55E]/10 rounded-md" title="View Letters"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => moveFile(currentWs.id, currentDir.id, f.id)} className="text-blue-400 p-2 hover:bg-blue-400/10 rounded-md" title="Move File"><ArrowRightLeft className="w-4 h-4" /></button>
                        <button onClick={() => copyFile(currentWs.id, currentDir.id, f.id)} className="text-green-400 p-2 hover:bg-green-400/10 rounded-md" title="Copy File"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => editFile(currentWs.id, currentDir.id, f.id)} className="text-amber-500 p-2 hover:bg-amber-500/10 rounded-md" title="Edit Properties"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteFile(currentWs.id, currentDir.id, f.id)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-md" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {currentWs && currentDir && currentDir.files.length === 0 && currentWs.directories.filter(d => d.parentId === currentDirId).length === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-black/20 dark:border-white/20">
                <Folder className="w-16 h-16 mx-auto text-black/20 dark:text-white/20 mb-4" />
                <h3 className="text-lg font-bold uppercase mb-2">This folder is empty</h3>
                <p className="text-black/50 dark:text-white/50 text-sm mb-6">Create a file or subfolder to get started.</p>
                <div className="flex justify-center gap-4">
                 <button onClick={() => addDir(currentWs.id, currentDir.id)} className="border border-blue-500 text-blue-500 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Folder
                 </button>
                 <button onClick={() => addFile(currentWs.id, currentDir.id)} className="border border-amber-500 text-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-colors flex items-center gap-2">
                   <Plus className="w-4 h-4" /> File
                 </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* ── Letter History Modal ── */}
      {selectedFile && (() => {
        let fileLetters = (letters || [])
          .filter(l => l.fileId === selectedFile.fileId)
          .sort((a, b) => b.createdAt - a.createdAt);
          
        if (letterTab !== 'all') {
            if (letterTab === 'ai' || letterTab === 'format') {
                fileLetters = fileLetters.filter(l => l.mode === 'ai' || l.mode === 'format');
            } else {
                fileLetters = fileLetters.filter(l => l.mode === letterTab);
            }
        }
        
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-900 border-2 border-black/20 dark:border-white/20 w-full max-w-4xl shadow-2xl mt-8 mb-8">
              {/* Header */}
              <div className="flex justify-between items-start p-6 border-b-2 border-black/10 dark:border-white/10">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-[#22C55E]">{selectedFile.fileName}</h2>
                  {selectedFile.fileNumber && (
                    <p className="text-xs text-black/50 dark:text-white/50 mt-1 font-mono">File No: {selectedFile.fileNumber}</p>
                  )}
                  <p className="text-xs text-black/50 dark:text-white/50 mt-1 uppercase tracking-widest">
                    {fileLetters.length > 0 ? `${fileLetters.length} Records found` : 'No letters generated yet'}
                  </p>
                </div>
                <button onClick={() => { setSelectedFile(null); setPreviewLetter(null); }}
                  className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white text-2xl font-bold leading-none p-1">✕</button>
              </div>

              {/* Conditional Render: Either Preview OR Tabs+List */}
              {previewLetter ? (
                <div className="flex-1 flex flex-col p-6 bg-[#22C55E]/5 min-h-[50vh]">
                  <div className="flex justify-between items-center mb-6 border-b border-[#22C55E]/30 pb-4">
                    <h3 className="text-lg font-black uppercase tracking-widest text-[#22C55E]">Letter Preview</h3>
                    <button onClick={() => setPreviewLetter(null)} className="text-xs font-bold uppercase tracking-widest border border-black/20 dark:border-white/20 px-4 py-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">← Back to List</button>
                  </div>
                  <div className="mb-6">
                     <p className="text-xl font-bold mb-2 break-words">Sub: {previewLetter.subject}</p>
                     {previewLetter.recipient && <p className="text-base text-black/60 dark:text-white/60 mb-2 whitespace-pre-wrap">To:\n{previewLetter.recipient}</p>}
                     {previewLetter.copyTo && previewLetter.copyTo.length > 0 && (
                         <div className="text-sm text-black/50 dark:text-white/50 mt-2 mb-4 whitespace-pre-wrap">Copy To:\n{previewLetter.copyTo.join('\n')}</div>
                     )}
                  </div>
                  <div className="flex-1 bg-white dark:bg-black border border-black/10 dark:border-white/10 p-8 overflow-y-auto shadow-inner rounded-sm font-serif">
                    <pre className="text-base font-serif whitespace-pre-wrap leading-relaxed text-black dark:text-white">{previewLetter.body}</pre>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex px-6 pt-4 border-b border-black/10 dark:border-white/10 gap-4">
                    <button 
                      onClick={() => setLetterTab('all')} 
                      className={`pb-2 text-xs font-bold uppercase tracking-widest ${letterTab === 'all' ? 'border-b-2 border-[#22C55E] text-[#22C55E]' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
                    >All</button>
                    <button 
                      onClick={() => setLetterTab('ai')} 
                      className={`pb-2 text-xs font-bold uppercase tracking-widest ${letterTab === 'ai' || letterTab === 'format' ? 'border-b-2 border-[#22C55E] text-[#22C55E]' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
                    >Letters</button>
                    <button 
                      onClick={() => setLetterTab('note')} 
                      className={`pb-2 text-xs font-bold uppercase tracking-widest ${letterTab === 'note' ? 'border-b-2 border-[#22C55E] text-[#22C55E]' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
                    >Note Sheets</button>
                    <button 
                      onClick={() => setLetterTab('order')} 
                      className={`pb-2 text-xs font-bold uppercase tracking-widest ${letterTab === 'order' ? 'border-b-2 border-[#22C55E] text-[#22C55E]' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
                    >Orders</button>
                  </div>

                  {/* Letters List */}
                  <div className="max-h-[50vh] overflow-y-auto divide-y divide-black/10 dark:divide-white/10">
                    {fileLetters.length === 0 ? (
                      <div className="text-center py-16 px-6">
                        <FileText className="w-12 h-12 mx-auto text-black/20 dark:text-white/20 mb-4" />
                        <p className="text-black/50 dark:text-white/50 text-sm mb-2">No records found for this category.</p>
                      </div>
                    ) : fileLetters.map(letter => (
                      <div key={letter.id} className="flex items-start justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                              letter.mode === 'note' ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                              : letter.mode === 'order' ? 'border-amber-500 text-amber-500 bg-amber-500/10'
                              : 'border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10'
                            }`}>
                              {letter.mode === 'note' ? 'Note Sheet' : letter.mode === 'order' ? 'Order' : 'Letter'}
                            </span>
                            <span className="text-[10px] text-black/60 dark:text-white/60 font-mono font-bold">
                              {new Date(letter.createdAt).toLocaleDateString()}
                              {' '}
                              {new Date(letter.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="font-bold text-base truncate">Sub: {letter.subject || '(No Subject)'}</p>
                          {letter.recipient && (
                            <p className="text-xs text-black/60 dark:text-white/60 truncate mt-1">
                              To: {letter.recipient.split('\n')[0]}
                            </p>
                          )}
                          <p className="text-[10px] text-black/40 dark:text-white/40 mt-1 uppercase tracking-widest font-bold">
                            {letter.signatureName} • {letter.signatureDesig}
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <button
                              onClick={() => setPreviewLetter(letter)}
                              className="flex items-center justify-center gap-1 border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors border-black/20 dark:border-white/20 hover:border-[#22C55E] hover:text-[#22C55E]"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            <button
                              onClick={() => {
                                  navigate(`/write?editId=${letter.id}&mode=${letter.mode}`);
                              }}
                              className="flex items-center justify-center gap-1 border border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                openConfirm('Delete Letter', 'Are you sure you want to delete this letter record completely from the server? This action cannot be undone.', () => {
                                  deleteLetter(letter.id);
                                });
                              }}
                              className="flex items-center justify-center gap-1 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="p-4 border-t border-black/10 dark:border-white/10 flex justify-end items-center bg-black/5 dark:bg-white/5">
                <button
                  onClick={() => { setSelectedFile(null); setPreviewLetter(null); }}
                  className="bg-[#22C55E] hover:bg-[#1fb355] text-black px-8 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Dialog */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border-2 border-black/20 dark:border-white/20 p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#22C55E] mb-4">{dialog.title}</h2>
            {dialog.message && <p className="mb-4 text-sm">{dialog.message}</p>}
            
            {(dialog.type === 'prompt' || dialog.type === 'prompt-2') && (
              <div className="space-y-4 mb-6">
                 <div>
                   {dialog.label1 && <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">{dialog.label1}</label>}
                   <input 
                     autoFocus
                     className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-3 text-sm focus:border-[#22C55E] outline-none" 
                     value={dialog.value} 
                     onChange={e => setDialog(d => ({...d, value: e.target.value}))} 
                     onKeyDown={e => { if (e.key === 'Enter' && dialog.type === 'prompt') { dialog.onConfirm(dialog.value, ''); closeDialog(); } }}
                   />
                 </div>
                 {dialog.type === 'prompt-2' && (
                   <div>
                     {dialog.label2 && <label className="block text-[10px] font-bold uppercase tracking-widest mb-1">{dialog.label2}</label>}
                     <input 
                       className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-3 text-sm focus:border-[#22C55E] outline-none" 
                       value={dialog.value2} 
                       onChange={e => setDialog(d => ({...d, value2: e.target.value}))} 
                       onKeyDown={e => { if (e.key === 'Enter') { dialog.onConfirm(dialog.value, dialog.value2); closeDialog(); } }}
                     />
                   </div>
                 )}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button onClick={closeDialog} className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
              <button 
                onClick={() => { dialog.onConfirm(dialog.value, dialog.value2); closeDialog(); }}
                className="bg-[#22C55E] hover:bg-[#1fb355] text-black px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
