import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { Settings, Image as ImageIcon, Building2, Signature as SigIcon } from 'lucide-react';
import { auth } from '../../lib/firebase';

export default function SetupScreen() {
  const { user, saveUserData, apiKeys } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [apiKey, setApiKey] = useState(apiKeys[0]?.key || '');
  const [wsName, setWsName] = useState('');
  const [officeEn, setOfficeEn] = useState('');
  const [officeHi, setOfficeHi] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState('');

  const [sigName, setSigName] = useState(user?.displayName || '');
  const [sigDesig, setSigDesig] = useState('');
  const [sigSection, setSigSection] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinish = async () => {
    if (!sigName || !sigDesig) {
      alert("Officer name & designation required");
      return;
    }
    
    setLoading(true);
    
    const sigId = Date.now().toString(36) + 'sig';
    const dirId = Date.now().toString(36) + 'dir';
    const fileId = Date.now().toString(36) + 'file';
    const wsId = Date.now().toString(36) + 'ws';

    const newWs = {
      id: wsId,
      name: wsName,
      office_en: officeEn,
      office_hi: officeHi,
      address,
      phone: '',
      email: '',
      logo: logo,
      createdAt: Date.now(),
      signatures: [{ id: sigId, name: sigName, designation: sigDesig, section: sigSection, active: true }],
      directories: [{
        id: dirId, 
        name: 'General', 
        filePrefix: '', 
        files: [{ id: fileId, name: 'Default File', fileNumber: '', createdAt: Date.now() }]
      }]
    };

    const newApiKeys = [{
      key: apiKey,
      label: 'Primary',
      added: Date.now(),
      usage: { date: new Date().toISOString().slice(0,10), tokens: 0 }
    }];

    try {
      await saveUserData({
        profile: { displayName: sigName, email: user?.email || '', setupAt: Date.now() },
        workspaces: [newWs],
        apiKeys: newApiKeys,
        activeWorkspaceId: wsId,
        activeDirectoryId: dirId,
        activeFileId: fileId,
        activeSignatureId: sigId
      });
      // Will redirect automatically due to App.tsx logic
    } catch (e) {
      console.error(e);
      alert("Failed to save setup data");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0A0A0A] text-slate-900 dark:text-[#F0F0F0] font-sans flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full border-x-0 sm:border-x-8 md:border-8 border-[#22C55E] p-8 md:p-12 relative">
        <header className="mb-12 text-center">
          <p className="text-[#22C55E] font-mono text-xs tracking-widest uppercase mb-2">Step {step} of 3</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">Initial Setup</h1>
          <p className="text-black dark:text-white/50 text-sm font-medium">Logged in as {user?.email} <button onClick={() => auth.signOut()} className="underline ml-2">Switch</button></p>
        </header>

        <div className="space-y-8">
          {step === 1 && (
            <div className="space-y-6 slide-up">
              <div className="flex items-center gap-4 text-[#22C55E] mb-6">
                <Settings className="w-8 h-8" />
                <h2 className="text-xl font-bold uppercase tracking-widest">Gemini API Key</h2>
              </div>
              <p className="text-sm text-black dark:text-white/60 mb-8">Get a free key from Google AI Studio. This is required for AI generation features.</p>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">API Key *</label>
                <input 
                  type="password" 
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)} 
                  className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none transition-colors"
                  placeholder="AIzaSy..."
                />
              </div>

              <div className="pt-8">
                <button 
                  onClick={() => apiKey.length > 20 ? setStep(2) : alert("Valid API Key required")}
                  className="w-full bg-[#22C55E] hover:bg-[#1fb355] text-black font-bold uppercase tracking-widest py-4 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 slide-up">
              <div className="flex items-center gap-4 text-[#22C55E] mb-6">
                <Building2 className="w-8 h-8" />
                <h2 className="text-xl font-bold uppercase tracking-widest">Workspace Details</h2>
              </div>
              <p className="text-sm text-black dark:text-white/60 mb-8">A workspace represents your current posting or office.</p>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Workspace Name *</label>
                <input type="text" value={wsName} onChange={e => setWsName(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g., Bhubaneswar Preventive" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/60">Office Name (English)</label>
                  <input type="text" value={officeEn} onChange={e => setOfficeEn(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/60">Office Name (Hindi)</label>
                  <input type="text" value={officeHi} onChange={e => setOfficeHi(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/60">Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none" rows={2}/>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/60 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Letterhead Logo (Optional)</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-black file:bg-[#22C55E] file:font-bold file:uppercase file:cursor-pointer hover:file:bg-[#1fb355] border-2 border-black/20 dark:border-white/20 bg-white/50 dark:bg-black/50 p-2" />
              </div>

              <div className="pt-8 flex gap-4">
                <button onClick={() => setStep(1)} className="w-1/3 border-2 border-black/20 dark:border-white/20 text-black dark:text-white font-bold uppercase tracking-widest py-4 hover:border-white/50 transition-colors">Back</button>
                <button onClick={() => wsName ? setStep(3) : alert("Workspace name required")} className="w-2/3 bg-[#22C55E] text-black font-bold uppercase tracking-widest py-4 hover:bg-[#1fb355] transition-colors">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 slide-up">
              <div className="flex items-center gap-4 text-[#22C55E] mb-6">
                <SigIcon className="w-8 h-8" />
                <h2 className="text-xl font-bold uppercase tracking-widest">Initial Signature</h2>
              </div>
              <p className="text-sm text-black dark:text-white/60 mb-8">Who will be signing the letters? You can add more later.</p>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Officer Name *</label>
                <input type="text" value={sigName} onChange={e => setSigName(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g., Shri Prakash Chandra Dhal" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Designation *</label>
                <input type="text" value={sigDesig} onChange={e => setSigDesig(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g., Superintendent" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/60">Section / Division</label>
                <input type="text" value={sigSection} onChange={e => setSigSection(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border-2 border-black/20 dark:border-white/20 p-4 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g., Administration" />
              </div>

              <div className="pt-8 flex gap-4">
                <button onClick={() => setStep(2)} className="w-1/3 border-2 border-black/20 dark:border-white/20 text-black dark:text-white font-bold uppercase tracking-widest py-4 hover:border-white/50 transition-colors">Back</button>
                <button 
                  onClick={handleFinish} 
                  disabled={loading}
                  className="w-2/3 bg-[#22C55E] text-black font-bold uppercase tracking-widest py-4 hover:bg-[#1fb355] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
