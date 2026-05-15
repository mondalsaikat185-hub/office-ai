import { create } from 'zustand';
import { AppState, Workspace, Letter, InboxItem, ApiKey } from '../types';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, collection, query, getDocs, limit, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';

interface GlobalStore extends AppState {
  user: any | null;
  activeWorkspaceId: string | null;
  activeDirectoryId: string | null;
  activeFileId: string | null;
  activeSignatureId: string | null;
  letters: Letter[];
  inbox: InboxItem[];
  drafts: Record<string, any>;
  theme: 'dark' | 'light';
  
  // Actions
  setUser: (user: any) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveWorkspace: (id: string) => void;
  setActiveDirectory: (id: string) => void;
  setActiveFile: (id: string) => void;
  setActiveSignature: (id: string) => void;
  setDraft: (id: string, payload: any) => void;
  loadUserData: () => Promise<void>;
  saveUserData: (data?: Partial<GlobalStore>) => Promise<void>;
  saveLetter: (letter: Letter) => Promise<void>;
  deleteLetter: (id: string) => Promise<void>;
  deleteFileCascade: (wsId: string, dirId: string, fileId: string) => Promise<void>;
  deleteDirCascade: (wsId: string, dirId: string) => Promise<void>;
}

export const useStore = create<GlobalStore>((set, get) => ({
  user: null,
  profile: null,
  workspaces: [],
  apiKeys: [],
  selectedModel: 'gemini-1.5-flash',
  mistralKey: '',
  tokenBudget: 0,
  addressBook: [],
  phrases: [],
  templates: [],
  appPasswordHash: '',
  tgBotToken: '',
  tgChatId: '',
  diary: [],
  demands: [],
  
  drafts: {},
  
  activeWorkspaceId: null,
  activeDirectoryId: null,
  activeFileId: null,
  activeSignatureId: null,
  
  letters: [],
  inbox: [],
  theme: (localStorage.getItem('officeai_theme') as 'dark'|'light') || 'dark',

  setUser: (user) => set({ user }),
  setTheme: (theme) => {
    localStorage.setItem('officeai_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  setActiveWorkspace: (id) => {
    localStorage.setItem('officeai_lastWs', id);
    set({ activeWorkspaceId: id });
  },
  setActiveDirectory: (id) => {
    const { activeWorkspaceId } = get();
    if(activeWorkspaceId) localStorage.setItem('officeai_lastDir_'+activeWorkspaceId, id);
    set({ activeDirectoryId: id });
  },
  setActiveFile: (id) => {
    const { activeDirectoryId } = get();
    if(activeDirectoryId) localStorage.setItem('officeai_lastFile_'+activeDirectoryId, id);
    set({ activeFileId: id });
  },
  setActiveSignature: (id) => set({ activeSignatureId: id }),
  setDraft: (id, payload) => {
    set(state => ({ drafts: { ...state.drafts, [id]: payload } }));
    get().saveUserData(); // Persist drafts to Firebase
  },

  loadUserData: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const userDocRef = doc(db, 'officeai_users', user.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<AppState>;
        set((state) => ({ ...state, ...data }));
      } else {
        // default initialization
        console.log("No user document found. Needs setup.");
      }

      // Load inbox
      const inboxRef = collection(db, 'officeai_users', user.uid, 'inbox');
      const inboxSnap = await getDocs(query(inboxRef, orderBy('createdAt', 'desc'), limit(50)));
      set({ inbox: inboxSnap.docs.map(d => ({ id: d.id, ...d.data() } as InboxItem)) });

      // Load letters
      const lettersRef = collection(db, 'officeai_users', user.uid, 'letters');
      const lettersSnap = await getDocs(query(lettersRef, orderBy('createdAt', 'desc'), limit(500)));
      set({ letters: lettersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Letter)) });
      
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  },

  saveUserData: async (partialData) => {
    const { user, profile, workspaces, apiKeys, mistralKey, tokenBudget, addressBook, phrases, templates, appPasswordHash, tgBotToken, tgChatId, drafts } = get();
    if (!user) return;
    
    // update local state first if passing data
    if (partialData) {
      set(partialData);
    }

    try {
      const rawToSave = {
        profile: partialData?.profile ?? profile ?? null,
        workspaces: partialData?.workspaces ?? workspaces ?? [],
        apiKeys: partialData?.apiKeys ?? apiKeys ?? [],
        selectedModel: partialData?.selectedModel ?? get().selectedModel ?? '',
        mistralKey: partialData?.mistralKey ?? mistralKey ?? '',
        tokenBudget: partialData?.tokenBudget ?? tokenBudget ?? 0,
        addressBook: partialData?.addressBook ?? addressBook ?? [],
        phrases: partialData?.phrases ?? phrases ?? [],
        templates: partialData?.templates ?? templates ?? [],
        appPasswordHash: partialData?.appPasswordHash ?? appPasswordHash ?? '',
        tgBotToken: partialData?.tgBotToken ?? tgBotToken ?? '',
        tgChatId: partialData?.tgChatId ?? tgChatId ?? '',
        drafts: partialData?.drafts ?? drafts ?? {},
        diary: partialData?.diary ?? get().diary ?? [],
        demands: partialData?.demands ?? get().demands ?? [],
        activeWorkspaceId: partialData?.activeWorkspaceId ?? get().activeWorkspaceId ?? null,
        activeDirectoryId: partialData?.activeDirectoryId ?? get().activeDirectoryId ?? null,
        activeFileId: partialData?.activeFileId ?? get().activeFileId ?? null,
        activeSignatureId: partialData?.activeSignatureId ?? get().activeSignatureId ?? null,
        lastUpdate: Date.now()
      };

      const toSave = JSON.parse(JSON.stringify(rawToSave));
      
      await setDoc(doc(db, 'officeai_users', user.uid), toSave, { merge: true });
    } catch (error) {
      console.error("Error saving user data:", error);
      throw error;
    }
  },

  saveLetter: async (letter: Letter) => {
    const { user, letters } = get();
    if (!user) return;
    
    // Optimistic UI update
    set({ letters: [letter, ...letters] });
    
    try {
      const cleanLetter = JSON.parse(JSON.stringify(letter));
      await setDoc(doc(db, 'officeai_users', user.uid, 'letters', letter.id), cleanLetter);
    } catch (error) {
      console.error("Error saving letter:", error);
      // Revert if needed, but not strictly necessary here, just throw or log
      throw error;
    }
  },

  deleteLetter: async (id: string) => {
    const { user, letters } = get();
    if (!user) return;
    
    set({ letters: letters.filter(l => l.id !== id) });
    
    try {
      await deleteDoc(doc(db, 'officeai_users', user.uid, 'letters', id));
    } catch (error) {
      console.error("Error deleting letter:", error);
      set({ letters });
      throw error;
    }
  },

  deleteFileCascade: async (wsId: string, dirId: string, fileId: string) => {
    const { workspaces, letters, drafts, user, saveUserData } = get();
    if (!user) return;

    // Update workspaces tree
    const wsList = [...workspaces];
    const wsIdx = wsList.findIndex(w => w.id === wsId);
    if (wsIdx >= 0) {
      const dirIdx = wsList[wsIdx].directories.findIndex(d => d.id === dirId);
      if (dirIdx >= 0) {
        wsList[wsIdx].directories[dirIdx].files = wsList[wsIdx].directories[dirIdx].files.filter(f => f.id !== fileId);
      }
    }

    // Filter letters in memory
    const lettersToDelete = letters.filter(l => l.fileId === fileId);
    const newLetters = letters.filter(l => l.fileId !== fileId);

    // Update drafts memory
    const newDrafts = { ...drafts };
    delete newDrafts[fileId];

    set({ letters: newLetters, drafts: newDrafts });

    // Save user data (workspaces and drafts)
    await get().saveUserData({ workspaces: wsList, drafts: newDrafts });

    // Firestore batch delete of letters
    if (lettersToDelete.length > 0) {
      const batch = writeBatch(db);
      for (const l of lettersToDelete) {
        batch.delete(doc(db, 'officeai_users', user.uid, 'letters', l.id));
      }
      await batch.commit().catch(e => console.error("Error deleting letters: ", e));
    }
  },

  deleteDirCascade: async (wsId: string, dirId: string) => {
    const { workspaces, letters, drafts, user, saveUserData } = get();
    if (!user) return;

    const wsList = [...workspaces];
    const wsIdx = wsList.findIndex(w => w.id === wsId);
    
    let subDirsToDelete = new Set<string>([dirId]);
    let fileIdsToDelete = new Set<string>();

    if (wsIdx >= 0) {
      // Find all subdirectories
      let foundNew = true;
      while (foundNew) {
        foundNew = false;
        wsList[wsIdx].directories.forEach(d => {
            if (d.parentId && subDirsToDelete.has(d.parentId) && !subDirsToDelete.has(d.id)) {
                subDirsToDelete.add(d.id);
                foundNew = true;
            }
        });
      }

      // Find all file IDs in those directories
      wsList[wsIdx].directories.forEach(d => {
        if (subDirsToDelete.has(d.id)) {
          d.files.forEach(f => fileIdsToDelete.add(f.id));
        }
      });

      // Filter out the directories
      wsList[wsIdx].directories = wsList[wsIdx].directories.filter(d => !subDirsToDelete.has(d.id));
    }

    // Letters to delete
    const lettersToDelete = letters.filter(l => fileIdsToDelete.has(l.fileId) || subDirsToDelete.has(l.directoryId));
    const newLetters = letters.filter(l => !(fileIdsToDelete.has(l.fileId) || subDirsToDelete.has(l.directoryId)));

    // Drafts
    const newDrafts = { ...drafts };
    fileIdsToDelete.forEach(fid => delete newDrafts[fid]);

    set({ letters: newLetters, drafts: newDrafts });
    await get().saveUserData({ workspaces: wsList, drafts: newDrafts });

    if (lettersToDelete.length > 0) {
      const batch = writeBatch(db);
      for (const l of lettersToDelete) {
        batch.delete(doc(db, 'officeai_users', user.uid, 'letters', l.id));
      }
      await batch.commit().catch(e => console.error("Error deleting directory letters: ", e));
    }
  }
}));
