/* ===== GPF App - Preview, DOCX Generation & RAG ===== */

// --- Note Sheet Text Generation ---
function generateNoteText() {
  const prefix = document.getElementById('c-prefix').value;
  const name = document.getElementById('c-name').value || '[Name]';
  const desg = document.getElementById('c-desg').value || '[Designation]';
  const group = document.getElementById('c-group').value;
  const posted = document.getElementById('c-posted').value || '[Posted At]';
  const gpfAc = document.getElementById('c-gpf-ac').value || '[GPF A/c]';
  const amount = getNum('c-amount');
  const amountWords = document.getElementById('c-amount-words').value || '[Amount in Words]';
  const purpose = document.getElementById('c-purpose').value;
  const rule = GPF_RULES[purpose] || GPF_RULES.other;
  const ruleRef = document.getElementById('c-rule').value || rule.rule;
  const noteNo = document.getElementById('c-note-no').value || '62';
  const closing = getNum('c-closing');
  const sub = getNum('c-sub');
  const refund = getNum('c-refund');
  const advance = getNum('c-advance');
  const withdraw = getNum('c-withdraw');
  const net = closing + sub + refund - advance - withdraw;
  const limit = Math.floor(net * rule.fraction);
  const hod = getSetting('s-hod') || 'HOD';
  const officeShort = getSetting('s-office-short') || '[Office]';
  const prepName = getSetting('s-prep-name') || 'SAIKAT MONDAL';
  const prepDesg = getSetting('s-prep-desg') || 'EXECUTIVE ASSISTANT';

  return `Note # ${noteNo}
Submitted:-
  This office has received 01 (one) Application for GPF withdrawal as follows:-
Sl.No.\tName/ Designation\tGPF Ac/ No\tGPF Withdrawal (Rs.) and Purpose\tGPF Balance (Rs.)\tRemarks
1\t${prefix} ${name}, ${desg} ${group}, ${officeShort}\t${gpfAc}\t${fmtINR(amount)}/- (${rule.purpose})\t${fmtINR(net)}/-\tUnder GPF (CS) Rules, 1960 – ${ruleRef}

  As per ${ruleRef} of the General Provident Fund (Central Services) Rules, 1960, ${rule.desc}. In the present case, ${prefix} ${name}, ${desg} ${group}, has applied for withdrawal of Rs. ${fmtINR(amount)}/- (Rupees ${amountWords}) for the above purpose.
  As laid down in Note 1(i) below Rule 15, a subscriber may be permitted to withdraw an amount not exceeding ${rule.fractionText} of the amount standing at credit under ${rule.clauseRef}. The amount applied for is well within ${rule.fractionText} of the balance at credit in his GPF account (${Math.round(rule.fraction*100)}% of ₹${fmtINR(net)}/- = ₹${fmtINR(limit)}/-), which is the maximum limit admissible under the said rule. Accordingly, the competent authority, i.e. the ${hod}, may kindly sanction GPF withdrawal of Rs. ${fmtINR(amount)}/- (Rupees ${amountWords}) in favour of ${prefix} ${name}, ${desg} ${group}, under ${ruleRef} of the GPF (CS) Rules, 1960.
  स्वीकृति और मंजूरी के लिए प्रस्तुत है।
  Put up for your kind approval and sanction please.

${new Date().toLocaleDateString('en-IN')}
${prepName}
${prepDesg}`;
}

