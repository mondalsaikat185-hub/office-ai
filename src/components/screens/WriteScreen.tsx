import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { callGemini, callGeminiStream, RAG } from '../../lib/gemini';
import { Folder, FileText, Bot, PenTool, Mic, Paperclip, X } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, BorderStyle, ImageRun, Table, TableRow, TableCell, WidthType, UnderlineType } from 'docx';
import { Letterhead } from '../../types';
import { defaultTemplates } from '../../lib/defaultTemplates';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function WriteScreen() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') || 'ai';
  const { workspaces, activeWorkspaceId, activeDirectoryId, activeFileId, activeSignatureId, setActiveSignature, saveUserData, saveLetter, letters, drafts, setDraft, templates, phrases, addressBook } = useStore();
  
  const currentDraftId = activeFileId || 'unsaved';
  const draftState = drafts[currentDraftId] || { subject: '', details: '', refText: '', extraIns: '', recipientTo: '', output: '', copyTo: '', salutation: 'Sir/Madam,' };

  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [refText, setRefText] = useState('');
  const [extraIns, setExtraIns] = useState('');
  const [recipientTo, setRecipientTo] = useState('');
  const [copyTo, setCopyTo] = useState('');
  const [enclosures, setEnclosures] = useState('');
  const [salutation, setSalutation] = useState('');
  const [din, setDin] = useState('');
  const [includeDin, setIncludeDin] = useState(false);
  const [styleRefText, setStyleRefText] = useState('');
  const [styleImageBase64, setStyleImageBase64] = useState('');
  const [previewMode, setPreviewMode] = useState<'preview'|'edit'>('preview');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Legal'>('Legal');
  const [outputLang, setOutputLang] = useState<'English' | 'Bengali' | 'Hindi'>('English');
  const [tokensUsed, setTokensUsed] = useState(0);
  const [isTruncated, setIsTruncated] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [uiMessage, setUiMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [magicInput, setMagicInput] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  const handleMagicFill = async () => {
    if (!magicInput) return displayAlert("Please paste some text first!");
    setIsMagicLoading(true);
    try {
      const prompt = `You are a strict data extraction AI. A user pasted a raw document draft.
Your ONLY task is to extract the details WITHOUT modifying, summarizing, altering punctuation, or changing any wording.

Draft:
"""
${magicInput}
"""

Extract into this exact JSON format:
{
  "type": "Determine if it's a 'letter', 'note', or 'order'. Default to 'letter' if unsure.",
  "subject": "EXACT subject line (excluding 'Sub:' or 'Subject:')",
  "salutation": "EXACT salutation if present (e.g., 'Sir/Madam,', 'Dear Sir,'). Leave empty if not.",
  "recipientTo": "EXACT address block of the recipient (exclude 'To,' or 'To'). Preserve line breaks.",
  "refText": "EXACT reference text if present.",
  "details": "The EXACT complete body paragraphs of the text. STRICTLY copy-paste the body content. DO NOT summarize or rewrite."
}
Return ONLY a valid JSON object. No markdown, no backticks, no explanation.`;
      
      const res = await callGemini(prompt, { maxOut: 1500, temp: 0.1 });
      let parsedItem;
      try {
        const jsonMatch = res.text.match(/\{[\s\S]*\}/);
        parsedItem = JSON.parse(jsonMatch ? jsonMatch[0] : res.text);
      } catch (err) {
        throw new Error("AI returned invalid data format.");
      }
      
      if (parsedItem.type && ['letter', 'note', 'order'].includes(parsedItem.type.toLowerCase())) {
         const t = parsedItem.type.toLowerCase();
         if (t === 'letter') {
             setParams({ mode: 'format' });
         } else {
             setParams({ mode: t });
         }
      }
      if (parsedItem.subject) setSubject(parsedItem.subject);
      if (parsedItem.recipientTo) setRecipientTo(parsedItem.recipientTo);
      if (parsedItem.refText) setRefText(parsedItem.refText);
      if (parsedItem.salutation) setSalutation(parsedItem.salutation);
      if (parsedItem.details) setDetails(parsedItem.details);
      
      setMagicInput('');
      displayAlert(`Magic fill successful! Detected type: ${parsedItem.type || 'letter'}`);
    } catch(err: any) {
      displayAlert("Magic fill failed: " + err.message);
    } finally {
      setIsMagicLoading(false);
    }
  };

  const displayAlert = (msg: string) => {
    setUiMessage(msg);
    setTimeout(() => setUiMessage(''), 5000);
  };

  const applyTemplate = (tId: string) => {
    if (!tId) return;
    const allT = [...defaultTemplates, ...templates];
    const t = allT.find(x => x.id === tId) as any;
    if (!t) return;
    if (t.subject) setSubject(t.subject);
    let newDet = '';
    if (t.opening) newDet += t.opening + '\n\n';
    if (t.closing) newDet += '\n\n' + t.closing;
    setDetails(prev => newDet ? newDet : prev);
    if (t.copyTo && t.copyTo.length > 0) {
      setCopyTo(t.copyTo.join('\n'));
    }
  };

  // Load draft from local component mount based on activeFileId
  useEffect(() => {
     const st = drafts[currentDraftId];
     const localSt = localStorage.getItem(`draft_${currentDraftId}`);
     let finalSt = { subject: '', details: '', refText: '', extraIns: '', recipientTo: '', output: '', copyTo: '', enclosures: '', salutation: '', din: '', includeDin: false, styleRefText: '', styleImageBase64: '' };
     if (localSt) {
       try { finalSt = { ...finalSt, ...JSON.parse(localSt) }; } catch(e) {}
     } else if (st) {
       finalSt = { ...finalSt, ...st };
     }
     
     setSubject(finalSt.subject || '');
     setDetails(finalSt.details || '');
     setRefText(finalSt.refText || '');
     setStyleRefText(finalSt.styleRefText || '');
     setStyleImageBase64(finalSt.styleImageBase64 || '');
     setExtraIns(finalSt.extraIns || '');
     setRecipientTo(finalSt.recipientTo || '');
     setCopyTo(finalSt.copyTo || '');
     setEnclosures(finalSt.enclosures || '');
     setSalutation(finalSt.salutation !== undefined && finalSt.salutation !== '' ? finalSt.salutation : 'Sir/Madam,');
     setOutput(finalSt.output || '');
     setIncludeDin(finalSt.includeDin || false);

     // Only load DIN if present, do not auto-generate
     setDin(finalSt.din || '');
  }, [currentDraftId]);

  // Auto-save draft on changes locally
  useEffect(() => {
     const obj = { subject, details, refText, styleRefText, styleImageBase64, extraIns, recipientTo, output, copyTo, enclosures, salutation, din, includeDin };
     setDraft(currentDraftId, obj);
     localStorage.setItem(`draft_${currentDraftId}`, JSON.stringify(obj));
  }, [subject, details, refText, styleRefText, styleImageBase64, extraIns, recipientTo, output, copyTo, enclosures, salutation, din, includeDin, currentDraftId, setDraft]);

  // Handle Smart Reply from Inbox
  useEffect(() => {
    const sourceId = params.get('sourceId');
    const act = params.get('action');
    if (sourceId && act === 'reply') {
       const state = useStore.getState();
       const item = state.inbox.find(x => x.id === sourceId);
       if (item && item.note) {
          if (!refText) setRefText(item.note);
          
          if (item.workspaceId && state.activeWorkspaceId !== item.workspaceId) {
             state.setActiveWorkspace(item.workspaceId);
          }

          const suggMatch = item.note.match(/Suggested Reply: (.*)/);
          if (suggMatch && !details) {
             setDetails(suggMatch[1]);
          } else if (!details) {
             setDetails("Reply to this letter...");
          }
          
          const subjMatch = item.note.match(/Subject: (.*)/);
          if (subjMatch && !subject) setSubject('Reply: ' + subjMatch[1]);
          const senderMatch = item.note.match(/From: (.*)/);
          if (senderMatch && !recipientTo) setRecipientTo(senderMatch[1]);
       }
    }
  }, [params]);

  // Handle editId from History
  useEffect(() => {
    const editId = params.get('editId');
    if (editId) {
       const letter = letters.find(l => l.id === editId);
       if (letter) {
          setSubject(letter.subject || '');
          setDetails(letter.body || '');
          setRecipientTo(letter.body?.match(/To,[\s\S]*?(?=\n\n)/)?.[0]?.replace('To,\n', '') || '');
          setOutput(letter.body || '');
       }
    }
  }, [params]);

  const handleManualSave = async () => {
    try {
      const obj = { subject, details, refText, extraIns, recipientTo, output, copyTo, enclosures, salutation, din, includeDin };
      setDraft(currentDraftId, obj);
      await saveUserData();
      setSaveMessage('Saved to cloud!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      const { tgBotToken, tgChatId } = useStore.getState();
      if (tgBotToken && tgChatId && output) {
        import('../../lib/telegram').then(m => {
          m.sendTelegramNotification(tgBotToken, tgChatId, `📄 *Letter Saved*: ${subject || 'Untitled'}\n\n*Draft length*: ${output.length} characters`);
        });
      }
    } catch(err) {
      setSaveMessage('Local save only (cloud failed)');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to Generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
      // Ctrl/Cmd + S to Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      // Ctrl/Cmd + D to Download
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handlePdfDownload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subject, details, refText, extraIns, recipientTo, output, copyTo, enclosures, salutation]);

  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  const sig = ws?.signatures.find(s => s.id === activeSignatureId);
  const dir = ws?.directories.find(d => d.id === activeDirectoryId);
  const file = dir?.files.find(f => f.id === activeFileId);

  const handleGenerate = async () => {
    if (!ws || !sig) return displayAlert("Please select a workspace and signature first");
    if (!details) return displayAlert("Details/Draft cannot be empty");
    
    setGenerating(true);
    try {
      let prompt = '';
      const allTemplates = [...defaultTemplates, ...templates];
      let templateContext = '';
      if (allTemplates.length > 0) {
         // Only select top 3 templates that have some keyword overlap with the subject or details
         const query = (subject + ' ' + details).toLowerCase();
         const scored = allTemplates.map(t => {
            const tText = (t.name + ' ' + t.subject).toLowerCase();
            const words = tText.split(/\s+/).filter(w => w.length > 3);
            let score = 0;
            for(const w of words) if (query.includes(w)) score++;
            return { t, score };
         }).filter(x => x.score > 0).sort((a,b) => b.score - a.score).slice(0, 3);
         
         if (scored.length > 0) {
            templateContext = `\nAVAILABLE TEMPLATES COLLECTION:\n${scored.map(x => `- [${x.t.name}]: Subject is "${x.t.subject || x.t.name}". Opening: "${x.t.opening || ''}". Closing: "${x.t.closing || ''}"`).join('\n')}\nIf the request matches any of these templates' intent, you MUST strictly use its Opening and Closing phrasing.`;
         }
      }
        
      const styleInstruction = styleRefText || styleImageBase64 ? `\n\n**CRITICAL STYLE REFERENCE INSTRUCTION:**\nThe user has provided a Style Reference (from an older file/doc). You MUST MATCH ITS FORMATTING, LAYOUT, AND STYLE EXACTLY. For example, if the style reference uses a certain column structure for names/designations, YOU MUST create your Markdown Table with those EXACT columns. If the style uses specific phrases (like "placed opposite for your kind perusal", or "benefited notionally with effect from"), adopt those linguistic patterns perfectly.` : '';

      const tableInstruction = `\n- **CRITICAL TABULAR RULE**: IF there are 2 or more officers, individuals, or items mentioned in the details with their respective details (e.g., Sl. No., Name, Designation), YOU MUST STRICTLY FORMAT THAT DATA AS A MARKDOWN TABLE (e.g. | Sl.No. | Name | Designation |). DO NOT output them as plain text lists.`;

      if (mode === 'ai') {
        prompt = `You are an expert Indian Government office correspondence drafter. Write a formal letter following Government of India conventions.

OFFICE: ${ws.office_en || ws.name}
SUBJECT: ${subject}
TO: ${recipientTo || '[recipient]'}
DETAILS / FACTS / INSTRUCTIONS: ${details}
${refText ? 'REFERENCE TEXT AND SOURCE RULES (CRITICAL: You MUST strictly adapt any provided rules, formats, or wordings from this text into your output):\n' + refText : ''}
${extraIns ? 'EXTRA INSTRUCTIONS: ' + extraIns : ''}
${templateContext}${styleInstruction}

OUTPUT FORMAT (plain text only):
- Just the body of the letter
- Use formal Indian government English
- If the REFERENCE TEXT mentions specific rules or standard phrasings, ALWAYS adopt them literally as required.
- DO NOT add letterhead, file number, date, signature block
- DO NOT add "Yours faithfully," or any closing
- DO NOT include the Subject, Salutation (e.g. Sir/Madam), or any introductory greetings. We add them automatically.
- **CRITICAL STYLE RULE**: The tone must be highly formal and polite. Official letters should often start with specific standard formal phrases such as "With due respect, I beg to state that...", "Please refer to...", or "I am directed to inform you that..." (Select the most appropriate formal opening based on the context).
- Be detailed and clear. Explain facts and directives thoroughly. Do not write short, abrupt sentences merely to complete the prompt. Formulate well-rounded paragraphs.${tableInstruction}`;
      } else if (mode === 'format') {
         prompt = `Format the following draft into a clean, properly structured Indian government office letter body. Fix grammar, polish phrasing, structure paragraphs, but DO NOT change facts or meaning. Output plain text only.
- If REFERENCE TEXT is provided, ensure your structure, rule citations, and exact language follows it closely.
- DO NOT add "Yours faithfully," or any closing.
- DO NOT include the Subject, Salutation (e.g. Sir/Madam), or any introductory greetings. We add them automatically.
${refText ? '\nREFERENCE TEXT AND SOURCE RULES (CRITICAL):\n' + refText : ''}
${extraIns ? '\nEXTRA INSTRUCTIONS: ' + extraIns : ''}
${templateContext}${styleInstruction}

DRAFT:
${details}${tableInstruction}`;
      } else if (mode === 'order') {
         prompt = `You are an AI drafting an Official Order (e.g. posting, transfer, permission, grant, sanction) for an Indian Government office. The tone is authoritative, formal, and precise.
FACTS / ORDER DETAILS: ${details}
${refText ? 'REFERENCE: ' + refText : ''}
${extraIns ? 'EXTRA: ' + extraIns : ''}
${templateContext}${styleInstruction}

OUTPUT FORMAT (plain text):
- If the FACTS / ORDER DETAILS provided is already a fully drafted order, DO NOT rewrite it from scratch. Simply correct any grammar issues, polish it, and format it properly using Markdown, while STRICTLY maintaining its original structure, paragraphs, and facts.
- DO NOT INCLUDE ANY FILE NUMBERS OR DATES.
- DO NOT INCLUDE LETTERHEAD, SIGNATURE BLOCK, SUBJECT OR SALUTATIONS in the body text.
- DO NOT start the text with the word "ORDER" or "आदेश".
- DO NOT generate the "Copy to:" list in your output.
- Start directly with the text of the order, e.g. "With reference to...", "In pursuance of...", "Permission is hereby granted..."
- Write clearly and format cleanly. You may use markdown **bold** syntax for names or important dates.${tableInstruction}
- Ensure all directives or references are described clearly and elaborately. Describe facts thoroughly.`;
      } else if (mode === 'note') {
         prompt = `You are an AI drafting an official Note Sheet (internal noting) to a higher authority in an Indian Government office. The tone MUST be extremely polite, courteous, and permission-seeking. You must suggest actions, request permission, or seek approval, but NEVER assume authority (e.g. use "may kindly be approved", "kindly grant permission", "it is respectfully submitted").
SUBJECT: ${subject}
FACTS / PROPOSAL: ${details}
${refText ? 'REFERENCE: ' + refText : ''}
${extraIns ? 'EXTRA: ' + extraIns : ''}
${templateContext}${styleInstruction}

OUTPUT FORMAT (plain text):
- If the FACTS / PROPOSAL provided is already a fully drafted note, DO NOT rewrite it from scratch. Simply polish it and format it properly using Markdown, while STRICTLY maintaining its original paragraph structure, numbering, and facts.
- DO NOT INCLUDE ANY FILE NUMBERS OR DATES.
- DO NOT INCLUDE THE SUBJECT LINE AGAIN. YOU MUST START DIRECTLY WITH SUBMITTED.
- ALWAYS start the very first line with exactly "**Submitted:-**"
- The second line can be a polite summary like "**For kind perusal please:-** (Placed opposite may be seen)" or similar, depending on the context. You may use markdown **bold** syntax.
- Write the main body paragraphs clearly and respectfully. Always refer to higher authorities courteously.${tableInstruction}
- The conclusion MUST explicitly seek permission/approval/guidance depending on the context.
- Conclude with a bolded humble request for orders/approval, e.g., "**Put up for approval / orders, please.**" or "**May kindly grant permission, please.**"
- DO NOT INCLUDE THE SUBJECT AGAIN IF NOT NECESSARY.`;
      }

      const ragQuery = subject + ' ' + details;
      const ragContext = RAG.buildContext(ragQuery);
      if (ragContext) prompt += ragContext;
      
      if (outputLang !== 'English') {
        prompt += `\n\nCRITICAL REQUIREMENT: You MUST generate the finalized content entirely in ${outputLang} language. Do not output English. Maintain official government terminology in ${outputLang}.`;
      }

      setTokensUsed(0);
      setIsTruncated(false);
      setOutput(''); // clear output before streaming
      
      const res = await callGeminiStream(prompt, (chunk) => {
         setOutput(prev => prev + chunk);
      }, { temp: 0.35, maxOut: 16384, imageBase64: styleImageBase64 });
      
      setTokensUsed(res.tokens);
      setIsTruncated(res.truncated);
    } catch (e: any) {
      let msg = e.message || String(e);
      if (msg.includes('Quota')) msg = 'API Quota Exhausted. Please use a different API key or try again later.';
      else if (msg.includes('fetch') || msg.includes('Failed to fetch')) msg = 'Network connection failed. Please check your internet connection.';
      else if (msg.includes('429')) msg = 'Rate limit exceeded. Please wait a moment and try again.';
      displayAlert("Generation Error: " + msg);
      if (!output) setOutput('Generation failed. Please try again.\n\nError Details:\n' + msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleContinueGenerating = async () => {
     setGenerating(true);
     try {
       setIsTruncated(false);
       const lastPortion = output.slice(-800);
       const continuePrompt = `You were drafting an official Indian Government letter/note. 
Continue exactly from where you left off. 
The text so far ends with: "...${lastPortion}"
DO NOT repeat what was already written. Just continue writing the next words seamlessly. DO NOT add "Yours faithfully" or signatures.`;
       
       const res = await callGeminiStream(continuePrompt, (chunk) => {
          setOutput(prev => prev + chunk);
       }, { temp: 0.35, maxOut: 16384 });
       
       setTokensUsed(prev => prev + res.tokens);
       setIsTruncated(res.truncated);
     } catch (e: any) {
       let msg = e.message || String(e);
       if (msg.includes('Quota')) msg = 'API Quota Exhausted. Please use a different API key or try again later.';
       else if (msg.includes('fetch') || msg.includes('Failed to fetch')) msg = 'Network connection failed. Please check your internet connection.';
       displayAlert("Generation Error: " + msg);
     } finally {
       setGenerating(false);
     }
  };

  const handlePdfDownload = () => {
    const element = document.getElementById('print-area');
    if (!element) {
      alert("No content to PDF.");
      return;
    }
    
    const noPdfElements = element.querySelectorAll('.no-pdf');
    noPdfElements.forEach(el => (el as HTMLElement).style.display = 'none');

    // Determine format
    let format = 'a4';
    if (paperSize === 'Legal') format = 'legal';
    if (paperSize === 'A3') format = 'a3';
    
    const opt = {
      margin:       0,
      filename:     `${subject || 'Document'}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: format, orientation: 'portrait' as const }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        noPdfElements.forEach(el => (el as HTMLElement).style.display = '');
        handleSaveToFirebase(true);
    });
  };


  const handleOldWordDownload = () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return displayAlert("No content to export.");
    const isNote = mode === 'note';
    const safeSubject = subject || 'Document';
    const fileName = `${isNote ? 'NoteSheet' : 'Letter'}_${safeSubject.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}_old.doc`;
    
    // Create an HTML blob that MS Word can interpret as a .doc
    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${subject || 'Document'}</title>
        <style>
          body { font-family: "Times New Roman", Times, serif; font-size: 14pt; line-height: 1.5; }
          .font-bold { font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-8 { margin-bottom: 2rem; }
          .mb-16 { margin-bottom: 4rem; }
          .mt-12 { margin-top: 3rem; }
          .ml-4 { margin-left: 1rem; }
          .ml-6 { margin-left: 1.5rem; }
          .ml-12 { margin-left: 3rem; }
          .underline { text-decoration: underline; }
          .min-[1.5em], div[class*="min-h-"] { margin-bottom: 1rem; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .justify-end { justify-content: flex-end; }
          .items-center { align-items: center; }
          .w-full { width: 100%; }
          .whitespace-pre-wrap { white-space: pre-wrap; }
          .indent-12 { text-indent: 3rem; }
          table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { font-weight: bold; }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', htmlString], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setDownloadName(fileName);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    displayAlert("Downloaded Older Word (.doc) version!");
    handleSaveToFirebase(true);
  };

  const handleWordDownload = async () => {
    if (!ws || !sig || !file || !dir || !output) return displayAlert("Ensure workspace, directory, file, and generated text exists.");
    try {
        const children = [];
        const isNote = mode === 'note';
        const isOrder = mode === 'order';

        if(!isNote) {
            if (ws.letterhead) {
               const fetchImageBuf = async (str: string): Promise<{ buf: Uint8Array, width: number, height: number } | null> => {
                  return new Promise((resolve) => {
                     const img = new Image();
                     img.crossOrigin = "Anonymous";
                     img.onload = async () => {
                         try {
                              const res = await fetch(str);
                              const buf = await res.arrayBuffer();
                              const height = 80;
                              const ratio = img.naturalWidth / img.naturalHeight;
                              const width = Math.round(height * ratio);
                              resolve({ buf: new Uint8Array(buf), width, height });
                         } catch(e) { resolve(null); }
                     };
                     img.onerror = () => resolve(null);
                     img.src = str;
                  });
               };
               
               const logo1 = ws.letterhead.logo1 ? await fetchImageBuf(ws.letterhead.logo1) : null;
               const logo2 = ws.letterhead.logo2 ? await fetchImageBuf(ws.letterhead.logo2) : null;
               const logo3 = ws.letterhead.logo3 ? await fetchImageBuf(ws.letterhead.logo3) : null;
               
               if (logo1 || logo2 || logo3) {
                  children.push(new Table({
                     width: { size: 100, type: WidthType.PERCENTAGE },
                     borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
                     rows: [
                        new TableRow({
                           children: [
                              new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: logo1 ? [new ImageRun({ data: logo1.buf, transformation: { width: logo1.width, height: logo1.height }, type: 'png' } as any)] : [] })] }),
                              new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: logo2 ? [new ImageRun({ data: logo2.buf, transformation: { width: logo2.width, height: logo2.height }, type: 'png' } as any)] : [] })] }),
                              new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: logo3 ? [new ImageRun({ data: logo3.buf, transformation: { width: logo3.width, height: logo3.height }, type: 'png' } as any)] : [] })] }),
                           ]
                        })
                     ]
                  }));
               }

               const addCenterRun = (text: string, o: any) => {
                  if (!text || !text.trim()) return;
                  text.split('\n').forEach(line => {
                      if (line.includes('|')) {
                          const [l, r] = line.split('|');
                          children.push(new Table({
                              width: { size: 100, type: WidthType.PERCENTAGE },
                              borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
                              rows: [
                                  new TableRow({
                                      children: [
                                          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: l.trim(), size: o.size || 24, bold: !!o.bold, color: o.color })] })] }),
                                          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: r.trim(), size: o.size || 24, bold: !!o.bold, color: o.color })] })] }),
                                      ]
                                  })
                              ]
                          }));
                      } else {
                          children.push(new Paragraph({
                              children: [new TextRun({ text: line.trim(), size: o.size || 24, bold: !!o.bold, color: o.color })],
                              alignment: AlignmentType.CENTER,
                              spacing: { before: o.before || 0, after: o.after || 0, line: 200 }
                          }));
                      }
                  });
               };
               const pxToHalfPts = (px: number) => Math.max(16, Math.round((px - 3) * 2));
               addCenterRun(ws.letterhead.l1 || '', { bold: true, size: pxToHalfPts(ws.letterhead.s1 || 24), color: ws.letterhead.color || '1A3A8A' }); 
               addCenterRun(ws.letterhead.l2 || '', { bold: true, size: pxToHalfPts(ws.letterhead.s2 || 20), color: ws.letterhead.color || '1A3A8A' });
               addCenterRun(ws.letterhead.l3 || '', { bold: true, size: pxToHalfPts(ws.letterhead.s3 || 16), color: ws.letterhead.color || '1A3A8A' });
               addCenterRun(ws.letterhead.l4 || '', { bold: true, size: pxToHalfPts(ws.letterhead.s4 || 16), color: ws.letterhead.color || '1A3A8A' });
               addCenterRun(ws.letterhead.l5 || '', { bold: true, size: pxToHalfPts(ws.letterhead.s5 || 14), color: ws.letterhead.color || '1A3A8A' });
               addCenterRun(ws.letterhead.l6 || '', { bold: true, size: pxToHalfPts(ws.letterhead.s6 || 14), color: ws.letterhead.color || '1A3A8A' });
            } else {
               if(ws.office_hi) children.push(new Paragraph({children:[new TextRun({text:ws.office_hi, bold:true, size:30})], alignment:AlignmentType.CENTER}));
               children.push(new Paragraph({children:[new TextRun({text:ws.office_en||ws.name, bold:true, size:24, color:'1A3A8A'})], alignment:AlignmentType.CENTER}));
               if(ws.address) children.push(new Paragraph({children:[new TextRun({text:ws.address, size:20})], alignment:AlignmentType.CENTER}));
               if(ws.phone || ws.email) children.push(new Paragraph({children:[new TextRun({text:[ws.phone,ws.email].filter(Boolean).join(' • '), size:20})], alignment:AlignmentType.CENTER}));
            }
            children.push(new Paragraph({
                text: '',
                border: { bottom: { color: ws?.letterhead?.color || '1A3A8A', space: 1, style: BorderStyle.SINGLE, size: 12 } },
                spacing: { after: 200 }
            }));
            children.push(new Paragraph({text:''}));

            if (isOrder) {
               children.push(new Table({
                   width: { size: 100, type: WidthType.PERCENTAGE },
                   borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
                   rows: [
                       new TableRow({
                           children: [
                               new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'C. No. ' + (file.fileNumber || dir.filePrefix || ''), bold: true })] })] }),
                               new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Date: ' + new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), bold: true })] })] })
                           ]
                       })
                   ]
               }));
               children.push(new Paragraph({text:''}));
               if (includeDin && din) {
                   children.push(new Paragraph({
                       children: [new TextRun({ text: 'DIN: ' + din, bold: true })],
                       alignment: AlignmentType.CENTER
                   }));
                   children.push(new Paragraph({text:''}));
               }
               children.push(new Paragraph({
                   children: [new TextRun({ text: 'आदेश / ORDER', bold: true, underline: { type: UnderlineType.SINGLE } })],
                   alignment: AlignmentType.CENTER
               }));
               children.push(new Paragraph({text:''}));
            } else {
               if (includeDin && din) {
                   children.push(new Paragraph({
                       children: [
                           new TextRun({ text: 'DIN: ' + din, bold: true })
                       ],
                       alignment: AlignmentType.RIGHT
                   }));
               }
               // C.No. and Date for Normal Letters
               children.push(new Table({
                   width: { size: 100, type: WidthType.PERCENTAGE },
                   borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
                   rows: [
                       new TableRow({
                           children: [
                               new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'C. No. ' + (file.fileNumber || dir.filePrefix || ''), bold: true })] })] }),
                               new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Date: ' + new Date().toLocaleDateString('en-IN'), bold: true })] })] })
                           ]
                       })
                   ]
               }));
               
               children.push(new Paragraph({text:''}));
               
               if(recipientTo) {
                   children.push(new Paragraph({text:'To,'}));
                   recipientTo.split('\n').forEach(line => children.push(new Paragraph({
                       children: [new TextRun({ text: line })],
                       indent: { left: 720 }
                   })));
                   children.push(new Paragraph({text:''}));
               }
               if (salutation && !isOrder) {
                   children.push(new Paragraph({ text: salutation }));
                   children.push(new Paragraph({text:''}));
               }
               if(subject && !isOrder) children.push(new Paragraph({
                   children: [new TextRun({text:'Sub: '+subject, bold:true, underline:{ type: UnderlineType.SINGLE }})],
                   indent: { left: 720, firstLine: 0 }
               }));
               
               children.push(new Paragraph({text:''}));
            }
        } else {
            // Note Sheet header removed as per request
            if(subject) children.push(new Paragraph({
                children:[new TextRun({text:'Sub: '+subject, bold:true, underline:{ type: UnderlineType.SINGLE }})],
                indent: { left: 720, firstLine: 0 }
            }));
            children.push(new Paragraph({text:''}));
        }

        let docxTableRows: TableRow[] = [];
        let lastWasEmpty = false;

        output.split('\n').forEach((line, index, arr) => {
            if (line.trim().startsWith('|')) {
                lastWasEmpty = false;
                // Table parsing logic
                const isSeparator = line.includes('---');
                if (!isSeparator) {
                    const cols = line.split('|').map(c => c.trim()).filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''));
                    const isTableHeader = docxTableRows.length === 0;
                    const PAGE_WIDTH_DXA = mode === 'note' ? 6866 : 9746;
                    
                    docxTableRows.push(new TableRow({
                        children: cols.map((col) => {
                            // bold parser within col
                            const parts = col.split('**');
                            return new TableCell({
                                width: { size: Math.floor(PAGE_WIDTH_DXA / cols.length), type: WidthType.DXA },
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                                    bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                                    left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                                    right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                                },
                                shading: isTableHeader ? { fill: '1A3A8A' } : undefined,
                                margins: { top: 120, bottom: 120, left: 120, right: 120 },
                                children: [new Paragraph({
                                    children: parts.map((part, pIdx) => new TextRun({
                                        text: part,
                                        bold: isTableHeader || pIdx % 2 !== 0,
                                        size: 24,
                                        color: isTableHeader ? 'FFFFFF' : '000000'
                                    })),
                                    alignment: AlignmentType.LEFT
                                })]
                            });
                        })
                    }));
                }
                
                // If this is the last line or the next line isn't a table, append the table
                if (index === arr.length - 1 || !arr[index + 1].trim().startsWith('|')) {
                    if (docxTableRows.length > 0) {
                        const PAGE_WIDTH_DXA = mode === 'note' ? 6866 : 9746;
                        children.push(new Table({
                            width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
                            rows: docxTableRows
                        }));
                        children.push(new Paragraph({text:''})); // add spacing after table
                        docxTableRows = []; // reset
                    }
                }
            } else if (line.trim()) {
                lastWasEmpty = false;
                const isHeader = line.includes('Submitted') || line.includes('For kind perusal') || line.includes('Put up for');
                const indent = isHeader ? undefined : { firstLine: 720 };
                const alignment = isHeader ? AlignmentType.LEFT : AlignmentType.JUSTIFIED;
                
                // simple markdown bold parser
                if (line.includes('**')) {
                    const parts = line.split('**');
                    children.push(new Paragraph({
                        children: parts.map((part, idx) => new TextRun({ text: part, size: 24, bold: idx % 2 !== 0 || (isHeader && parts.length === 1) })),
                        indent,
                        alignment
                    }));
                } else {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: line, size: 24, bold: isHeader })],
                        indent,
                        alignment
                    }));
                }
            } else {
                if (!lastWasEmpty && index !== 0) {
                    children.push(new Paragraph({ text: '' }));
                    lastWasEmpty = true;
                }
            }
        });
        
        const makeDocxSignatureBlock = (sigName: string, sigDesig: string, sigSection?: string, includeYours: boolean = true, encText?: string) => {
            return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideHorizontal: { style: BorderStyle.NONE, size: 0 }, insideVertical: { style: BorderStyle.NONE, size: 0 } },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ 
                                width: { size: 55, type: WidthType.PERCENTAGE }, 
                                children: [
                                    ...(encText ? [new Paragraph({text: ""}), ...encText.split('\n').map((l, idx) => new Paragraph({ children: [new TextRun({ text: l, bold: idx === 0 })] }))] : [])
                                ] 
                            }),
                            new TableCell({ 
                                width: { size: 45, type: WidthType.PERCENTAGE }, 
                                children: [
                                    ...(includeYours ? [
                                        new Paragraph({children: [new TextRun({text: 'Yours faithfully,'})], alignment: AlignmentType.CENTER}),
                                        new Paragraph({text: ''}),
                                        new Paragraph({text: ''}),
                                        new Paragraph({text: ''})
                                    ] : [
                                        new Paragraph({text: ''}),
                                        new Paragraph({text: ''}),
                                        new Paragraph({text: ''}),
                                        new Paragraph({text: ''})
                                    ]),
                                    new Paragraph({children: [new TextRun({text: '(' + sigName + ')', bold: true})], alignment: AlignmentType.CENTER}),
                                    ...sigDesig.split('\n').filter(Boolean).map(l => new Paragraph({children: [new TextRun({ text: l })], alignment: AlignmentType.CENTER})),
                                    ...(sigSection ? sigSection.split('\n').filter(Boolean).map(l => new Paragraph({children: [new TextRun({ text: l })], alignment: AlignmentType.CENTER})) : [])
                                ] 
                            })
                        ]
                    })
                ]
            });
        };

        if(!isNote) {
            let encString = '';
            if (enclosures) {
                encString = 'Enclosures: ' + enclosures;
            } else if (extraIns.toLowerCase().includes('encl') || output.toLowerCase().includes('encl')) {
                encString = 'Enclosures: As above';
            }
            
            if (isOrder) {
                children.push(makeDocxSignatureBlock(sig.name, sig.designation, sig.section, false, encString || undefined));
            } else {
                children.push(makeDocxSignatureBlock(sig.name, sig.designation, sig.section, true, encString || undefined));
            }

            if (copyTo) {
                children.push(new Paragraph({text:''}));
                children.push(new Paragraph({children:[new TextRun({text:'Copy to:', bold:true})]}));
                const copies = copyTo.split('\n').filter(Boolean);
                copies.forEach((line, idx) => {
                    let text = line.trim();
                    // Auto-remove "Copy to" prefixes from AI if any
                    if (text.toLowerCase().startsWith('copy to')) {
                        text = text.substring(7).trim();
                    }
                    children.push(new Paragraph({
                        text: `${idx + 1}. ${text}`,
                        indent: { left: 720, hanging: 360 }
                    }));
                });
                if (!isOrder) {
                    children.push(new Paragraph({text:''}));
                    children.push(makeDocxSignatureBlock(sig.name, sig.designation, sig.section, false));
                }
            }
        } else {
            // Note sheet signature
            children.push(new Paragraph({text:''}));
            children.push(new Paragraph({children:[new TextRun({text:'('+sig.name+')', bold:true})], alignment:AlignmentType.LEFT}));
            sig.designation.split('\n').filter(Boolean).forEach(line => {
                children.push(new Paragraph({children:[new TextRun({text:line})], alignment:AlignmentType.LEFT}));
            });
            if(sig.section) {
                sig.section.split('\n').filter(Boolean).forEach(line => {
                    children.push(new Paragraph({children:[new TextRun({text:line})], alignment:AlignmentType.LEFT}));
                });
            }
        }

        let pgWidth = 12240; let pgHeight = 20160;
        if (paperSize === 'A4') { pgWidth = 11906; pgHeight = 16838; }
        else if (paperSize === 'A3') { pgWidth = 16838; pgHeight = 23811; }

        const doc = new Document({
            compatibility: {
                version: 11,
            },
            styles: {
                default: {
                    document: {
                        run: {
                            font: "Times New Roman",
                            size: 24,
                        },
                        paragraph: {
                            spacing: {
                                line: 240,
                                lineRule: "auto",
                                before: 0,
                                after: 0
                            }
                        }
                    }
                }
            },
            sections:[{properties:{page:{size:{width:pgWidth, height:pgHeight}, margin: mode === 'note' ? {top:1440, right:1440, bottom:1440, left:3600} : {top:720, right:1080, bottom:720, left:1080}}}, children}]
        });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const fileName = `${isNote?'NoteSheet':'Letter'}_${subject.replace(/[^a-z0-9]/gi,'_').slice(0,40)}_${new Date().toISOString().slice(0,10)}.docx`;
        
        setDownloadUrl(url);
        setDownloadName(fileName);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        displayAlert("Download triggered! If nothing happens, you may need to 'Open in new tab' to allow downloads.");
        handleSaveToFirebase(true);
    } catch(e: any) {
        displayAlert("Failed to generate Word document: " + e.message);
    }
  }

  const handleSaveToFirebase = async (silent = false) => {
    if (!output || !ws || !dir || !file || !sig) {
        if (!silent) displayAlert('Cannot save: missing workspace, directory, file, or signature.');
        return;
    }
    // Check if we just generated this to avoid duplicate spamming
    // But since `id: Date.now().toString(36)`, we will just overwrite if we tracked ID,
    // let's do a simple save.
    try {
        const newLetter = {
            id: Date.now().toString(36),
            workspaceId: ws.id, workspaceName: ws.name,
            directoryId: dir.id, directoryName: dir.name,
            fileId: file.id, fileName: file.name, fileNumber: file.fileNumber,
            subject, mode: mode as any, body: output, bodyHtml: '',
            signatureId: sig.id, signatureName: sig.name, signatureDesig: sig.designation,
            confidentiality: 'routine' as any, recipient: recipientTo, copyTo: copyTo ? copyTo.split('\n') : [], enclosures: '', salutation: '',
            createdAt: Date.now()
        };
        await saveLetter(newLetter);
        if (!silent) displayAlert("Record saved to cloud!");
    } catch (e: any) {
        if (!silent) displayAlert("Save failed: " + e.message);
    }
  };

  return (
    <div className="space-y-4 flex flex-col md:flex-row gap-8 relative">
      {uiMessage && (
        <div className="fixed bottom-4 right-4 z-[99999] bg-red-600 text-white px-6 py-4 border border-red-500 shadow-2xl animate-fade-in break-words max-w-sm text-sm font-bold tracking-widest uppercase shadow-red-500/50">
          {uiMessage}
        </div>
      )}
      {/* Left: Input Form */}
      <div className="flex-1 space-y-6">
        <h2 className="text-[#22C55E] font-bold uppercase tracking-widest text-xs border-b-2 border-black/10 dark:border-white/10 pb-4 flex items-center justify-between">
          Write Editor
          <div className="flex gap-2">
            <button onClick={() => setParams({mode: 'ai'})} className={`px-3 py-1 text-[10px] uppercase font-bold ${mode === 'ai' ? 'bg-[#22C55E] text-black' : 'border border-black/20 dark:border-white/20'}`}>AI Gen</button>
            <button onClick={() => setParams({mode: 'format'})} className={`px-3 py-1 text-[10px] uppercase font-bold ${mode === 'format' ? 'bg-[#22C55E] text-black' : 'border border-black/20 dark:border-white/20'}`}>Format</button>
            <button onClick={() => setParams({mode: 'note'})} className={`px-3 py-1 text-[10px] uppercase font-bold ${mode === 'note' ? 'bg-[#22C55E] text-black' : 'border border-black/20 dark:border-white/20'}`}>Note</button>
            <button onClick={() => setParams({mode: 'order'})} className={`px-3 py-1 text-[10px] uppercase font-bold ${mode === 'order' ? 'bg-[#22C55E] text-black' : 'border border-black/20 dark:border-white/20'}`}>Order</button>
          </div>
        </h2>

        {!ws && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-4 text-sm text-black dark:text-white/70">
            Please setup or select a Workspace from Settings or Header.
          </div>
        )}

        {ws && (
          <div className="mb-4 border border-[#22C55E]/50 bg-[#22C55E]/5 p-3">
             <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E] flex items-center gap-2 mb-2">
                 ⚡ AI Magic Paste (Instantly populate fields)
             </label>
             <textarea 
                value={magicInput} 
                onChange={e => setMagicInput(e.target.value)} 
                className="w-full bg-white/50 dark:bg-black/50 border border-[#22C55E]/30 p-2 text-xs text-black dark:text-white focus:border-[#22C55E] outline-none resize-y min-h-[60px]" 
                placeholder="Paste raw text, draft, or OCR text here. AI will extract Recipient, Subject, Ref, and Body..."
                disabled={isMagicLoading}
             />
             <div className="flex justify-end mt-2">
                <button 
                  onClick={handleMagicFill} 
                  disabled={isMagicLoading || !magicInput}
                  className="bg-[#22C55E] hover:bg-[#1eb354] text-black px-4 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                >
                  {isMagicLoading ? 'Extracting...' : 'Auto-Fill Fields'}
                </button>
             </div>
          </div>
        )}

        {ws && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Signatory Authority</label>
                <select value={activeSignatureId || ''} onChange={e => setActiveSignature(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-xs text-black dark:text-white cursor-pointer outline-none">
                   {(ws.signatures || []).filter(s => s.active).map(s => (
                     <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
                   ))}
                </select>
             </div>
             
             <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Apply Template</label>
                <select onChange={e => applyTemplate(e.target.value)} defaultValue="" className="w-full bg-white dark:bg-neutral-900 border border-amber-500/50 p-2 text-xs text-black dark:text-white cursor-pointer outline-none">
                   <option value="" disabled>-- Select a Template --</option>
                   <optgroup label="Default Templates">
                     {defaultTemplates.map(t => (
                       <option key={t.id} value={t.id}>{t.name}</option>
                     ))}
                   </optgroup>
                   {templates && templates.length > 0 && (
                     <optgroup label="My Templates">
                       {templates.map(t => (
                         <option key={t.id} value={t.id}>{t.name}</option>
                       ))}
                     </optgroup>
                   )}
                </select>
             </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
               <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E] flex items-center gap-2">
                 <input type="checkbox" checked={includeDin} onChange={e => setIncludeDin(e.target.checked)} className="accent-[#22C55E]" />
                 DIN (Document Identification Number)
               </label>
               <button 
                  onClick={() => {
                     setIncludeDin(true);
                     const d = new Date();
                     const y = d.getFullYear();
                     const m = String(d.getMonth() + 1).padStart(2,'0');
                     const random = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
                     setDin(`${y}${m}72ZN${random}`); // Format approximation
                  }}
                  className="px-2 py-1 text-[9px] uppercase font-bold border border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-black transition-colors"
               >
                  Generate Format DIN
               </button>
            </div>
            {includeDin && <input value={din} onChange={e => setDin(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 text-xs text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g. 20240572ZN1234567"/>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/50">Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-3 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="Brief subject line"/>
          </div>

          {mode !== 'note' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/50">Recipient (To)</label>
                  {addressBook && addressBook.length > 0 && (
                    <select
                      onChange={e => {
                        if (e.target.value) {
                          const ab = addressBook.find(a => a.id === e.target.value);
                          if (ab) {
                            setRecipientTo(`${ab.desig}\n${ab.office}\n${ab.address}`);
                            if (ab.salutation) setSalutation(ab.salutation);
                          }
                          e.target.value = '';
                        }
                      }}
                      className="bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-1 text-[10px] outline-none max-w-[150px] cursor-pointer"
                    >
                      <option value="">-- Address Book --</option>
                      {addressBook.map(ab => (
                        <option key={ab.id} value={ab.id}>{ab.name || ab.desig}</option>
                      ))}
                    </select>
                  )}
                </div>
                <textarea value={recipientTo} onChange={e => setRecipientTo(e.target.value)} rows={3} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-3 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g. The Commissioner..."/>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Salutation</label>
                 <select value={salutation} onChange={e => setSalutation(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-xs text-black dark:text-white cursor-pointer outline-none mb-1">
                    <option value="">None</option>
                    <option value="Sir/Madam,">Sir/Madam,</option>
                    <option value="Sir,">Sir,</option>
                    <option value="Madam,">Madam,</option>
                    <option value="Dear Sir,">Dear Sir,</option>
                    <option value="Dear Madam,">Dear Madam,</option>
                    <option value="Respected Sir,">Respected Sir,</option>
                    <option value="Respected Madam,">Respected Madam,</option>
                 </select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/50">Copy To (Forwarding)</label>
                  {addressBook && addressBook.length > 0 && (
                    <select
                      onChange={e => {
                        if (e.target.value) {
                          const ab = addressBook.find(a => a.id === e.target.value);
                          if (ab) {
                            setCopyTo(prev => prev + (prev ? '\n' : '') + `${ab.desig}, ${ab.office}`);
                          }
                          e.target.value = '';
                        }
                      }}
                      className="bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-1 text-[10px] outline-none max-w-[150px] cursor-pointer"
                    >
                      <option value="">-- Address Book --</option>
                      {addressBook.map(ab => (
                        <option key={ab.id} value={ab.id}>{ab.name || ab.desig}</option>
                      ))}
                    </select>
                  )}
                </div>
                <textarea value={copyTo} onChange={e => setCopyTo(e.target.value)} rows={2} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-3 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g. 1. The Secretary...\n2. The District Magistrate..."/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Enclosures</label>
                <input value={enclosures} onChange={e => setEnclosures(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-3 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g. As above, or 1. Copy of Aadhar..."/>
              </div>
            </>
          )}

          <div className="space-y-1 relative">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Details / Facts / Context *</label>
              {(phrases && phrases.length > 0) && (
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] uppercase font-bold text-gray-500">Insert Phrase:</span>
                  <select 
                    onChange={e => { if(e.target.value) { setDetails(prev => prev + (prev ? '\n\n' : '') + e.target.value); e.target.value = ''; } }} 
                    className="bg-white dark:bg-neutral-900 border border-[#22C55E]/50 p-1 text-[10px] outline-none max-w-[150px] cursor-pointer"
                  >
                    <option value="">-- Choose --</option>
                    {phrases.map(p => (
                      <option key={p.id} value={p.text}>{p.category}: {p.text.substring(0, 20)}...</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={6} className="w-full bg-white/50 dark:bg-black/50 border border-[#22C55E]/50 p-3 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="State facts, applicable rules, or just paste rough draft."/>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Reference Text & Rules (Optional)</label>
            <textarea value={refText} onChange={e => setRefText(e.target.value)} rows={3} className="w-full bg-amber-500/10 border border-amber-500/30 p-3 text-black dark:text-white focus:border-amber-500 outline-none" placeholder="Paste specific rules, citations, or instructions the AI must follow exactly..."/>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Style/Format Reference (Optional)</label>
                <div className="relative">
                    <input type="file" accept="image/*" id="styleImageUpload" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                setStyleImageBase64(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                        }
                    }} />
                    <label htmlFor="styleImageUpload" className="flex items-center gap-1 cursor-pointer text-xs bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 px-2 py-1 rounded transition-colors group relative" title="Upload a screenshot or photo of an old letter to match its visual style">
                        <Paperclip size={12} />
                        Attach Image
                    </label>
                </div>
            </div>
            {styleImageBase64 && (
                <div className="relative inline-block mb-2 group">
                    <img src={styleImageBase64} alt="Style Reference" className="h-16 rounded border border-[#22C55E]/30 object-cover" />
                    <button onClick={() => setStyleImageBase64('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                    </button>
                </div>
            )}
            <textarea value={styleRefText} onChange={e => setStyleRefText(e.target.value)} rows={3} className="w-full bg-blue-500/10 border border-blue-500/30 p-3 text-black dark:text-white focus:border-blue-500 outline-none" placeholder="Paste the text of a previous successful letter here to match its tone, format, and structure exactly..."/>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/50">Extra AI Instructions</label>
            <input value={extraIns} onChange={e => setExtraIns(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-3 text-black dark:text-white focus:border-[#22C55E] outline-none" placeholder="e.g. 'Be firm', 'Cite Section 54'"/>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">Output Language</label>
            <select value={outputLang} onChange={(e: any) => setOutputLang(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-3 text-black dark:text-white uppercase text-xs font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 outline-none">
               <option value="English">English</option>
               <option value="Bengali">Bengali / বাংলা</option>
               <option value="Hindi">Hindi / हिन्दी</option>
               <option value="Odia">Odia / ଓଡ଼ିଆ</option>
               <option value="English-Hindi Mixed">English-Hindi Mixed (Govt Style)</option>
            </select>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generating || !details} className="w-full bg-[#22C55E] hover:bg-[#1fb355] text-black font-bold uppercase tracking-widest py-4 transition-colors disabled:opacity-50 mt-4 rounded">
          {generating ? 'Generating...' : '✨ Generate Draft'}
        </button>
        {tokensUsed > 0 && <p className="text-center text-[10px] text-black/50 dark:text-white/50 mt-2 font-mono">Cost: ~{tokensUsed} tokens used</p>}
        {output && <p className="text-center text-[10px] text-black/50 dark:text-white/50 mt-1 font-mono">Word Count: {output.trim().split(/\s+/).length} words</p>}

        <div className="flex items-center justify-between mt-4">
          <button onClick={handleManualSave} className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs px-4 py-2 rounded transition-colors">
            💾 Save to Cloud
          </button>
          {saveMessage && <span className="text-xs text-[#22C55E] font-bold">{saveMessage}</span>}
        </div>
      </div>

      {/* Right: Output Preview */}
      <div className="flex-1 space-y-6 md:sticky md:top-24 self-start relative z-0">
        <h2 className="text-black dark:text-white/40 font-bold uppercase tracking-widest text-xs border-b-2 border-black/10 dark:border-white/10 pb-4">Live Preview</h2>
        
        {output ? (
          <>
            <div className="bg-neutral-200 dark:bg-neutral-800 p-2 sm:p-4 rounded-md overflow-x-auto flex justify-center">
              <div 
                 id="print-area"
                 className="bg-white text-black shadow-2xl relative flex-shrink-0"
                 style={{ width: mode === 'note' ? '216mm' : '210mm', minHeight: mode === 'note' ? '356mm' : '297mm', transform: 'scale(1)', transformOrigin: 'top center' }}
              >
                 <div className={`font-serif text-[12pt] leading-normal outline-none ${mode === 'note' ? 'py-[20mm] pl-[35mm] pr-[20mm]' : 'p-[20mm]'}`}>
                    
                    {/* Dynamic Letterhead for preview */}
                    <div contentEditable={false} className="select-none">
                      {mode !== 'note' && ws?.letterhead && (
                        <div className="relative text-center mb-8 border-b-2 pb-4" style={{ borderColor: ws.letterhead.color ? `#${ws.letterhead.color}` : '#1a3a8a', color: ws.letterhead.color ? `#${ws.letterhead.color}` : '#1a3a8a' }}>
                          
                          <table style={{ width: '100%', marginBottom: '0.5rem', borderCollapse: 'collapse', border: 'none' }}>
                            <tbody>
                              <tr>
                                <td style={{ width: '20%', textAlign: 'left', verticalAlign: 'middle', border: 'none', padding: 0 }}>
                                  {ws.letterhead.logo1 && <img src={ws.letterhead.logo1} className="h-20 object-contain mix-blend-multiply" />}
                                </td>
                                <td style={{ width: '60%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: 0 }}>
                                  {ws.letterhead.logo2 && <img src={ws.letterhead.logo2} className="h-24 object-contain mix-blend-multiply mx-auto" />}
                                </td>
                                <td style={{ width: '20%', textAlign: 'right', verticalAlign: 'middle', border: 'none', padding: 0 }}>
                                  {ws.letterhead.logo3 && <img src={ws.letterhead.logo3} className="h-20 object-contain mix-blend-multiply ml-auto" />}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                          {[1,2,3,4,5,6].map(i => {
                            const lineStr = ws.letterhead?.[`l${i}` as keyof Letterhead] as string;
                            if (!lineStr) return null;
                            const baseSize = ws.letterhead?.[`s${i}` as keyof Letterhead] as number || [24,20,16,16,14,14][i-1] || 16;
                            const actualPt = Math.max(8, baseSize - 3);
                            // 1 pt is ~1.333 px. We use this to make HTML exactly match DOCX scaling.
                            const pxSize = actualPt * 1.333;
                            if (lineStr.includes('|')) {
                               const [l, r] = lineStr.split('|');
                               return (
                                 <table key={i} style={{ width: '100%', fontSize: `${pxSize}px`, lineHeight: '1.15', fontWeight: 'bold', fontFamily: 'sans-serif', borderCollapse: 'collapse', border: 'none' }}>
                                   <tbody>
                                     <tr>
                                       <td style={{ width: '50%', textAlign: 'right', paddingRight: '1rem', border: 'none' }}>{l.trim()}</td>
                                       <td style={{ width: '50%', textAlign: 'left', paddingLeft: '1rem', border: 'none' }}>{r.trim()}</td>
                                     </tr>
                                   </tbody>
                                 </table>
                               );
                            }
                            return <div key={i} className="font-bold font-sans text-center" style={{ fontSize: `${pxSize}px`, lineHeight: '1.15' }}>{lineStr}</div>;
                          })}
                          </div>
                        </div>
                      )}
                      {mode !== 'note' && !ws?.letterhead && (
                        <div className="text-center mb-8 border-b-2 border-[#1a3a8a] pb-4">
                          {ws?.office_hi && <div className="text-xs text-gray-600 font-sans font-bold">{ws.office_hi}</div>}
                          <div className="text-xl font-bold text-[#1a3a8a] font-sans uppercase">{ws?.office_en || ws?.name || 'OFFICE NAME'}</div>
                          {ws?.address && <div className="text-xs text-gray-800 font-sans mt-1">{ws.address}</div>}
                        </div>
                      )}
                      
                      {/* Letter mode specific fields */}
                      {mode === 'order' && (
                        <div className="mb-6 space-y-4">
                           <div className="flex justify-between font-bold mb-4">
                             <span>C. No. {file?.fileNumber || dir?.filePrefix || '[FILE NO]'}</span>
                             <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                           </div>
                           {includeDin && din && <div className="text-center font-bold mb-4 tracking-widest uppercase">DIN: {din}</div>}
                           <div className="text-center font-bold underline text-lg">आदेश / ORDER</div>
                        </div>
                      )}
                      
                      {mode === 'ai' && (
                        <div className="mb-6 space-y-4">
                          <div className="flex justify-between font-bold">
                            <span>C. No. {file?.fileNumber || dir?.filePrefix || '[FILE NO]'}</span>
                            <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                          </div>
                          {includeDin && din && <div className="font-bold tracking-widest uppercase text-right">DIN: {din}</div>}
                          {recipientTo && (
                            <div className="mb-4">
                              <div>To,</div>
                              <div className="whitespace-pre-wrap ml-12">{recipientTo}</div>
                            </div>
                          )}
                          {salutation && <div className="mt-4 mb-4">{salutation}</div>}
                          {subject && <div className="font-bold underline ml-12 mb-4">Sub: {subject}</div>}
                        </div>
                      )}
                      
                      {mode === 'format' && (
                        <div className="mb-6 space-y-4">
                          <div className="flex justify-between font-bold">
                            <span>C. No. {file?.fileNumber || dir?.filePrefix || '[FILE NO]'}</span>
                            <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                          </div>
                          {includeDin && din && <div className="font-bold tracking-widest uppercase text-right">DIN: {din}</div>}
                          {recipientTo && (
                            <div className="mb-4">
                              <div>To,</div>
                              <div className="whitespace-pre-wrap ml-12">{recipientTo}</div>
                            </div>
                          )}
                          {salutation && <div className="mt-4 mb-4">{salutation}</div>}
                          {subject && <div className="font-bold underline ml-12 mb-4">Sub: {subject}</div>}
                        </div>
                      )}
                      
                      {mode === 'note' && (
                        <div className="mb-6 space-y-4">
                          {subject && <div className="font-bold underline ml-12">Sub: {subject}</div>}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end mb-2 opacity-50 hover:opacity-100 transition-opacity print:hidden no-pdf">
                      <button onClick={() => setPreviewMode('preview')} className={`text-[10px] uppercase font-bold px-3 py-1 border border-r-0 border-black/20 dark:border-white/20 ${previewMode === 'preview' ? 'bg-[#22C55E] text-black border-[#22C55E]' : ''}`}>Preview</button>
                      <button onClick={() => setPreviewMode('edit')} className={`text-[10px] uppercase font-bold px-3 py-1 border border-black/20 dark:border-white/20 ${previewMode === 'edit' ? 'bg-[#22C55E] text-black border-[#22C55E]' : ''}`}>Edit Markdown</button>
                    </div>

                    <div className="relative group mb-10">
                      {previewMode === 'edit' ? (
                          <textarea
                              value={output}
                              onChange={(e) => setOutput(e.target.value)}
                              className="w-full min-h-[300px] outline-none bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 p-2 font-mono text-sm block"
                              placeholder="Generated letter body will appear here (Markdown supported)..."
                           />
                      ) : (
                          <div className="text-justify text-[15px] leading-relaxed break-words px-2 font-serif">
                            {output ? (
                              <ReactMarkdown 
                                 remarkPlugins={[remarkGfm]}
                                 components={{
                                    p: ({node, ...props}) => {
                                        const childrenArr = React.Children.toArray(props.children);
                                        const textContent = childrenArr.join('');
                                        const isMainHeaders = typeof textContent === 'string' && (textContent.includes('Submitted') || textContent.includes('For kind perusal') || textContent.includes('Put up for'));
                                        return <p className={`mb-4 ${isMainHeaders ? 'text-left font-bold' : 'indent-12 text-justify'}`} {...props} />;
                                    },
                                    table: ({node, ...props}) => <table className="w-full border-collapse border border-black/50 dark:border-white/50 my-4 table-auto text-[12pt]" {...props} />,
                                    th: ({node, ...props}) => <th className="border border-black/50 dark:border-white/50 p-2 font-bold text-center" {...props} />,
                                    td: ({node, ...props}) => <td className="border border-black/50 dark:border-white/50 p-2" {...props} />,
                                    li: ({node, ...props}) => <li className="ml-8 list-decimal mb-1" {...props} />,
                                    ul: ({node, ...props}) => <ul className="mb-4" {...props} />,
                                    ol: ({node, ...props}) => <ol className="mb-4" {...props} />
                                 }}
                              >
                                {output}
                              </ReactMarkdown>
                            ) : <span className="text-gray-400 italic">Generated letter body will appear here...</span>}
                          </div>
                      )}
                      
                      {isTruncated && !generating && (
                        <div className="absolute -bottom-10 right-0 z-10 w-full flex justify-end print:hidden">
                           <button 
                             onClick={handleContinueGenerating}
                             className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg rounded"
                           >
                              ⚠️ Output Cut Short - Continue Writing
                           </button>
                        </div>
                      )}
                    </div>

                    <div contentEditable={false} className="select-none">
                      {mode !== 'note' && (
                        <>
                          <div className="flex mt-2 mb-4">
                             <div className="w-[55%] text-left">
                                {enclosures ? (
                                  <div className="font-bold text-left mb-8">Enclosures: {enclosures}</div>
                               ) : (extraIns.toLowerCase().includes('encl') || output.toLowerCase().includes('encl')) ? (
                                  <div className="font-bold text-left mb-8">Enclosures: As above</div>
                               ) : null}
                             </div>
                             <div className="w-[45%] flex flex-col items-center text-center">
                                  {mode !== 'order' && <p className="mb-12">Yours faithfully,</p>}
                                  {mode === 'order' && <p className="mb-12"></p>}
                                  <p className="font-bold">({sig?.name})</p>
                                  <p className="whitespace-pre-line">{sig?.designation}</p>
                                  {sig?.section && <p className="whitespace-pre-line">{sig?.section}</p>}
                             </div>
                          </div>
                          

                          {copyTo && (
                             <div className="mt-16 text-left">
                                <p className="font-bold mb-4">Copy to:</p>
                                <div className="ml-4 mb-16">
                                   {copyTo.split('\n').filter(Boolean).map((line, idx) => {
                                      let text = line.trim();
                                      if (text.toLowerCase().startsWith('copy to')) {
                                         text = text.substring(7).trim();
                                      }
                                      return <div key={idx} className="indent-[-1.5rem] pl-6 mb-2">{idx + 1}. {text}</div>;
                                   })}
                                </div>
                                {mode !== 'order' && (
                                   <div className="flex justify-end">
                                      <div className="w-[45%] flex flex-col items-center text-center">
                                         <p className="font-bold">({sig?.name})</p>
                                         <p className="whitespace-pre-line">{sig?.designation}</p>
                                         {sig?.section && <p className="whitespace-pre-line">{sig?.section}</p>}
                                      </div>
                                   </div>
                                )}
                             </div>
                          )}
                        </>
                      )}
                      {mode === 'note' && (
                        <div className="flex justify-start mt-12">
                           <div className="w-[45%] flex flex-col items-start text-left">
                             <p className="font-bold">({sig?.name})</p>
                             <p className="whitespace-pre-line">{sig?.designation}</p>
                             {sig?.section && <p className="whitespace-pre-line">{sig?.section}</p>}
                           </div>
                        </div>
                      )}
                    </div>

                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)} className="w-full bg-white dark:bg-neutral-900 border border-[#22C55E] p-1 text-[10px] text-[#22C55E] outline-none font-bold uppercase tracking-widest cursor-pointer mb-2">
                     <option value="Legal">Legal (8.5x14)</option>
                     <option value="A3">A3 (11.7x16.5)</option>
                     <option value="A4">A4 (8.3x11.7)</option>
                  </select>
                 <button onClick={handleWordDownload} className="w-full border-2 border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-black font-bold uppercase tracking-widest py-3 transition-colors mb-2">
                   Generate Word (.docx)
                 </button>
                 <button onClick={handleOldWordDownload} className="w-full border-2 border-[#22C55E]/50 text-[#22C55E]/80 hover:bg-[#22C55E]/20 font-bold uppercase tracking-widest py-3 transition-colors mb-2 text-[10px]">
                   Word (Older Version 97-2003 .doc)
                 </button>
                 <button onClick={handlePdfDownload} className="w-full border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-bold uppercase tracking-widest py-3 transition-colors mb-2">
                   Download PDF
                 </button>
                 <button onClick={() => window.print()} className="w-full border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold uppercase tracking-widest py-3 transition-colors">
                   Print
                 </button>
               </div>
               <div className="flex items-end">
                 <button onClick={() => handleSaveToFirebase(false)} className="w-full bg-white/10 hover:bg-white/20 text-black dark:text-white font-bold uppercase tracking-widest py-3 transition-colors border border-black/10 dark:border-white/10">
                   Save Record
                 </button>
               </div>
            </div>
            {downloadUrl && (
              <div className="mt-4 p-4 border border-[#22C55E] bg-[#22C55E]/10 flex flex-col gap-2">
                <p className="text-sm font-bold text-[#22C55E]">Download Ready</p>
                <p className="text-xs">If the automatic download didn't work (due to preview restrictions), click the button below or right-click and choose "Save Link As..."</p>
                <a 
                  href={downloadUrl} 
                  download={downloadName}
                  className="bg-[#22C55E] text-black text-center font-bold uppercase tracking-widest p-2 block mt-2"
                >
                  Download {downloadName}
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="h-64 border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center text-black dark:text-white/30 text-xs font-mono uppercase tracking-widest text-center px-8">
            Output preview will appear here.<br/>Ensure API key is configured.
          </div>
        )}
      </div>
    </div>
  );
}
