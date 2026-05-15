import { useStore } from '../../lib/store';
import { InboxItem } from '../../types';
import { Camera, Image as ImageIcon, Send, Sparkles, Loader2, Type, Folder, FileText } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { callGemini } from '../../lib/gemini';
import { useNavigate } from 'react-router-dom';

export default function InboxScreen() {
  const { inbox, saveUserData, workspaces, activeWorkspaceId, activeDirectoryId, activeFileId, setActiveWorkspace, setActiveDirectory, setActiveFile } = useStore();
  const [activeTab, setActiveTab] = useState<'pending'|'done'>('pending');
  const [inputMode, setInputMode] = useState<'upload'|'text'>('upload');
  const [textInput, setTextInput] = useState('');
  const [selectedB64s, setSelectedB64s] = useState<string[]>([]);
  const [uploadPrompt, setUploadPrompt] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const items = inbox.filter(i => i.status === activeTab);
  
  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  const dir = ws?.directories.find(d => d.id === activeDirectoryId);

  const processExtracted = async (base64OrText: string, isText: boolean = false) => {
    setIsUploading(true);
    try {
      const prompt = `Extract details from this government or official letter. 
Return ONLY a valid JSON object describing the letter fields: 
{ "sender": "Who sent it", "subject": "Subject of letter", "date": "Date mentioned", "summary": "Brief 1-2 sentence summary of what is requested/ordered", "suggestedReply": "Draft 1-2 sentences of how we might reply. Optional." }. 
Do not include markdown blocks, just raw JSON.${isText ? '\n\nTEXT:\n' + base64OrText : ''}`;

      const res = await callGemini(prompt, isText ? { maxOut: 1000, temp: 0.1 } : { maxOut: 1000, temp: 0.1, imageBase64: base64OrText });
      const responseText = res.text;
      
      let parsed: any = { summary: 'Could not parse', sender: '', subject: '', suggestedReply: '' };
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.error("Failed parsing Gemini JSON", err);
        parsed.summary = responseText.substring(0, 200) + '...';
      }

      let noteText = `From: ${parsed.sender || 'Unknown'}\nSubject: ${parsed.subject || 'Unknown'}\nSummary: ${parsed.summary}`;
      if (parsed.suggestedReply) {
        noteText += `\nSuggested Reply: ${parsed.suggestedReply}`;
      }
      if (isText) {
        noteText += `\n\nOriginal Text:\n${base64OrText}`;
      }

      const newItem: InboxItem = {
        id: crypto.randomUUID(),
        status: 'pending' as 'pending',
        photo: isText ? '' : base64OrText,
        note: noteText,
        createdAt: Date.now(),
        remindOn: reminderDate,
        workspaceId: activeWorkspaceId || ''
      };

      await saveUserData({ inbox: [newItem, ...inbox] });
      if (isText) setTextInput('');
      setReminderDate('');
    } catch (err: any) {
      alert("AI Processing Failed: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processMultiUploads = async () => {
    if (!selectedB64s.length) return;
    setIsUploading(true);
    try {
      const prmpt = `Extract details from these uploaded official documents/images/pdfs. 
User instructions/prompt: """${uploadPrompt || 'None'}"""
Based on the documents and the user instructions, return ONLY a valid JSON object describing the collective documents: 
{ "sender": "Who sent them or origin", "subject": "Overall Subject or User Prompt summarized", "date": "Date mentioned", "summary": "Brief summary", "suggestedReply": "Draft of what the user wants to write/reply, tailored to their instructions." }. 
Do not include markdown language blocks, just raw JSON.`;

      const res = await callGemini(prmpt, { maxOut: 1500, temp: 0.1, imageBase64s: selectedB64s });
      const responseText = res.text;
      
      let parsed: any = { summary: 'Could not parse', sender: '', subject: '', suggestedReply: '' };
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.error("Failed parsing Gemini JSON", err);
        parsed.summary = responseText.substring(0, 200) + '...';
      }

      let noteText = `From: ${parsed.sender || 'Unknown'}\nSubject: ${parsed.subject || 'Unknown'}\nSummary: ${parsed.summary}`;
      if (uploadPrompt) {
        noteText += `\nInstructions: ${uploadPrompt}`;
      }
      if (parsed.suggestedReply) {
        noteText += `\nSuggested Reply: ${parsed.suggestedReply}`;
      }

      const newItem: InboxItem = {
        id: crypto.randomUUID(),
        status: 'pending' as 'pending',
        photo: selectedB64s[0] && !selectedB64s[0].startsWith('data:application/pdf') ? selectedB64s[0] : '', // store the first one as thumbnail if it's an image
        note: noteText,
        createdAt: Date.now(),
        remindOn: reminderDate,
        workspaceId: activeWorkspaceId || ''
      };

      await saveUserData({ inbox: [newItem, ...inbox] });
      setSelectedB64s([]);
      setUploadPrompt('');
      setReminderDate('');
    } catch (err: any) {
      alert("AI Processing Failed: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newB64s: string[] = [];
      for (let i = 0; i < files.length; i++) {
         const file = files[i];
         const reader = new FileReader();
         const base64Promise = new Promise<string>((resolve) => {
           reader.onload = (ev) => {
             if (file.type === 'application/pdf') {
                resolve(ev.target?.result as string);
             } else {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  const MAX_DIM = 1024;
                  if (width > height && width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                  } else if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = ev.target?.result as string;
             }
           };
           reader.readAsDataURL(file);
         });
         const imageBase64 = await base64Promise;
         newB64s.push(imageBase64);
      }
      setSelectedB64s(prev => [...prev, ...newB64s]);
    } catch (err: any) {
      alert("Image/PDF processing failed: " + err.message);
    } finally {
      setIsUploading(false);
      // Don't clear input here so they can add more? or do clear:
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const markDone = async (id: string) => {
    const newInbox = inbox.map(i => i.id === id ? { ...i, status: 'done' as 'done' } : i);
    await saveUserData({ inbox: newInbox });
  };

  return (
    <div className="space-y-8">
      <header className="mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Inbox & Capture</h1>
          <p className="text-black dark:text-white/50 text-sm mt-2">Capture or paste details for processing.</p>
        </div>
        <div className="flex bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-1">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeTab === 'pending' ? 'bg-[#22C55E] text-black' : 'text-black dark:text-white/50'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => setActiveTab('done')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeTab === 'done' ? 'bg-[#22C55E] text-black' : 'text-black dark:text-white/50'}`}
          >
            Done
          </button>
        </div>
      </header>

      {/* Workspace / File Selection context */}
      <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Where will the file work be done?</h2>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase font-bold text-amber-500">Set Reminder:</label>
            <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} disabled={isUploading} className="bg-white dark:bg-neutral-900 border border-amber-500/50 p-1 text-xs text-black dark:text-white outline-none" title="Set a due date for this task"/>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-black dark:text-white/50">Workspace</label>
            <select value={activeWorkspaceId || ''} onChange={e => { setActiveWorkspace(e.target.value); setActiveDirectory(''); setActiveFile(''); }} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-xs text-black dark:text-white cursor-pointer outline-none">
              <option value="" disabled>-- Select Workspace --</option>
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {ws && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-black dark:text-white/50">Directory</label>
              <select value={activeDirectoryId || ''} onChange={e => { setActiveDirectory(e.target.value); setActiveFile(''); }} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-xs text-black dark:text-white cursor-pointer outline-none">
                <option value="" disabled>-- Select Directory --</option>
                {ws.directories.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {dir && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-black dark:text-white/50">File Number</label>
              <select value={activeFileId || ''} onChange={e => setActiveFile(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-xs text-black dark:text-white cursor-pointer outline-none">
                <option value="" disabled>-- Select File --</option>
                {dir.files.map(f => <option key={f.id} value={f.id}>{f.name} ({f.fileNumber})</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Input Form */}
      <div className="space-y-4">
        <div className="flex border-b-2 border-black/10 dark:border-white/10 p-1 gap-2">
          <button 
            onClick={() => setInputMode('upload')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${inputMode === 'upload' ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
          >
            <Camera className="w-4 h-4" /> Capture / Image
          </button>
          <button 
            onClick={() => setInputMode('text')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${inputMode === 'text' ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'}`}
          >
            <Type className="w-4 h-4" /> Write / Paste Text
          </button>
        </div>

        {inputMode === 'upload' ? (
          <div className="space-y-4">
            <input type="file" accept="image/*,application/pdf" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            <div 
              onClick={handleCaptureClick}
              className={`border-2 border-dashed border-[#22C55E]/50 bg-[#22C55E]/5 p-8 text-center cursor-pointer hover:bg-[#22C55E]/10 transition-colors group ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
               <div className="flex justify-center gap-6 mb-4">
                 {isUploading ? (
                   <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin" />
                 ) : (
                   <Camera className="w-12 h-12 text-[#22C55E]/50 group-hover:text-[#22C55E]" />
                 )}
               </div>
               <p className="text-[#22C55E] font-bold uppercase tracking-widest text-sm mb-2">
                 {isUploading ? 'Reading Files...' : 'Tap to Add Images or PDFs (Multiple allowed)'}
               </p>
               <p className="text-xs text-black dark:text-white/50">Capture physical documents or attach PDFs for AI extraction</p>
            </div>

            {selectedB64s.length > 0 && (
               <div className="border border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                     {selectedB64s.map((b64, idx) => (
                        <div key={idx} className="w-16 h-16 bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 overflow-hidden relative">
                           {b64.startsWith('data:application/pdf') ? (
                              <div className="flex items-center justify-center w-full h-full text-[10px] font-bold uppercase opacity-50">PDF</div>
                           ) : (
                              <img src={b64} alt="Preview" className="w-full h-full object-cover" />
                           )}
                           <button onClick={(e) => { e.stopPropagation(); setSelectedB64s(selectedB64s.filter((_, i) => i !== idx)); }} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                        </div>
                     ))}
                  </div>
                  <textarea
                     value={uploadPrompt}
                     onChange={(e) => setUploadPrompt(e.target.value)}
                     disabled={isUploading}
                     placeholder="Optional instructions (e.g., 'write a letter on behalf of me and the reply will be treated as nil...')"
                     className="w-full h-20 bg-transparent border border-black/20 dark:border-white/20 resize-none outline-none text-black dark:text-white font-mono text-sm p-2"
                  />
                  <div className="flex justify-end gap-2">
                     <button onClick={() => { setSelectedB64s([]); setUploadPrompt(''); }} disabled={isUploading} className="px-4 py-2 text-xs font-bold uppercase border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50">Clear</button>
                     <button onClick={processMultiUploads} disabled={isUploading} className="bg-[#22C55E] hover:bg-[#1fb355] text-black px-6 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-colors">
                       {isUploading ? 'Processing...' : `Process ${selectedB64s.length} item(s) with AI`}
                     </button>
                  </div>
               </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 border-2 border-dashed border-[#22C55E]/50 bg-[#22C55E]/5 p-4 group relative">
            {isUploading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 dark:bg-black/50">
                <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin" />
              </div>
            )}
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              disabled={isUploading}
              placeholder="Paste email content, WhatsApp messages, or letter text here..."
              className="w-full h-32 bg-transparent border-0 resize-none outline-none text-black dark:text-white font-mono text-sm p-2 placeholder-black/30 dark:placeholder-white/30"
            />
            <div className="flex justify-end pt-2 border-t border-[#22C55E]/20">
              <button 
                onClick={() => { if(textInput.trim()) processExtracted(textInput, true); }}
                disabled={isUploading || !textInput.trim()}
                className="bg-[#22C55E] hover:bg-[#1fb355] text-black px-6 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-colors"
               >
                 {isUploading ? 'Processing...' : 'Process with AI'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center p-12 text-black dark:text-white/30 font-mono text-sm uppercase tracking-widest">
            Inbox is empty
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="border-2 border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5 flex flex-col md:flex-row gap-4 items-start md:items-center">
              {item.photo ? (
                <div className="w-32 h-32 bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 shrink-0 flex items-center justify-center overflow-hidden">
                  <img src={item.photo} alt="Document" className="w-full h-full object-cover opacity-70" />
                </div>
              ) : (
                <div className="w-32 h-32 bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 shrink-0 flex items-center justify-center">
                  <span className="text-xs text-black dark:text-white/40 uppercase">No Image</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap font-mono text-black dark:text-white/80">{item.note || 'No description provided'}</p>
                <div className="flex gap-4 mt-4 flex-wrap">
                  <span className="text-[10px] uppercase tracking-widest text-black dark:text-white/40 font-mono border border-black/10 dark:border-white/10 px-2 py-1 bg-black/5 dark:bg-white/5 flex items-center gap-1">Date: {new Date(item.createdAt).toLocaleDateString()}</span>
                  {item.remindOn && <span className="text-[10px] uppercase tracking-widest text-amber-500 font-mono border border-amber-500/20 px-2 py-1 bg-amber-500/5">Due: {new Date(item.remindOn).toLocaleDateString()}</span>}
                  {item.workspaceId && (
                    <span className="text-[10px] uppercase tracking-widest text-blue-500 font-mono border border-blue-500/20 px-2 py-1 bg-blue-500/5 flex items-center gap-1">
                      <Folder className="w-3 h-3"/> Workspace Saved
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
                {activeTab === 'pending' && (
                  <button 
                    onClick={() => navigate(`/write?sourceId=${item.id}&action=reply`)}
                    className="bg-[#22C55E] hover:bg-[#1fb355] text-black px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" /> Smart Reply
                  </button>
                )}
                <button 
                  onClick={() => markDone(item.id)}
                  className="border border-black/20 dark:border-white/20 hover:border-white text-black dark:text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  {activeTab === 'pending' ? 'Mark Done' : 'Move to Pending'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