// --- Order (Form 4A) Text Generation ---
function generateOrderText() {
  const prefix = document.getElementById('c-prefix').value;
  const name = document.getElementById('c-name').value || '[Name]';
  const desg = document.getElementById('c-desg').value || '[Designation]';
  const posted = document.getElementById('c-posted').value || '[Posted At]';
  const gpfAc = document.getElementById('c-gpf-ac').value || '[GPF A/c]';
  const amount = getNum('c-amount');
  const amountWords = document.getElementById('c-amount-words').value || '[Amount in Words]';
  const purpose = document.getElementById('c-purpose').value;
  const rule = GPF_RULES[purpose] || GPF_RULES.other;
  const ruleRef = document.getElementById('c-rule').value || rule.rule;
  const fileNo = document.getElementById('c-fileno').value || '[File No.]';
  const balYear = document.getElementById('c-bal-year').value || '[Year]';
  const closing = getNum('c-closing');
  const sub = getNum('c-sub');
  const subPeriod = document.getElementById('c-sub-period').value || '[Period]';
  const refund = getNum('c-refund');
  const advance = getNum('c-advance');
  const withdraw = getNum('c-withdraw');
  const net = closing + sub + refund - advance - withdraw;
  const sanctionDate = document.getElementById('c-sanction-date').value;
  const restrictMonths = getNum('c-restrict') || 6;
  const officeShort = getSetting('s-office-short') || '[Office]';
  const hod = getSetting('s-hod') || '[HOD]';
  const pao = getSetting('s-pao') || '[PAO]';
  const paoCopy = getSetting('s-pao-copy') || '[PAO Copy]';

  // Get selected signatory
  const sigId = parseInt(document.getElementById('c-signatory').value);
  const sig = signatories.find(s => s.id === sigId) || signatories[0] || { name: '[Signatory]', desg: '[Designation]', office: '[Office]' };

  // Restriction end date
  let restrictEnd = '';
  if (sanctionDate) {
    const d = new Date(sanctionDate);
    d.setMonth(d.getMonth() + restrictMonths);
    restrictEnd = d.toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  const sanctionDateFmt = sanctionDate ? new Date(sanctionDate).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '[Date]';
  const monthStr = sanctionDate ? new Date(sanctionDate).toLocaleDateString('en-IN', { month:'2-digit', year:'numeric' }) : '[MM/YYYY]';
  
  let headerText = '';
  if (getSetting('s-use-letterhead') === 'yes') {
      const l1 = getSetting('s-lh-line1') || '';
      const l2 = getSetting('s-lh-line2') || '';
      const l3 = getSetting('s-lh-line3') || '';
      const l4 = getSetting('s-lh-line4') || '';
      const l5 = getSetting('s-lh-line5') || '';
      const l6 = getSetting('s-lh-line6') || '';
      headerText = `[LETTERHEAD]
${l1}
${l2}
${l3}
${l4}
${l5}
${l6}
--------------------------------------------------------------------------------

`;
  } else {
      const headerSpaceLines = parseInt(getSetting('s-header-space')) || 6;
      let blankLines = '';
      for(let i=0; i<headerSpaceLines; i++) blankLines += '\n';
      headerText = blankLines;
  }

  return `${headerText}FORM 4A
PROFORMA FOR SANCTIONING WITHDRAWALS FROM PROVIDENT FUND
F. No.- ${fileNo}
To,
${pao}
Sir,
  I am directed to convey sanction of the Competent Authority (i.e. the ${hod.toLowerCase()}) under ${ruleRef} of the General Provident Fund (Civil Services) Rules, 1960 or under rule …………….. of Contributory Provident Fund Rules (India), 1962 , to the withdrawal of a sum of Rs ${fmtINR(amount)}/- (Rupees ${amountWords}) by ${prefix} ${name}, ${desg}, ${posted}, ${officeShort} from his Account No. ${gpfAc} ${rule.purposeOrder}.
2. It is certified that the conditions for withdrawal as specified in General Provident Fund (Civil Services) Rules, 1960 have been met.
3. Balance at credit of the subscriber on the date of application is given below:-
(i) Closing balance as per statement for the year ${balYear} - Rs ${fmtINR(closing)}/-
(ii) Credit from ${subPeriod} on account of monthly subscription - Rs ${fmtINR(sub)}/-
(iii) Refunds from ${subPeriod} - ${refund ? 'Rs ' + fmtINR(refund) + '/-' : 'NIL'}
(iv) Amount of Advance drawn between ${subPeriod} - ${advance ? 'Rs ' + fmtINR(advance) + '/-' : 'NIL'}
(v) Withdrawals taken between ${subPeriod} - ${withdraw ? 'Rs ' + fmtINR(withdraw) + '/-' : 'NIL'}
(vi) Net balance at credit - Rs ${fmtINR(net)}/-
4. The above mentioned officer cannot undertake GPF withdrawal for the next ${String(restrictMonths).padStart(2,'0')} months i.e. ${restrictEnd} in the financial year ${getFinYear(sanctionDate)}.
5. This issues with the concurrence of the ${hod} on dated ${sanctionDateFmt}.
Yours faithfully,
(${sig.name})
${sig.desg}
${sig.office}
C. No.- ${fileNo}/Dated : /${monthStr}
Copy forwarded to :-
1. DDO/Bill Unit (in duplicate), ${officeShort}.
2. ${prefix} ${name}, ${desg}, ${posted}, ${officeShort} for kind information.
3. ${paoCopy}`;
}

// --- Identity Formatting & Deduplication ---
function cleanPosting(p) {
  if (!p) return '';
  // Remove common redundant address parts
  return p.split(',').map(s => s.trim()).filter(s => {
    const low = s.toLowerCase();
    return !low.includes('custom house') && !low.includes('customs house') && !low.includes('bhubaneswar') && !low.includes('paradeep');
  }).join(', ');
}

function formatIdentity(prefix, name, desg, posting, postedAt, includeDesignation = true) {
  let parts = [];
  const fullName = (prefix + ' ' + name).trim();
  parts.push(fullName);

  if (includeDesignation && desg) {
    parts.push(desg.trim());
  }

  // Deduplicate posting vs designation
  let p = posting ? posting.trim() : '';
  if (desg && p.toLowerCase() === desg.toLowerCase()) p = '';
  
  // Deduplicate postedAt vs posting
  let pa = postedAt ? postedAt.trim() : '';
  if (p && pa.toLowerCase() === p.toLowerCase()) pa = '';
  if (desg && pa.toLowerCase() === desg.toLowerCase()) pa = '';

  if (pa) parts.push(pa);
  if (p) {
    // If it's a long office name, maybe just keep the main part
    const cleanP = p.split(',')[0].trim();
    if (!parts.some(x => x.toLowerCase().includes(cleanP.toLowerCase()))) {
      parts.push(p);
    }
  }

  // Join with comma, but ensure no double commas or trailing commas
  return parts.filter(x => x).join(', ');
}

function getFinYear(dateStr) {

  if (!dateStr) return '[FY]';
  const d = new Date(dateStr);
  const y = d.getFullYear(), m = d.getMonth();
  return m >= 3 ? y + '-' + String(y+1).slice(2) : (y-1) + '-' + String(y).slice(2);
}
function getRestrictionFY(sanctionDate, months) {
  if (!sanctionDate) return '[FY]';
  const override = document.getElementById('c-fin-year') && document.getElementById('c-fin-year').value.trim();
  if (override) return override;
  const endD = new Date(sanctionDate);
  endD.setMonth(endD.getMonth() + months);
  const fyStart = getFinYear(sanctionDate);
  const fyEnd   = getFinYear(endD.toISOString().split('T')[0]);
  return fyStart === fyEnd ? fyEnd : fyStart + ' & ' + fyEnd;
}

// --- Preview ---
function updatePreview() {
  const box = document.getElementById('preview-box');
  try {
    box.textContent = currentPreview === 'note' ? generateNoteText() : generateOrderText();
  } catch(e) {
    box.textContent = 'ফর্ম পূরণ করলে এখানে preview দেখা যাবে।';
  }
}

// --- Exact DOCX Generation ---
function makeDocxParagraphs(text) {
  const { Paragraph, TextRun, AlignmentType } = docx;
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    // ---- Empty / blank line → small spacer paragraph ----
    if (trimmed === '') {
      return new Paragraph({
        children: [new TextRun({ text: '', font: 'Times New Roman', size: 24 })],
        spacing: { before: 0, after: 0, line: 240 }
      });
    }

    let alignment = AlignmentType.JUSTIFIED;
    let indent    = undefined;
    let bold      = false;
    let before    = 0;   // twips before paragraph
    let after     = 0;   // twips after paragraph
    let lineVal   = 240; // single spacing (240 = 1×)

    // ---- FORM 4A heading ----
    if (trimmed.startsWith('FORM 4A')) {
      alignment = AlignmentType.CENTER;
      bold      = true;
      before    = 80;
      after     = 0;

    // ---- PROFORMA sub-heading ----
    } else if (trimmed.startsWith('PROFORMA FOR')) {
      alignment = AlignmentType.CENTER;
      bold      = true;
      after     = 160;

    // ---- Note # line ----
    } else if (trimmed.startsWith('Note #')) {
      alignment = AlignmentType.LEFT;
      bold      = true;
      after     = 80;

    // ---- Submitted:- ----
    } else if (trimmed.startsWith('Submitted:-') || trimmed.startsWith('Submitted:')) {
      alignment = AlignmentType.LEFT;
      after     = 60;

    // ---- Table header row ----
    } else if (trimmed.startsWith('Sl.No.')) {
      alignment = AlignmentType.LEFT;
      bold      = true;
      after     = 0;

    // ---- F. No. line ----
    } else if (trimmed.startsWith('F. No.') || trimmed.startsWith('C. No.')) {
      alignment = AlignmentType.LEFT;
      before    = 80;

    // ---- To, ----
    } else if (trimmed === 'To,') {
      alignment = AlignmentType.LEFT;
      before    = 80;

    // ---- Sir, ----
    } else if (trimmed === 'Sir,') {
      alignment = AlignmentType.LEFT;
      before    = 80;
      after     = 80;

    // ---- "Yours faithfully," → gap before signature ----
    } else if (trimmed.startsWith('Yours faithfully')) {
      alignment = AlignmentType.LEFT;
      before    = 200;
      after     = 400; // space for signature

    // ---- Signature block: name in brackets, designation, office ----
    } else if (
      (trimmed.startsWith('(') && trimmed.endsWith(')')) ||
      trimmed === getSetting('s-prep-desg') ||
      trimmed === 'EXECUTIVE ASSISTANT' ||
      trimmed.includes('Superintendent(Admin') ||
      trimmed.includes('Superintendent(Admin/DDO)')
    ) {
      alignment = AlignmentType.LEFT;

    // ---- Copy forwarded section ----
    } else if (trimmed.startsWith('Copy forwarded')) {
      alignment = AlignmentType.LEFT;
      before    = 120;

    // ---- Numbered list items (2., 3., (i), (ii) …) ----
    } else if (/^\d+\./.test(trimmed) || /^\([ivx]+\)/.test(trimmed) || /^\([A-Za-z]\)/.test(trimmed)) {
      alignment = AlignmentType.JUSTIFIED;
      indent    = { left: 360, hanging: 360 }; // hanging indent for numbered items

    // ---- Date line (standalone) ----
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      alignment = AlignmentType.LEFT;
      before    = 120;

    // ---- First-line indented paragraph (starts with spaces) ----
    } else if (line.startsWith('  ') || line.startsWith('\t')) {
      alignment = AlignmentType.JUSTIFIED;
      indent    = { firstLine: 720 }; // 0.5 inch first-line indent

    // ---- PAO address lines (inside To block) ----
    } else {
      alignment = AlignmentType.LEFT;
    }

    return new Paragraph({
      children: [new TextRun({
        text: trimmed,
        font: 'Times New Roman',
        size: 24,       // 12pt
        bold: bold
      })],
      alignment: alignment,
      indent: indent,
      spacing: { before: before, after: after, line: lineVal }
    });
  });
}

