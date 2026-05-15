export interface SignatureBlock {
  id: string;
  name: string;
  designation: string;
  section: string;
  active: boolean;
}

export interface AppFile {
  id: string;
  name: string;
  fileNumber: string;
  defaultSignatureId?: string | null;
  notes?: string;
  createdAt: number;
  _noteCount?: number;
}

export interface AppDirectory {
  id: string;
  name: string;
  parentId?: string; // Optional parent directory id
  filePrefix: string;
  defaultSignatureId?: string | null;
  files: AppFile[];
}

export interface Letterhead {
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  l5: string;
  l6: string;
  logo1?: string;
  logo2?: string;
  logo3?: string;
  s1?: number; // sizes
  s2?: number;
  s3?: number;
  s4?: number;
  s5?: number;
  s6?: number;
  color?: string; // e.g. #1A3A8A
}

export interface Workspace {
  id: string;
  name: string;
  office_en: string;
  office_hi: string;
  address: string;
  phone: string;
  email: string;
  logo: string; // base64
  letterhead?: Letterhead;
  createdAt: number;
  signatures: SignatureBlock[];
  directories: AppDirectory[];
}

export interface ApiKey {
  key: string;
  label: string;
  added: number;
  usage: {
    date: string;
    tokens: number;
  };
}

export interface AddressBookEntry {
  id: string;
  name: string;
  desig: string;
  office: string;
  address: string;
  salutation: string;
  quickChip: boolean;
}

export interface Phrase {
  id: string;
  category: string;
  text: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  opening: string;
  closing: string;
  copyTo: string[];
}

export interface Letter {
  id: string;
  workspaceId: string;
  workspaceName: string;
  directoryId: string;
  directoryName: string;
  fileId: string;
  fileName: string;
  fileNumber: string;
  subject: string;
  mode: 'ai' | 'format' | 'note';
  body: string;
  bodyHtml: string;
  signatureId: string;
  signatureName: string;
  signatureDesig: string;
  confidentiality: 'routine' | 'confidential' | 'secret';
  recipient: string;
  copyTo: string[];
  enclosures: string;
  salutation: string;
  createdAt: number;
}

export interface InboxItem {
  id: string;
  photo: string; // base64
  note: string;
  remindOn: string;
  workspaceId: string;
  status: 'pending' | 'done';
  createdAt: number;
}

export interface UserProfile {
  displayName?: string;
  email?: string;
  setupAt?: number;
}

export interface DiaryItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  type: 'hearing' | 'deadline' | 'meeting' | 'general';
  isCompleted: boolean;
  workspaceId: string;
  createdAt: number;
}

export interface AppState {
  profile: UserProfile | null;
  workspaces: Workspace[];
  apiKeys: ApiKey[];
  selectedModel: string;
  mistralKey: string;
  tokenBudget: number;
  addressBook: AddressBookEntry[];
  phrases: Phrase[];
  templates: Template[];
  appPasswordHash: string;
  tgBotToken: string;
  tgChatId: string;
  diary?: DiaryItem[];
  demands?: DemandItem[];
}

export interface DemandItem {
  id: string;
  date: string;
  party: string;
  partyName?: string;
  oio: string;
  oioNo?: string;
  oioDate?: string;
  tax?: string;
  penalty?: string;
  interest?: string;
  amount: number;
  recovered: number;
  recoveredAmount?: number;
  status: string;
}
