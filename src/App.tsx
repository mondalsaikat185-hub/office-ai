/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useStore } from './lib/store';

import Layout from './components/layout/Layout';
import AuthScreen from './components/screens/AuthScreen';
import SetupScreen from './components/screens/SetupScreen';
import HomeScreen from './components/screens/HomeScreen';
import WriteScreen from './components/screens/WriteScreen';
import FilesScreen from './components/screens/FilesScreen';
import InboxScreen from './components/screens/InboxScreen';
import GPFScreen from './components/screens/GPFScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import BulkScreen from './components/screens/BulkScreen';
import DiaryScreen from './components/screens/DiaryScreen';
import DemandScreen from './components/screens/DemandScreen';
import ReportScreen from './components/screens/ReportScreen';
import CaseRegisterScreen from './components/screens/CaseRegisterScreen';

export default function App() {
  const { theme, setTheme, user, setUser, loadUserData, workspaces, inbox, saveUserData } = useStore();
  const [loading, setLoading] = useState(true);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await loadUserData();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, loadUserData]);

  useEffect(() => {
    if (!loading && user && inbox) {
      const today = new Date().toISOString().split('T')[0];
      const hasPendingReminders = inbox.some(item => item.status === 'pending' && item.remindOn && item.remindOn <= today);
      if (hasPendingReminders && !sessionStorage.getItem('dismissed_reminders_temporary')) {
        setShowReminders(true);
      }
    }
  }, [loading, user, inbox]);

  const handleDismissReminders = () => {
    sessionStorage.setItem('dismissed_reminders_temporary', 'true');
    setShowReminders(false);
  };

  const markReminderDone = async (id: string) => {
    const newInbox = inbox.map(i => i.id === id ? { ...i, status: 'done' as 'done' } : i);
    await saveUserData({ inbox: newInbox });
    // If no more pending, close modal
    const today = new Date().toISOString().split('T')[0];
    const stillPending = newInbox.some(item => item.status === 'pending' && item.remindOn && item.remindOn <= today);
    if (!stillPending) {
       setShowReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-black dark:text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E] mb-4"></div>
        <p className="text-gray-400 font-mono tracking-widest text-sm uppercase">Loading AI Office Assistant...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // If user is logged in but hasn't completed setup (no workspaces)
  if (workspaces.length === 0) {
    return <SetupScreen />;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomeScreen />} />
            <Route path="write" element={<WriteScreen />} />
            <Route path="files" element={<FilesScreen />} />
            <Route path="diary" element={<DiaryScreen />} />
            <Route path="demand" element={<DemandScreen />} />
            <Route path="cases" element={<CaseRegisterScreen />} />
            <Route path="reports" element={<ReportScreen />} />
            <Route path="inbox" element={<InboxScreen />} />
            <Route path="bulk" element={<BulkScreen />} />
            <Route path="gpf" element={<GPFScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Reminders Modal */}
      {showReminders && (
         <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-900 border-x-[8px] border-amber-500 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-start bg-amber-500/10">
                  <div>
                     <h2 className="text-xl font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                        ⚠️ Pending Reminders!
                     </h2>
                     <p className="text-[10px] text-black/50 dark:text-white/50 uppercase tracking-widest mt-1">You have tasks that are due or overdue</p>
                  </div>
                  <button onClick={handleDismissReminders} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white font-bold p-2 text-xl">✕</button>
               </div>
               
               <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                  {inbox.filter(item => item.status === 'pending' && item.remindOn && item.remindOn <= new Date().toISOString().split('T')[0]).map(item => (
                     <div key={item.id} className="border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 flex gap-4 items-start">
                        <div className="flex-1">
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-0.5 border border-red-500/20">
                                 Due: {new Date(item.remindOn!).toLocaleDateString('en-IN')}
                              </span>
                           </div>
                           <p className="text-sm whitespace-pre-wrap font-mono text-black dark:text-white/80">{item.note || 'No description provided'}</p>
                        </div>
                        <button 
                           onClick={() => markReminderDone(item.id)}
                           className="shrink-0 bg-[#22C55E] hover:bg-[#1fb355] text-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm"
                        >
                           Mark Done
                        </button>
                     </div>
                  ))}
               </div>
               
               <div className="p-4 border-t border-black/10 dark:border-white/10 flex justify-end bg-black/5 dark:bg-white/5">
                  <button onClick={handleDismissReminders} className="px-6 py-2 border border-black/20 dark:border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                     Remind Me Next Time
                  </button>
               </div>
            </div>
         </div>
      )}
    </>
  );
}