function createDocx(text, title) {
  const { Document, Packer } = docx;
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          // Standard Government of India office letter margins
          // Top: 1 inch, Bottom: 1 inch, Left: 1.25 inch, Right: 1 inch
          margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 },
          size: { width: 11906, height: 16838 } // A4
        }
      },
      children: makeDocxParagraphs(text)
    }]
  });
  return Packer.toBlob(doc);
}


async function buildNoteDocx() {
  const { Document, Packer, Paragraph, TextRun, AlignmentType,
          Table, TableRow, TableCell, WidthType, BorderStyle } = docx;
  const prefix=document.getElementById('c-prefix').value;
  const name=document.getElementById('c-name').value||'[Name]';
  const desg=document.getElementById('c-desg').value||'[Designation]';
  const posting=document.getElementById('c-posting').value||'';
  const posted=document.getElementById('c-posted').value||'';
  const group=document.getElementById('c-group').value;
  const gpfAc=document.getElementById('c-gpf-ac').value||'[GPF A/c]';
  const amount=getNum('c-amount');
  const amtWords=document.getElementById('c-amount-words').value||'[Amount in Words]';
  const purpose=document.getElementById('c-purpose').value;
  const rule=GPF_RULES[purpose]||GPF_RULES.other;
  const ruleRef=document.getElementById('c-rule').value||rule.rule;
  const noteNo=document.getElementById('c-note-no').value||'62';
  const closing=getNum('c-closing'),sub=getNum('c-sub'),refund=getNum('c-refund');
  const advance=getNum('c-advance'),withdraw=getNum('c-withdraw');
  const net=closing+sub+refund-advance-withdraw;
  
  // Use AI override if available
  const fraction = (typeof aiAdmissibleFraction !== 'undefined' && aiAdmissibleFraction !== null) ? aiAdmissibleFraction : rule.fraction;
  const fractionText = (typeof aiFractionText !== 'undefined' && aiFractionText !== null) ? aiFractionText : rule.fractionText;
  const description = (typeof aiRuleDesc !== 'undefined' && aiRuleDesc !== null) ? aiRuleDesc : rule.desc;
  
  const limit=Math.floor(net*fraction);
  const hod=getSetting('s-hod')||'HOD';
  const officeShort=getSetting('s-office-short')||'[Office]';
  const prepName=getSetting('s-prep-name')||'SAIKAT MONDAL';
  const prepDesg=getSetting('s-prep-desg')||'EXECUTIVE ASSISTANT';
  const F='Times New Roman',SZ=24;
  const TR=(text,o={})=>new TextRun({text,font:F,size:SZ,bold:o.bold||false,underline:o.u?{}:undefined});
  const PP=(ch,o={})=>new Paragraph({children:ch,alignment:o.align||AlignmentType.LEFT,indent:o.indent||undefined,spacing:{before:o.before||0,after:o.after||0,line:240},tabStops:o.ts||[]});
  const thin={style:BorderStyle.SINGLE,size:4,color:'000000'};
  const brd={top:thin,bottom:thin,left:thin,right:thin};
  const HC=(t)=>new TableCell({borders:brd,children:[PP([TR(t,{bold:true})],{before:40,after:40})]});
  const DC=(t)=>new TableCell({borders:brd,children:[PP([TR(t)],{before:40,after:40})]});
  const ch=[];
  ch.push(PP([TR('Note # '+noteNo,{bold:true})],{after:60}));
  ch.push(PP([TR('Submitted:-')],{after:40}));
  ch.push(PP([TR('    This office has received 01 (one) Application for G P F withdrawal as follows:-')],{after:80}));
  
  const fullId = formatIdentity(prefix, name, desg, posting, posted, true);
  
  ch.push(new Table({width:{size:9200,type:WidthType.DXA},rows:[
    new TableRow({children:[HC('Sl.No.'),HC('Name/ Designation'),HC('GPF Ac/ No'),HC('GPF Withdrawal (Rs.) and Purpose'),HC('GPF Balance (Rs.)'),HC('Remarks')]}),
    new TableRow({children:[DC('1'),DC(fullId),DC(gpfAc),DC(fmtINR(amount)+'/-  ('+rule.purpose+')'),DC(fmtINR(net)+'/-'),DC('Under GPF (CS) Rules, 1960 - '+ruleRef)]})
  ]}));
  ch.push(PP([TR('')],{after:60}));
  ch.push(PP([TR('    As per '+ruleRef+' of the General Provident Fund (Central Services) Rules, 1960, '+description+'. In the present case, '+fullId+' has applied for withdrawal of Rs. '+fmtINR(amount)+'/-  (Rupees '+amtWords+') for the above purpose.')],{align:AlignmentType.JUSTIFIED,before:80,after:80}));

  ch.push(PP([TR('    As laid down in Note 1(i) below Rule 15, a subscriber may be permitted to withdraw an amount not exceeding '+fractionText+' of the amount standing at credit under '+rule.clauseRef+'. The amount applied for is well within '+fractionText+' of the balance at credit in his GPF account ('+Math.round(fraction*100)+'% of Rs.'+fmtINR(net)+'/-  = Rs.'+fmtINR(limit)+'/-), which is the maximum limit admissible under the said rule. Accordingly, the competent authority, i.e. the '+hod+', may kindly sanction GPF withdrawal of Rs. '+fmtINR(amount)+'/-  (Rupees '+amtWords+') in favour of '+fullId+', under '+ruleRef+' of the GPF (CS) Rules, 1960.')],{align:AlignmentType.JUSTIFIED,after:80}));

  ch.push(PP([TR('    Put up for your kind approval and sanction please.')],{after:80}));
  const today=new Date().toLocaleString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  ch.push(PP([TR(today)],{before:80}));
  ch.push(PP([TR(prepName)]));
  ch.push(PP([TR(prepDesg)]));
  const doc=new Document({sections:[{properties:{page:{margin:{top:1008,bottom:1008,left:1080,right:1080},size:{width:11906,height:16838}}},children:ch}]});
  return Packer.toBlob(doc);
}

