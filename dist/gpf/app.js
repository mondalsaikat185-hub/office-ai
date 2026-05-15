/* ===== GPF App - Core UI & Settings ===== */

// --- Tab Switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// --- Toast ---
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// --- Theme Handling ---
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('gpf-theme', currentTheme);
  const btn = document.getElementById('theme-toggle');
  if (currentTheme === 'light') {
    btn.innerHTML = '🌙 Dark Mode';
  } else {
    btn.innerHTML = '☀️ Light Mode';
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem('gpf-theme');
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = '🌙 Dark Mode';
  }
}

// --- Letterhead Handling ---
function handleLogoUpload(id) {
  const fileInput = document.getElementById(id + '-file');
  if (!fileInput.files || !fileInput.files[0]) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    try {
      localStorage.setItem('gpf-' + id, base64);
      loadLogos();
    } catch(err) {
      toast('File is too large to save in localStorage!', 'error');
    }
  };
  reader.readAsDataURL(fileInput.files[0]);
}

function clearLogo(id) {
  localStorage.removeItem('gpf-' + id);
  document.getElementById(id + '-file').value = '';
  loadLogos();
}

function loadLogos() {
  ['s-logo1', 's-logo2', 's-logo3'].forEach(id => {
    const base64 = localStorage.getItem('gpf-' + id);
    const imgEl = document.getElementById('img-' + id);
    const btnEl = document.getElementById('btn-' + id);
    if (base64) {
      imgEl.src = base64;
      imgEl.style.display = 'block';
      btnEl.style.display = 'inline-block';
    } else {
      imgEl.style.display = 'none';
      btnEl.style.display = 'none';
      imgEl.src = '';
    }
  });
}

function toggleLetterheadFields() {
  const useLh = document.getElementById('s-use-letterhead');
  const fields = document.getElementById('letterhead-fields');
  if (useLh && fields) {
    if (useLh.value === 'yes') {
      fields.style.display = 'grid'; // .form-grid displays as grid
      document.getElementById('s-header-space').parentElement.style.opacity = '0.5';
    } else {
      fields.style.display = 'none';
      document.getElementById('s-header-space').parentElement.style.opacity = '1';
    }
  }
}

// --- Settings ---
function saveSettings() {
  const keys = ['s-header-space','s-office-short','s-hod','s-pao','s-pao-copy','s-prep-name','s-prep-desg', 's-ai-model', 
  's-use-letterhead', 's-lh-line1', 's-lh-line2', 's-lh-line3', 's-lh-line4', 's-lh-line5', 's-lh-line6'];
  const data = {};
  keys.forEach(k => {
    const el = document.getElementById(k);
    if(el) data[k] = el.value;
  });
  localStorage.setItem('gpf-settings', JSON.stringify(data));
  saveApiKeys(); // save API keys along with settings
  toast('Settings সেভ হয়েছে!');
}

function loadSettings() {
  const raw = localStorage.getItem('gpf-settings');
  if (raw) {
    const data = JSON.parse(raw);
    Object.keys(data).forEach(k => {
      const el = document.getElementById(k);
      if (el) el.value = data[k];
    });
  }
  
  loadLogos();
  toggleLetterheadFields();
  const lhSelector = document.getElementById('s-use-letterhead');
  if(lhSelector) lhSelector.addEventListener('change', toggleLetterheadFields);
}

