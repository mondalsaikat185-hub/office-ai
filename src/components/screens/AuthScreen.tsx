import { auth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('auth/unauthorized-domain')) {
        setErrorMsg(`Unauthorized domain. Please add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0A0A0A] text-slate-900 dark:text-[#F0F0F0] font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full border-2 border-[#22C55E] p-8 md:p-12 relative flex flex-col items-center">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#22C55E]" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#22C55E]" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#22C55E]" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#22C55E]" />

        <div className="w-20 h-20 bg-[#22C55E] flex items-center justify-center mb-8 rotate-3">
          <span className="text-4xl font-black text-black uppercase">AI</span>
        </div>
        
        <h1 className="text-4xl font-black uppercase tracking-tighter text-center leading-none mb-2">Office<br />Assistant</h1>
        <p className="text-black dark:text-white/50 text-sm mb-12 text-center uppercase tracking-widest font-mono">Secure Access Portal</p>

        {errorMsg && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mb-8 text-sm text-black dark:text-white/80 w-full break-words">
            <p className="font-bold text-red-500 mb-1">Error:</p>
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-[#22C55E] hover:bg-[#1fb355] text-black font-bold uppercase tracking-widest text-sm py-4 px-6 flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign In with Google
            </>
          )}
        </button>
        
        <p className="mt-8 text-xs text-center text-black dark:text-white/30 font-mono">
          SYSTEM VER: 1.0 / PROD<br />
          Data synced securely to your account
        </p>
      </div>
    </div>
  );
}