function downloadNote() {
  const name=document.getElementById('c-name').value||'Note';
  buildNoteDocx().then(blob=>{saveAs(blob,'NoteSheet_'+name.replace(/\s+/g,'_')+'.docx');toast('Note Sheet downloaded!');}).catch(e=>toast('Error: '+e.message,'error'));
}

// --- Exact Order (Form 4A) DOCX Builder ---
async function buildOrderDocx() {
  const { Document, Packer, Paragraph, TextRun, AlignmentType,
          Table, TableRow, TableCell, WidthType } = docx;
  const prefix=document.getElementById('c-prefix').value;
  const name=document.getElementById('c-name').value||'[Name]';
  const desg=document.getElementById('c-desg').value||'[Designation]';
  const posting=document.getElementById('c-posting').value||'';
  const posted=document.getElementById('c-posted').value||'';
  const gpfAc=document.getElementById('c-gpf-ac').value||'[GPF A/c]';
  const amount=getNum('c-amount');
  const amtWords=document.getElementById('c-amount-words').value||'[Amount in Words]';
  const purpose=document.getElementById('c-purpose').value;
  const rule=GPF_RULES[purpose]||GPF_RULES.other;
  const ruleRef=document.getElementById('c-rule').value||rule.rule;
  const fileNo=document.getElementById('c-fileno').value||'[File No.]';
  const balYear=document.getElementById('c-bal-year').value||'[Year]';
  const closing=getNum('c-closing'),sub=getNum('c-sub');
  const subPeriod=document.getElementById('c-sub-period').value||'[Period]';
  const refund=getNum('c-refund'),advance=getNum('c-advance'),withdraw=getNum('c-withdraw');
  const net=closing+sub+refund-advance-withdraw;
  const sanctionDate=document.getElementById('c-sanction-date').value;
  const restrictMonths=getNum('c-restrict')||6;
  const officeShort=getSetting('s-office-short')||'[Office]';
  const hod=getSetting('s-hod')||'[HOD]';
  const pao=getSetting('s-pao')||'[PAO]';
  const paoCopy=getSetting('s-pao-copy')||'[PAO Copy]';
  const sigId=parseInt(document.getElementById('c-signatory').value);
  const sig=signatories.find(s=>s.id===sigId)||signatories[0]||{name:'[Sig]',desg:'[Desg]',office:'[Office]'};
  let restrictEnd='';
  if(sanctionDate){const d=new Date(sanctionDate);d.setMonth(d.getMonth()+restrictMonths);restrictEnd=d.toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'});}
  const sanctionDateFmt=sanctionDate?new Date(sanctionDate).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}):'[Date]';
  const monthStr=sanctionDate?new Date(sanctionDate).toLocaleDateString('en-IN',{month:'2-digit',year:'numeric'}):'[MM/YYYY]';
  const acceptRaw=(document.getElementById('c-accept-date')||{}).value||'';
  const acceptDateFmt=acceptRaw?new Date(acceptRaw).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}):sanctionDateFmt;
  const acceptMonthStr=acceptRaw?new Date(acceptRaw).toLocaleDateString('en-IN',{month:'2-digit',year:'numeric'}):monthStr;
  const F='Times New Roman',SZ=24;
  const TR=(text,o={})=>new TextRun({text,font:F,size:SZ,bold:o.bold||false,underline:o.u?{}:undefined});
  const TAB=()=>new TextRun({text:'\t',font:F,size:SZ});
  const PP=(ch,o={})=>new Paragraph({children:ch,alignment:o.align||AlignmentType.LEFT,indent:o.indent||undefined,spacing:{before:o.before||0,after:o.after||0,line:240},tabStops:o.ts||[]});
  const NB={style:'nil',size:0,color:'auto'};
  const NBrd={top:NB,bottom:NB,left:NB,right:NB};
  const noTbl={...NBrd,insideH:NB,insideV:NB};
  const AC=(lines,bold)=>new TableCell({borders:NBrd,children:lines.map(l=>PP([TR(l,{bold:!!bold})],{before:0,after:0}))});
  const ch=[];
  
  if (getSetting('s-use-letterhead') === 'yes') {
      const { ImageRun, BorderStyle, VerticalAlign } = docx;

      function getBase64Buffer(id) {
          const b64 = localStorage.getItem('gpf-' + id);
          if (!b64) return null;
          try {
              const binaryString = window.atob(b64.split(',')[1]);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
              }
              return bytes;
          } catch(e) { return null; }
      }

      const logo1 = getBase64Buffer('s-logo1');
      const logo2 = getBase64Buffer('s-logo2');
      const logo3 = getBase64Buffer('s-logo3');

      const cells = [];
      const imgWidth = 90;
      const imgHeight = 90;
      if (logo1) {
          cells.push(new TableCell({
              borders: { top: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, bottom: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, left: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, right: {style: BorderStyle.SINGLE, size: 1, color: "000000"} },
              children: [new Paragraph({ children: [new ImageRun({ data: logo1, transformation: { width: imgWidth, height: imgHeight } })], alignment: AlignmentType.CENTER })],
              verticalAlign: VerticalAlign.CENTER,
          }));
      }
      if (logo2) {
          cells.push(new TableCell({
              borders: { top: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, bottom: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, left: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, right: {style: BorderStyle.SINGLE, size: 1, color: "000000"} },
              children: [new Paragraph({ children: [new ImageRun({ data: logo2, transformation: { width: imgWidth, height: imgHeight } })], alignment: AlignmentType.CENTER })],
              verticalAlign: VerticalAlign.CENTER,
          }));
      }
      if (logo3) {
          cells.push(new TableCell({
              borders: { top: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, bottom: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, left: {style: BorderStyle.SINGLE, size: 1, color: "000000"}, right: {style: BorderStyle.SINGLE, size: 1, color: "000000"} },
              children: [new Paragraph({ children: [new ImageRun({ data: logo3, transformation: { width: 140, height: 60 } })], alignment: AlignmentType.CENTER })],
              verticalAlign: VerticalAlign.CENTER,
          }));
      }

      if (cells.length > 0) {
          ch.push(new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: { insideV: {style: BorderStyle.SINGLE, size: 1, color: "000000"} },
              rows: [new TableRow({ children: cells })]
          }));
      }

      const l1 = getSetting('s-lh-line1') || '';
      const l2 = getSetting('s-lh-line2') || '';
      const l3 = getSetting('s-lh-line3') || '';
      const l4 = getSetting('s-lh-line4') || '';
      const l5 = getSetting('s-lh-line5') || '';
      const l6 = getSetting('s-lh-line6') || '';

      const addCenterRun = (text, o={}) => {
          if (!text.trim()) return;
          text.split('\n').forEach(line => {
              ch.push(new Paragraph({
                  children: [new TextRun({ text: line.trim(), font: 'Mangal', size: o.size || 24, bold: !!o.bold })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: o.before || 0, after: o.after || 0, line: 200 }
              }));
          });
      };

      addCenterRun(l1, { bold: true, size: 36, before: 60 }); 
      addCenterRun(l2, { bold: true, size: 32 });
      addCenterRun(l3, { bold: true, size: 28 });
      addCenterRun(l4, { bold: true, size: 28 });
      addCenterRun(l5, { bold: true, size: 24 });
      
      if (l6.trim()) {
          ch.push(new Paragraph({
             children: [new TextRun({ text: l6.trim(), font: F, size: 24, bold: true })],
             alignment: AlignmentType.CENTER,
             spacing: { before: 0, after: 60, line: 200 }
          }));
      }

      // Add a horizontal rule (bottom border of a blank paragraph)
      ch.push(new Paragraph({
          children: [],
          border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 12 } },
          spacing: { after: 120 }
      }));
  } else {
      const headerSpaceLines = parseInt(getSetting('s-header-space')) || 6;
      for (let i = 0; i < headerSpaceLines; i++) {
         ch.push(new Paragraph({ children: [TR('')] }));
      }
  }

  ch.push(PP([TR('FORM 4A',{bold:true,u:true})],{align:AlignmentType.CENTER,after:0}));
  ch.push(PP([TR('PROFORMA FOR SANCTIONING WITHDRAWALS FROM PROVIDENT FUND',{bold:true,u:true})],{align:AlignmentType.CENTER,after:80}));
  ch.push(PP([TR('F. No.- '+fileNo,{u:true})],{align:AlignmentType.CENTER,after:60}));
  ch.push(PP([TR('To,')],{after:0}));
  const paoLines=pao.trim().split('\n');
  const rightLines=['MINISTRY OF FINANCE','DEPARTMENT OF REVENUE','OFFICE OF THE COMMISSIONER',officeShort.toUpperCase().split(',')[0].trim()+' COMMISSIONERATE,','BHUBANESWAR.'];
  ch.push(new Table({width:{size:9500,type:WidthType.DXA},borders:noTbl,rows:[new TableRow({children:[
    new TableCell({borders:NBrd,width:{size:6000,type:WidthType.DXA},children:paoLines.map(l=>PP([TR(l)],{before:0,after:0}))}),
    new TableCell({borders:NBrd,width:{size:3500,type:WidthType.DXA},children:rightLines.map(l=>PP([TR(l,{bold:true})],{before:0,after:0}))})
  ]})]}));
  const fullId = formatIdentity(prefix, name, desg, posting, posted, true);

  ch.push(PP([TR('Sir,')],{before:120,after:80}));
  ch.push(new Paragraph({children:[TR('    I am directed to convey sanction of the Competent Authority (i.e. the '),TR(hod.toLowerCase()),TR(') under '),TR(ruleRef,{bold:true}),TR(' of the General Provident Fund (Civil Services) Rules, 1960 or under rule .......... of Contributory Provident Fund Rules (India), 1962 , to the withdrawal of a sum of '),TR('Rs '+fmtINR(amount)+'/-  (Rupees '+amtWords+')',{bold:true}),TR(' by '),TR(fullId,{bold:true}),TR(' from his Account '),TR('No.',{bold:true}),TR(' '),TR(gpfAc,{bold:true,u:true}),TR(' '+rule.purposeOrder+'.')],alignment:AlignmentType.JUSTIFIED,spacing:{before:0,after:120,line:240}}));

  const NP=(num,text,o={})=>new Paragraph({children:[TR(num),TAB(),TR(text)],alignment:o.align||AlignmentType.JUSTIFIED,indent:{left:720,hanging:720},spacing:{before:o.before||0,after:o.after||120,line:240},tabStops:[{type:'left',position:720}]});
  ch.push(NP('2.','It is certified that the conditions for withdrawal as specified in General Provident Fund (Civil Services) Rules, 1960 have been met.'));
  ch.push(NP('3.','Balance at credit of the subscriber on the date of application is given below:-',{after:0}));
  const AMT=8200;
  const bal=[['(i)','Closing balance as per statement for the year '+balYear,'- Rs '+fmtINR(closing)+'/-'],['(ii)','Credit from '+subPeriod+' on account of','- Rs '+fmtINR(sub)+'/-'],['','monthly subscription',''],['(iii)','Refunds from '+subPeriod,refund?'- Rs '+fmtINR(refund)+'/-':'- NIL'],['(iv)','Amount of Advance drawn between '+subPeriod,advance?'- Rs '+fmtINR(advance)+'/-':'- NIL'],['(v)','Withdrawals taken between '+subPeriod,withdraw?'- Rs '+fmtINR(withdraw)+'/-':'- NIL'],['(vi)','Net balance at credit','- Rs '+fmtINR(net)+'/-']];
  bal.forEach(([num,label,val])=>{const runs=[];if(num){runs.push(TR(num));runs.push(TAB());}runs.push(TR(label));if(val){runs.push(TAB());runs.push(TR(val));}ch.push(new Paragraph({children:runs,indent:num?{left:1440,hanging:720}:{left:1440},spacing:{before:0,after:0,line:240},tabStops:[{type:'left',position:1440},{type:'right',position:AMT}]}));});
  ch.push(NP('4.','The above mentioned officer cannot undertake GPF withdrawal for the next '+String(restrictMonths).padStart(2,'0')+' months i.e. '+restrictEnd+' in the financial year '+getRestrictionFY(sanctionDate,restrictMonths)+'.',{before:120}));
  ch.push(NP('5.','This issues with the concurrence of the '+hod+' on dated '+acceptDateFmt+'.',{before:0,after:0}));
  // Signature Block aligned right via invisible table
  const sigLines = [
    PP([TR('Yours faithfully,')], { align: AlignmentType.CENTER, before: 300 }),
    new Paragraph({ children: [TR('')], spacing: { before: 0, after: 400, line: 240 } }),
    PP([TR('('+sig.name+')')], { align: AlignmentType.CENTER }),
    PP([TR(sig.desg)], { align: AlignmentType.CENTER })
  ];
  sig.office.split(',').forEach((p, i, a) => {
    const t = p.trim() + (i < a.length - 1 ? ',' : '');
    if (t.replace(',', '').trim()) sigLines.push(PP([TR(t)], { align: AlignmentType.CENTER }));
  });

  ch.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noTbl,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: NBrd,
            children: [new Paragraph("")]
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: NBrd,
            children: sigLines
          })
        ]
      })
    ]
  }));

  ch.push(new Paragraph({children:[TR('C. No.- '+fileNo+'/'),TAB(),TR('Dated :   /'+acceptMonthStr)],spacing:{before:160,after:0,line:240},tabStops:[{type:'right',position:9350}]}));
  ch.push(PP([TR('Copy forwarded to :-')],{before:120}));
  [['DDO/Bill Unit (in duplicate), '+officeShort+'.'],
   [fullId + ' for kind information.'],
   [paoCopy]].forEach((l,i)=>ch.push(new Paragraph({children:[TR((i+1)+'.'),TAB(),TR(l[0])],alignment:AlignmentType.JUSTIFIED,indent:{left:720,hanging:720},spacing:{before:40,after:0,line:240},tabStops:[{type:'left',position:720}]})));

  const doc=new Document({sections:[{properties:{page:{margin:{top:720,bottom:1440,left:1440,right:1440},size:{width:11906,height:16838}}},children:ch}]});
  return Packer.toBlob(doc);
}

function downloadOrder() {
  const name=document.getElementById('c-name').value||'Order';
  buildOrderDocx().then(blob=>{saveAs(blob,'GPF_Order_'+name.replace(/\s+/g,'_')+'.docx');toast('Order downloaded!');}).catch(e=>toast('Error: '+e.message,'error'));
}