function getSetting(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

// --- API Keys Management ---
let apiKeysList = [];

function loadApiKeys() {
  const raw = localStorage.getItem('gpf-api-keys');
  if (raw) {
    apiKeysList = JSON.parse(raw);
  } else {
    apiKeysList = [{ id: 1, key: '' }];
  }
  renderApiKeys();
}

function saveApiKeys() {
  const inputs = document.querySelectorAll('.api-key-input');
  apiKeysList = [];
  inputs.forEach((input, index) => {
    if(input.value.trim()) {
      apiKeysList.push({ id: index + 1, key: input.value.trim() });
    }
  });
  if(apiKeysList.length === 0) apiKeysList.push({ id: 1, key: '' });
  localStorage.setItem('gpf-api-keys', JSON.stringify(apiKeysList));
}

function renderApiKeys() {
  const list = document.getElementById('api-keys-list');
  if (!list) return;
  list.innerHTML = apiKeysList.map((k, i) => `
    <div class="sig-card" style="margin-bottom:8px;">
      <div class="sig-info" style="display:flex; gap:10px; align-items:center;">
        <span style="color:var(--text-dim); font-size:12px;">Key ${i+1}:</span>
        <input type="password" class="api-key-input" value="${k.key}" placeholder="AIzaSy..." style="flex:1; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; padding:8px 12px; color:var(--text); outline:none;">
      </div>
      <div class="sig-actions">
        <button class="btn btn-danger btn-sm" onclick="deleteApiKey(${k.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addApiKeyField() {
  const id = apiKeysList.length ? Math.max(...apiKeysList.map(k => k.id)) + 1 : 1;
  apiKeysList.push({ id, key: '' });
  renderApiKeys();
}

function deleteApiKey(id) {
  apiKeysList = apiKeysList.filter(k => k.id !== id);
  if (apiKeysList.length === 0) apiKeysList.push({ id: 1, key: '' });
  renderApiKeys();
}

// --- Signatory Management ---
let signatories = [];

function loadSignatories() {
  const raw = localStorage.getItem('gpf-signatories');
  if (raw) {
    signatories = JSON.parse(raw);
  } else {
    signatories = [{ id: 1, name: 'Subhendra Pattanaik', desg: 'Superintendent(Admin/DDO)', office: 'Customs(Prev.) Commissionerate, Bhubaneswar', active: true }];
    saveSignatories();
  }
  renderSignatories();
  populateSigDropdown();
}

function saveSignatories() {
  localStorage.setItem('gpf-signatories', JSON.stringify(signatories));
}

function renderSignatories() {
  const list = document.getElementById('sig-list');
  list.innerHTML = signatories.map(s => `
    <div class="sig-card ${s.active ? 'active-sig' : ''}">
      <input type="radio" name="active-sig" ${s.active ? 'checked' : ''} onchange="setActiveSig(${s.id})">
      <div class="sig-info">
        <div class="name">${s.name}</div>
        <div class="desg">${s.desg}, ${s.office}</div>
      </div>
      <div class="sig-actions">
        <button class="btn btn-outline btn-sm" onclick="editSig(${s.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSig(${s.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function populateSigDropdown() {
  const sel = document.getElementById('c-signatory');
  if (!sel) return;
  sel.innerHTML = signatories.map(s => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${s.name} — ${s.desg}</option>`).join('');
}

function setActiveSig(id) {
  signatories.forEach(s => s.active = s.id === id);
  saveSignatories();
  renderSignatories();
  populateSigDropdown();
}

function openSigModal(editId) {
  document.getElementById('sig-modal').classList.add('show');
  if (editId) {
    const s = signatories.find(x => x.id === editId);
    document.getElementById('m-sig-name').value = s.name;
    document.getElementById('m-sig-desg').value = s.desg;
    document.getElementById('m-sig-office').value = s.office;
    document.getElementById('m-sig-id').value = editId;
    document.getElementById('sig-modal-title').textContent = 'Signatory সম্পাদনা করুন';
  } else {
    document.getElementById('m-sig-name').value = '';
    document.getElementById('m-sig-desg').value = '';
    document.getElementById('m-sig-office').value = '';
    document.getElementById('m-sig-id').value = '';
    document.getElementById('sig-modal-title').textContent = 'নতুন Signatory যোগ করুন';
  }
}

function closeSigModal() {
  document.getElementById('sig-modal').classList.remove('show');
}

function editSig(id) { openSigModal(id); }

function deleteSig(id) {
  if (signatories.length <= 1) return toast('কমপক্ষে একজন signatory থাকতে হবে', 'error');
  signatories = signatories.filter(s => s.id !== id);
  if (!signatories.find(s => s.active)) signatories[0].active = true;
  saveSignatories(); renderSignatories(); populateSigDropdown();
}

function saveSig() {
  const name = document.getElementById('m-sig-name').value.trim();
  const desg = document.getElementById('m-sig-desg').value.trim();
  const office = document.getElementById('m-sig-office').value.trim();
  const editId = document.getElementById('m-sig-id').value;
  if (!name || !desg) return toast('Name ও Designation আবশ্যক', 'error');
  if (editId) {
    const s = signatories.find(x => x.id === parseInt(editId));
    s.name = name; s.desg = desg; s.office = office;
  } else {
    const id = signatories.length ? Math.max(...signatories.map(s => s.id)) + 1 : 1;
    signatories.push({ id, name, desg, office, active: signatories.length === 0 });
  }
  saveSignatories(); renderSignatories(); populateSigDropdown(); closeSigModal();
  toast('Signatory সেভ হয়েছে!');
}

// --- Preview Switching ---
let currentPreview = 'note';

function switchPreview(type) {
  currentPreview = type;
  document.querySelectorAll('.prev-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.prev === type));
  updatePreview();
}

// --- Purpose-Rule Mapping ---
const GPF_RULES = {
  betrothal_marriage: {
    rule: 'Rule 15(1)(A)(b)', clause: '(b)', clauseRef: 'sub-clause (b) of Clause (A)',
    purpose: 'Betrothal/Marriage',
    purposeOrder: 'to enable him to meet the obligatory expenses in connection with betrothal/marriage',
    desc: 'a subscriber who has completed ten years of service (including broken periods of service, if any) or is within ten years before the date of his retirement on superannuation, whichever is earlier, may withdraw from the amount standing to his credit in the Fund for one or more of the following purposes, namely, "meeting the obligatory expenses in connection with betrothal or marriage, funeral or other ceremony of the subscriber, his family member or any other relation dependent on him"',
    fraction: 0.75, fractionText: 'three-fourth'
  },
  education: {
    rule: 'Rule 15(1)(A)(a)', clause: '(a)', clauseRef: 'sub-clause (a) of Clause (A)',
    purpose: 'Education',
    purposeOrder: 'to enable him to meet the cost of higher education of his child/ward',
    desc: 'a subscriber may withdraw for "meeting the cost of higher education, including where necessary the travelling expenses, of any child of the subscriber"',
    fraction: 0.75, fractionText: 'three-fourth'
  },
  illness: {
    rule: 'Rule 15(1)(A)(c)', clause: '(c)', clauseRef: 'sub-clause (c) of Clause (A)',
    purpose: 'Illness',
    purposeOrder: 'to enable him to meet the expenses in connection with illness',
    desc: 'a subscriber may withdraw for "meeting the expenditure in connection with the illness, including where necessary, the travelling expenses of the subscriber or any person actually dependent on him"',
    fraction: 0.75, fractionText: 'three-fourth'
  },
  house_build: {
    rule: 'Rule 15(1)(B)', clause: '(B)', clauseRef: 'Clause (B)',
    purpose: 'House Building/Purchase',
    purposeOrder: 'to enable him to meet the cost of purchasing/building a house',
    desc: 'a subscriber may withdraw for "building or acquiring a suitable house or ready built flat for his residence"',
    fraction: 0.90, fractionText: '90%'
  },
  house_repair: {
    rule: 'Rule 15(1)(B)', clause: '(B)', clauseRef: 'Clause (B)',
    purpose: 'House Repair/Renovation',
    purposeOrder: 'to enable him to meet the cost of repairs/renovation of his house',
    desc: 'a subscriber may withdraw for "additions and alterations to or reconstruction of, a house already owned or acquired by a subscriber"',
    fraction: 0.90, fractionText: '90%'
  },
  loan_repay: {
    rule: 'Rule 15(1)(B)', clause: '(B)', clauseRef: 'Clause (B)',
    purpose: 'Repayment of Loan',
    purposeOrder: 'to enable him to repay any outstanding amount of loan',
    desc: 'a subscriber may withdraw for "repaying any outstanding amount on account of a loan expressly taken for building or acquiring a house"',
    fraction: 0.90, fractionText: '90%'
  },
  consumer: {
    rule: 'Rule 15(1)(B)', clause: '(B)', clauseRef: 'Clause (B)',
    purpose: 'Consumer Durables',
    purposeOrder: 'to enable him to purchase consumer durables',
    desc: 'a subscriber may withdraw for purchase of consumer durables as specified',
    fraction: 0.5, fractionText: 'one-half'
  },
  superannuation: {
    rule: 'Rule 15(1)(C)', clause: '(C)', clauseRef: 'Clause (C)',
    purpose: 'Superannuation Withdrawal',
    purposeOrder: 'on the occasion of his retirement on superannuation',
    desc: 'a subscriber may withdraw within twelve months (or as per latest OM, two years) before the date of retirement on superannuation without linking to any purpose',
    fraction: 0.90, fractionText: '90%'
  },
  other: {
    rule: '', clause: '', clauseRef: '',
    purpose: 'Other',
    purposeOrder: '',
    desc: '',
    fraction: 0.75, fractionText: 'three-fourth'
  }
};

let aiAdmissibleFraction = null;
let aiFractionText = null;
let aiRuleDesc = null;


function onPurposeChange() {
  const p = document.getElementById('c-purpose').value;
  const r = GPF_RULES[p];
  if (r && r.rule) document.getElementById('c-rule').value = r.rule;
  calculate();
}

// --- Number Utilities ---
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const u = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function conv(n) {
    if (n < 20) return u[n];
    if (n < 100) return t[Math.floor(n/10)] + (n%10 ? ' '+u[n%10] : '');
    if (n < 1000) return u[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + conv(n%100) : '');
    if (n < 100000) return conv(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + conv(n%1000) : '');
    if (n < 10000000) return conv(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + conv(n%100000) : '');
    return conv(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + conv(n%10000000) : '');
  }
  return conv(Math.abs(Math.floor(num)));
}

function fmtINR(n) {
  const s = Math.abs(Math.floor(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3), rest = s.slice(0,-3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

// --- Auto Calculation ---
function getNum(id) { return parseFloat(document.getElementById(id).value) || 0; }

function calculate() {
  const closing = getNum('c-closing');
  const sub = getNum('c-sub');
  const refund = getNum('c-refund');
  const advance = getNum('c-advance');
  const withdraw = getNum('c-withdraw');
  const amount = getNum('c-amount');
  const net = closing + sub + refund - advance - withdraw;
  const purpose = document.getElementById('c-purpose').value;
  const rule = GPF_RULES[purpose] || GPF_RULES.other;
  
  // Use AI override if available, else use rule default
  const fraction = aiAdmissibleFraction !== null ? aiAdmissibleFraction : rule.fraction;
  const limit = Math.floor(net * fraction);
  const eligible = amount > 0 && amount <= limit;

  document.getElementById('cv-net').textContent = '₹' + fmtINR(net) + '/-';
  document.getElementById('cv-limit').textContent = '₹' + fmtINR(limit) + '/- (' + Math.round(fraction*100) + '%)';
  document.getElementById('cv-req').textContent = amount ? '₹' + fmtINR(amount) + '/-' : '—';
  const eligEl = document.getElementById('cv-elig');
  if (!amount) { eligEl.textContent = '—'; eligEl.className = 'calc-value'; }
  else if (eligible) { eligEl.textContent = '✅ Eligible'; eligEl.className = 'calc-value eligible'; }
  else { eligEl.textContent = '❌ Over Limit'; eligEl.className = 'calc-value not-eligible'; }

  if (amount) document.getElementById('c-amount-words').value = numberToWords(amount) + ' only';
  updatePreview();
}

// --- Auto Save Form Data ---
function saveFormData() {
  const inputs = document.querySelectorAll('#tab-case input, #tab-case select');
  const data = {};
  inputs.forEach(el => {
    if (el.id && el.id !== 'c-amount-words') {
      data[el.id] = el.value;
    }
  });
  localStorage.setItem('gpf-form-data', JSON.stringify(data));
}

function loadFormData() {
  const raw = localStorage.getItem('gpf-form-data');
  if (raw) {
    const data = JSON.parse(raw);
    Object.keys(data).forEach(k => {
      const el = document.getElementById(k);
      if (el) el.value = data[k];
    });
    calculate();
  } else {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('c-sanction-date').value = today;
    document.getElementById('c-accept-date').value = today;
  }
}

// --- RAG: PDF Processing ---
const DB_NAME = 'gpf-rag-db';
const STORE_NAME = 'chunks';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeChunks(chunks) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  chunks.forEach(c => store.add(c));
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
}

async function getChunks() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const log = document.getElementById('pdf-log');
  const bar = document.getElementById('pdf-progress');
  const fill = document.getElementById('pdf-progress-fill');
  if (bar) bar.style.display = 'block';
  if (log) log.textContent = 'PDF পড়া হচ্ছে...';

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
    const totalPages = pdf.numPages;
    const chunks = [];
    let fullText = '';

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const pageText = tc.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
      if (fill) fill.style.width = Math.round(i / totalPages * 100) + '%';
      if (log) log.textContent = `Page ${i}/${totalPages} পড়া হয়েছে...`;
    }

    const words = fullText.split(/\s+/);
    const chunkSize = 500, overlap = 50;
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push({ text: chunkWords.join(' '), index: Math.floor(i / (chunkSize - overlap)) });
    }

    await storeChunks(chunks);
    localStorage.setItem('gpf-manual-info', JSON.stringify({ name: file.name, pages: totalPages, chunks: chunks.length, date: new Date().toISOString() }));
    if (log) log.textContent = `✅ সম্পন্ন! ${totalPages} pages, ${chunks.length} chunks সেভ হয়েছে।`;
    toast('GPF Manual সফলভাবে আপলোড হয়েছে!');
    updateRagStatus();
  } catch (e) {
    if (log) log.textContent = '❌ Error: ' + e.message;
    toast('PDF পড়তে সমস্যা হয়েছে', 'error');
  }
}

function updateRagStatus() {
  const info = localStorage.getItem('gpf-manual-info');
  const statusEl = document.getElementById('rag-status');
  const chunkEl = document.getElementById('chunk-info');
  if (info && statusEl && chunkEl) {
    const d = JSON.parse(info);
    statusEl.innerHTML = `<span class="status-badge ready">✅ Manual আপলোড করা আছে</span>`;
    chunkEl.textContent = `📄 ${d.name} | ${d.pages} pages | ${d.chunks} chunks | আপলোড: ${new Date(d.date).toLocaleDateString('bn-BD')}`;
  } else if (statusEl && chunkEl) {
    statusEl.innerHTML = `<span class="status-badge empty">❌ কোনো Manual আপলোড নেই</span>`;
    chunkEl.textContent = 'কোনো manual আপলোড করা হয়নি।';
  }
}

async function clearManual() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  localStorage.removeItem('gpf-manual-info');
  updateRagStatus();
  toast('Manual মুছে ফেলা হয়েছে');
}


async function fetchWithRotatingKey(prompt, type="json") {
  const rawKeys = localStorage.getItem('gpf-api-keys');
  let keys = [];
  if (rawKeys) {
    const arr = JSON.parse(rawKeys);
    keys = arr.map(k => k.key).filter(k => k);
  }
  
  if (keys.length === 0) {
    throw new Error('কোনো API key পাওয়া যায়নি। Settings-এ গিয়ে API key দিন।');
  }
  const selectedModel = getSetting('s-ai-model') || 'gemini-1.5-flash';
  
  let errors = [];
  for (let i = 0; i < keys.length; i++) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${keys[i]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: type === "json" ? "application/json" : "text/plain" }
        })
      });
      
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      let msg = e.message;
      if (msg.toLowerCase().includes('quota exceeded') || msg.includes('429')) msg = 'Quota Exceeded';
      const keyStr = keys[i] || '';
      const maskedKey = keyStr.length > 8 ? '...' + keyStr.slice(-4) : '...';
      errors.push(`Key ${i+1} (${maskedKey}): ${msg}`);
      if (i === keys.length - 1) throw new Error(`All keys failed.\n` + errors.join('\n'));
    }
  }
}

async function aiAnalyze() {
  const rawKeys = localStorage.getItem('gpf-api-keys');
  if (!rawKeys || !JSON.parse(rawKeys).some(k => k.key)) return toast('Settings-এ API Key দিন', 'error');

  const purposeKey = document.getElementById('c-purpose').value;
  const userRule = document.getElementById('c-rule').value;
  const amount = getNum('c-amount');
  const closing = getNum('c-closing');
  const sub = getNum('c-sub');
  const refund = getNum('c-refund');
  const advance = getNum('c-advance');
  const withdraw = getNum('c-withdraw');
  const net = closing + sub + refund - advance - withdraw;
  const name = document.getElementById('c-name').value;
  
  const resultEl = document.getElementById('ai-result');
  const analysisCard = document.getElementById('ai-analysis-card');
  const analysisContent = document.getElementById('ai-analysis-content');
  
  resultEl.innerHTML = '<span style="color:var(--blue)">🤖 Gemini is analyzing the rules and eligibility...</span>';
  analysisCard.style.display = 'none';

  let manualContext = '';
  try {
    const chunks = await getChunks();
    if (chunks.length) {
      const pText = GPF_RULES[purposeKey]?.purpose || purposeKey;
      const relevant = chunks.filter(c => {
        const t = c.text.toLowerCase();
        return t.includes('rule 15') || t.includes('rule 16') || t.includes('withdrawal') || t.includes(pText.toLowerCase());
      }).slice(0, 8);
      manualContext = relevant.map(c => c.text).join('\n---\n');
    }
  } catch(e) {}

  const prompt = `You are a Senior GPF Regulatory Officer. Your task is to provide a definitive regulatory ruling for a withdrawal case.

COMPREHENSIVE GPF REGULATORY REFERENCE:
- Rule 15(1)(A): General Withdrawals (Education, Marriage, Illness). 
  * Admissible: 75% of balance. 
  * Criteria: 10 years of service or within 10 years of retirement.
- Rule 15(1)(B): Asset-Related (House Purchase, Construction, Repair, Housing Loan Repayment, Consumer Durables). 
  * Admissible: 90% for House Building/Purchase/Repayment; 50% for Consumer Durables.
  * Criteria: 15 years of service or within 10 years of retirement (Note: House related often liberalized).
- Rule 15(1)(C): Retirement Withdrawal (Superannuation). 
  * Admissible: 90% of balance.
  * Criteria: Within 12 months (standard) or 2 years (liberalized OMs) before superannuation. NO purpose required.
- Rule 16: Admissibility Limits. General limit is 75% unless specified (like 90% for House/Retirement).

IMPORTANT FORMATTING RULES:
1. Conciseness: When identifying 'Posting/Office', ignore long addresses like 'Custom House, Paradeep' or street details. Keep it to the division or commissionerate name only (e.g., 'Paradeep Customs Division').
2. Deduplication: Do not repeat the designation in the posting field.
3. Financial Year: The system automatically calculates the FY (e.g., 2025-26 & 2026-27). Do not worry about this unless the user specifically overrides it.

CASE DETAILS:
- Applicant: ${name || 'The subscriber'}
- Purpose: ${GPF_RULES[purposeKey]?.purpose || purposeKey}
- Rule Provided by Applicant: ${userRule || 'None'}
- Amount Requested: ₹${fmtINR(amount)}/-
- Net GPF Balance: ₹${fmtINR(net)}/-

INSTRUCTIONS:
1. OVERRIDE: Treat the "Rule Provided by Applicant" and "GPF Manual Context" as superior to any app defaults.
2. PURPOSE-BASED RULING: Determine the EXACT sub-clause of Rule 15. If the purpose is unique, find the best fit or use latest OMs.
3. If a user provides a rule and explanation, use it to calculate the fraction (e.g. if they say 90%, use 0.9).

${manualContext ? '\nRELEVANT GPF MANUAL CONTEXT:\n' + manualContext : ''}

Respond ONLY in JSON format:
{
  "ruleMentioned": "Identify rule provided by applicant or state 'None'",
  "originalRuleDetails": "Explain what the mentioned rule actually says",
  "ruleConflictAnalysis": "Analyze validity. Be firm if corrected.",
  "correctApplicableRule": "State the final applicable rule (e.g., Rule 15(1)(A)(b))",
  "amountSanctioningCriteria": "Explain the admissible fraction (e.g., 3/4 or 90%)",
  "eligibilityAdmissibility": "Final ruling on eligibility. DO NOT claim 0 balance if there are credits or transfer-ins mentioned.",
  "isEligible": true,
  "admissibleFraction": 0.9,
  "admissibleAmount": 123456,
  "ruleDescription": "The full legal description of the rule as it should appear in a Note Sheet."
}`;



  try {
    const jsonText = await fetchWithRotatingKey(prompt, "json");
    const r = JSON.parse(jsonText);
    
    // Set AI override for calculation and documentation
    aiAdmissibleFraction = r.admissibleFraction;
    aiFractionText = r.admissibleFraction >= 0.9 ? '90%' : (r.admissibleFraction >= 0.75 ? 'three-fourth' : (Math.round(r.admissibleFraction * 100) + '%'));
    aiRuleDesc = r.ruleDescription;
    
    // Update the input field
    document.getElementById('c-rule').value = r.correctApplicableRule;
    
    // Update the analysis card
    analysisCard.style.display = 'block';
    analysisContent.innerHTML = `
      <div class="ai-section">
        <div class="ai-section-label">Rule Mentioned by Applicant</div>
        <div class="ai-section-value">${r.ruleMentioned}</div>
      </div>
      <div class="ai-section">
        <div class="ai-section-label">Original Rule Details (Applicant's Rule)</div>
        <div class="ai-section-value">${r.originalRuleDetails}</div>
      </div>
      ${r.ruleConflictAnalysis.toLowerCase().includes('no conflict') ? '' : `
      <div class="ai-conflict-warning">
        <strong>⚠️ Rule Conflict/Correction:</strong> ${r.ruleConflictAnalysis}
      </div>
      `}
      <div class="ai-section">
        <div class="ai-section-label">Correct Applicable Rule</div>
        <div class="ai-section-value"><strong>${r.correctApplicableRule}</strong></div>
      </div>
      <div class="ai-section">
        <div class="ai-section-label">Amount Sanctioning Criteria</div>
        <div class="ai-section-value">${r.amountSanctioningCriteria}</div>
      </div>
      <div class="ai-status-box ${r.isEligible ? 'ai-status-eligible' : 'ai-status-ineligible'}">
        ${r.isEligible ? '✅' : '❌'} ${r.eligibilityAdmissibility}
      </div>
      <div style="font-size:12px; color:var(--text-muted); border-top:1px solid var(--border); padding-top:10px;">
        Maximum Admissible: ₹${fmtINR(r.admissibleAmount)}/- (${Math.round(r.admissibleFraction * 100)}%)
      </div>
    `;
    
    resultEl.innerHTML = '<span style="color:var(--green)">✅ AI Analysis completed successfully.</span>';
    calculate();
    toast('AI Rule Analysis সম্পন্ন!');
  } catch(e) {
    resultEl.innerHTML = `<span style="color:var(--red)">❌ Error: ${e.message}</span>`;
    toast('AI Analysis ব্যর্থ হয়েছে', 'error');
  }
}

async function aiAutoFill() {
  const rawText = document.getElementById('ai-chat-input').value.trim();
  if (!rawText) return toast('আগে টেক্সট পেস্ট করুন', 'error');
  const resultEl = document.getElementById('ai-chat-result');
  resultEl.innerHTML = '<span style="color:var(--blue)">🤖 AI is reading your application...</span>';

  let manualContext = '';
  try {
    const chunks = await getChunks();
    if (chunks.length) manualContext = chunks.slice(0, 5).map(c => c.text).join('\n---\n');
  } catch(e) {}

  const prompt = `You are a high-precision data extractor for a GPF application form.
Parse the following raw application text and map it to the form fields.

IMPORTANT INSTRUCTIONS:
1. BALANCE CALCULATION (CRITICAL): 
   - "Closing Balance (Prev. Year)" (c-closing) is the starting point. 
   - If the text says "Closing Balance: 0" but also mentions a "Transfer-in" of 80 Lakhs, DO NOT set c-closing to 0. Set c-closing to the Transfer-in amount (8797991 in this case). 
   - Treat any "Opening Balance", "Transfer-in", or "Balance as on [Date]" as the base for c-closing.
2. NET BALANCE LOGIC: The system calculates Net = c-closing + c-sub + c-refund - c-advance - c-withdraw. Ensure your mapping makes this Net balance match what is in the text.
3. Purpose mapping: Map to one of: betrothal_marriage, education, illness, house_build, house_repair, loan_repay, consumer, superannuation, other.
4. IDENTITY CONCISENESS: For 'c-posting', ignore long addresses. Keep it only to the name of the Division or Commissionerate.
5. DEDUPLICATION: Ensure 'c-desg' (Designation) is not repeated inside 'c-posting'.
6. If the text says "Amount Requested: 80,00,000", set c-amount to 8000000.

Raw Input: "${rawText}"

${manualContext ? 'GPF Manual context:\n' + manualContext : ''}

Return ONLY JSON mapping to: c-name, c-prefix, c-desg, c-posted, c-posting, c-gpf-ac, c-purpose, c-amount, c-closing, c-sub, c-rule.`;


  try {
    const jsonText = await fetchWithRotatingKey(prompt, "json");
    const result = JSON.parse(jsonText);
    for (const [id, value] of Object.entries(result)) {
      const el = document.getElementById(id);
      if (el) el.value = value;
    }
    calculate();
    saveFormData();
    resultEl.innerHTML = `<span style="color:var(--green)">✅ Auto-filled! Review the details and run AI Analysis for full validation.</span>`;
    toast('Auto-fill সম্পন্ন!');
  } catch(e) {
    resultEl.innerHTML = `<span style="color:var(--red)">❌ Error: ${e.message}</span>`;
  }
}

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_LETTERHEAD') {
      const lh = event.data.payload;
      if (lh.l1) document.getElementById('s-lh-line1').value = lh.l1;
      if (lh.l2) document.getElementById('s-lh-line2').value = lh.l2;
      if (lh.l3) document.getElementById('s-lh-line3').value = lh.l3;
      if (lh.l4) document.getElementById('s-lh-line4').value = lh.l4;
      if (lh.l5) document.getElementById('s-lh-line5').value = lh.l5;
      if (lh.l6) document.getElementById('s-lh-line6').value = lh.l6;
      if (lh.logo1 || lh.logo2 || lh.logo3) {
         document.getElementById('s-use-letterhead').value = 'yes';
         toggleLetterheadFields();
      }
      saveSettings();
    }
  });

  loadTheme();
  loadSettings();
  loadApiKeys();
  loadSignatories();
  updateRagStatus();
  loadFormData();
  
  document.querySelectorAll('#tab-case input, #tab-case select').forEach(el => {
    el.addEventListener('input', () => { saveFormData(); calculate(); });
    el.addEventListener('change', () => { saveFormData(); calculate(); });
  });
});
