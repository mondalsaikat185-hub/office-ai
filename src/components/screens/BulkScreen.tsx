import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { callGemini } from '../../lib/gemini';
import { Users, FileText, Download, Loader2, Save, Wand2, Edit, Check, AlertTriangle } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, BorderStyle, ImageRun, Table, TableRow, TableCell, WidthType } from 'docx';
import JSZip from 'jszip';

interface Recipient {
  id: string;
  name: string;
  designation: string;
  office: string;
  address: string;
  phone: string;
  status: 'valid' | 'warning' | 'error';
}

export default function BulkScreen() {
  const { workspaces, activeWorkspaceId, activeSignatureId } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [letterBody, setLetterBody] = useState('I am directed to inform {{name}}, {{designation}}, {{office}} \nthat you are required to submit your documents to this office within 15 days of receipt of this letter.');
  const [subject, setSubject] = useState('');
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const activeSignature = activeWorkspace?.signatures.find(s => s.id === activeSignatureId) || activeWorkspace?.signatures[0];

  const handleExtract = async () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);
    try {
      const prompt = `You are a data extraction specialist. From the following raw, unstructured text, extract every person's details.
The text may contain names, designations, offices, addresses, phone numbers mixed in any order, any language (English/Hindi/Odia), from any source (Facebook, WhatsApp, office lists, etc.)

For each person found, return a JSON array:
[
  {
    "name": "full name with prefix if available",
    "designation": "their job title",  
    "office": "their office/department name",
    "address": "full postal address if available",
    "phone": "if found, else empty"
  }
]

Rules:
- If address is not clearly mentioned but office + city is provided, build a reasonable address string.
- If designation is unclear, guess from context or leave empty.
- Always provide the most complete address possible from the context.
- VERY IMPORTANT: Return ONLY a valid JSON array, starting with [ and ending with ]. DO NOT include markdown formatting like \`\`\`json. DO NOT add any other text.

RAW TEXT:
${rawText}`;
      
      const res = await callGemini(prompt, { temp: 0.1, maxOut: 4096 });
      let text = res.text.trim();
      if (text.startsWith('```json')) text = text.substring(7);
      if (text.endsWith('```')) text = text.substring(0, text.length - 3);
      
      let parsed: any[] = JSON.parse(text);
      if (!Array.isArray(parsed)) parsed = [];
      
      const structured: Recipient[] = parsed.map(p => {
         const name = p.name || '';
         const designation = p.designation || '';
         const office = p.office || '';
         const address = p.address || '';
         const phone = p.phone || '';
         // heuristics for status
         let status: 'valid' | 'warning' | 'error' = 'valid';
         if (!name && !designation) status = 'error';
         else if (!address || address.length < 5) status = 'warning';
         
         return {
            id: crypto.randomUUID(),
            name, designation, office, address, phone, status
         };
      });
      
      setRecipients(structured);
      setStep(3);
    } catch (err: any) {
      alert("Extraction failed: " + err.message + "\nMake sure the raw text is readable.");
    } finally {
      setIsExtracting(false);
    }
  };

  const mergeLetterText = (body: string, r: Recipient) => {
     let b = body;
     b = b.replace(/\{\{name\}\}/gi, r.name || '[Name]');
     b = b.replace(/\{\{designation\}\}/gi, r.designation || '[Designation]');
     b = b.replace(/\{\{office\}\}/gi, r.office || '[Office]');
     b = b.replace(/\{\{address\}\}/gi, r.address || '[Address]');
     b = b.replace(/\{\{phone\}\}/gi, r.phone || '[Phone]');
     return b;
  };

  const getDocxBlob = async (mergedBody: string, recipientTo: string) => {
    // using similar logic to WriteScreen's fetchImageAsBuffer + docx generation
    const ws = activeWorkspace;
    const sig = activeSignature;
    if (!ws || !sig) throw new Error("Workspace and Signature required");

    const fetchImg = async (url: string) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (e) {
        return null;
      }
    };

    let logo1Buf = null, logo2Buf = null, logo3Buf = null;
    if (ws.letterhead?.logo1) logo1Buf = await fetchImg(ws.letterhead.logo1);
    if (ws.letterhead?.logo2) logo2Buf = await fetchImg(ws.letterhead.logo2);
    if (ws.letterhead?.logo3) logo3Buf = await fetchImg(ws.letterhead.logo3);

    let lColor = activeWorkspace?.letterhead?.color || '1a3a8a';
    lColor = lColor.replace('#', '');
    const children: any[] = [];
    
    if (ws.letterhead) {
       let lh = ws.letterhead;
       if (logo1Buf || logo2Buf || logo3Buf) {
          children.push(new Table({
             width: { size: 100, type: WidthType.PERCENTAGE },
             borders: { top: { style: BorderStyle.NONE, size: 0, color: "auto" }, bottom: { style: BorderStyle.NONE, size: 0, color: "auto" }, left: { style: BorderStyle.NONE, size: 0, color: "auto" }, right: { style: BorderStyle.NONE, size: 0, color: "auto" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" } },
             rows: [
                new TableRow({
                   children: [
                      new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: logo1Buf ? [new ImageRun({ data: logo1Buf, transformation: { width: 120, height: 80 }, type: 'png' } as any)] : [] })] }),
                      new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: logo2Buf ? [new ImageRun({ data: logo2Buf, transformation: { width: 120, height: 80 }, type: 'png' } as any)] : [] })] }),
                      new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: logo3Buf ? [new ImageRun({ data: logo3Buf, transformation: { width: 120, height: 80 }, type: 'png' } as any)] : [] })] }),
                   ]
                })
             ]
          }));
       }
       const addCenterRun = (text: string, o: any) => {
          if (!text || !text.trim()) return;
          text.split('\n').forEach((line: string) => {
              children.push(new Paragraph({
                  children: [new TextRun({ text: line.trim(), size: o.size || 24, bold: !!o.bold, color: o.color || 'auto' })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: o.before || 0, after: o.after || 0, line: 200 }
              }));
          });
       };
       const pxToHalfPts = (px: number) => Math.max(16, Math.round((px - 3) * 2));
       addCenterRun((lh.l1||'').replace('|', '          '), { bold: true, size: pxToHalfPts(lh.s1 || 24), color: lh.color || '1A3A8A' });
       addCenterRun((lh.l2||'').replace('|', '          '), { bold: true, size: pxToHalfPts(lh.s2 || 20), color: lh.color || '1A3A8A' });
       addCenterRun((lh.l3||'').replace('|', '          '), { bold: true, size: pxToHalfPts(lh.s3 || 16), color: lh.color || '1A3A8A' });
       addCenterRun((lh.l4||'').replace('|', '          '), { bold: true, size: pxToHalfPts(lh.s4 || 16), color: lh.color || '1A3A8A' });
       addCenterRun((lh.l5||'').replace('|', '          '), { bold: true, size: pxToHalfPts(lh.s5 || 14), color: lh.color || '1A3A8A' });
       addCenterRun((lh.l6||'').replace('|', '          '), { bold: true, size: pxToHalfPts(lh.s6 || 14), color: lh.color || '1A3A8A' });
    } else {
       if(ws.office_hi) children.push(new Paragraph({children:[new TextRun({text:ws.office_hi, bold:true, size:30})], alignment:AlignmentType.CENTER}));
       children.push(new Paragraph({children:[new TextRun({text:ws.office_en||ws.name, bold:true, size:24, color:'1A3A8A'})], alignment:AlignmentType.CENTER}));
       if(ws.address) children.push(new Paragraph({children:[new TextRun({text:ws.address, size:20})], alignment:AlignmentType.CENTER}));
       if(ws.phone || ws.email) children.push(new Paragraph({children:[new TextRun({text:[ws.phone,ws.email].filter(Boolean).join(' • '), size:20})], alignment:AlignmentType.CENTER}));
    }
    
    children.push(new Paragraph({
        text: '',
        border: { bottom: { color: '1A3A8A', space: 1, style: BorderStyle.SINGLE, size: 12 } }
    }));
    children.push(new Paragraph({text:''}));

    children.push(new Paragraph({
       children: [new TextRun({ text: `To,` })], spacing: { before: 200 }
    }));
    if (recipientTo) recipientTo.split('\n').forEach(l => children.push(new Paragraph({ text: l, indent: { left: 720 } })));
    
    if (subject) {
       children.push(new Paragraph({ text: "" }));
       children.push(new Paragraph({ children: [new TextRun({ text: `Subject: ${subject}`, bold: true })] }));
    }
    
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ text: "Sir/Madam," }));
    children.push(new Paragraph({ text: "" }));
    
    mergedBody.split('\n').forEach(line => {
        children.push(new Paragraph({ text: line, alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 } }));
    });
    
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ text: "Yours faithfully,", alignment: AlignmentType.RIGHT }));
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ text: "" })); // Space for signature
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `(${sig.name})`, bold: true })] }));
    children.push(new Paragraph({ text: sig.designation, alignment: AlignmentType.RIGHT }));
    if(sig.section) children.push(new Paragraph({ text: sig.section, alignment: AlignmentType.RIGHT }));

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, right: 1440, bottom: 1440, left: 1440 } }
        },
        children
      }]
    });

    return await Packer.toBlob(doc);
  };

  const handleDownloadSingle = async (r: Recipient) => {
    setGeneratingId(r.id);
    try {
       const merged = mergeLetterText(letterBody, r);
       const recipientTo = `${r.name}\n${r.designation}\n${r.office}\n${r.address}`.replace(/\n+/g, '\n').trim();
       const blob = await getDocxBlob(merged, recipientTo);
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       const safeName = r.name.replace(/[^a-z0-9]/gi, '_').substring(0, 20) || 'Recipient';
       a.download = `Letter_${safeName}.docx`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
    } catch(err: any) {
       alert("Error generating doc: " + err.message);
    } finally {
       setGeneratingId(null);
    }
  };

  const handleDownloadAllZip = async () => {
     if (recipients.length === 0) return;
     setIsGenerating(true);
     try {
       const zip = new JSZip();
       for (let i = 0; i < recipients.length; i++) {
         const r = recipients[i];
         const merged = mergeLetterText(letterBody, r);
         const recipientTo = `${r.name}\n${r.designation}\n${r.office}\n${r.address}`.replace(/\n+/g, '\n').trim();
         const blob = await getDocxBlob(merged, recipientTo);
         const safeName = r.name.replace(/[^a-z0-9]/gi, '_').substring(0, 20) || `Recipient_${i+1}`;
         zip.file(`Letter_${safeName}.docx`, blob);
       }
       const zipBlob = await zip.generateAsync({ type: 'blob' });
       const url = URL.createObjectURL(zipBlob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `Bulk_Letters_${new Date().toISOString().substring(0,10)}.zip`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
     } catch (err: any) {
       alert("Error creating ZIP: " + err.message);
     } finally {
       setIsGenerating(false);
     }
  };

  const updateRecipient = (id: string, field: keyof Recipient, val: string) => {
     setRecipients(prev => prev.map(r => r.id === id ? { ...r, [field]: val, status: 'valid' } : r));
  };

  if (!activeWorkspace) {
    return <div className="p-8 text-center">Please select a workspace first.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-32">
      <header className="mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
           <Users className="w-8 h-8 text-[#22C55E]" /> Bulk / Mail Merge
        </h1>
        <p className="text-black dark:text-white/50 text-sm mt-2">Generate multiple personalized letters from raw text easily.</p>
      </header>

      {/* Process Tabs */}
      <div className="flex border-b-2 border-black/10 dark:border-white/10 mb-8">
         <button onClick={() => setStep(1)} className={`py-3 px-6 uppercase tracking-widest text-xs font-bold border-b-2 transition-colors ${step === 1 ? 'border-[#22C55E] text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-black dark:hover:text-white'}`}>
            1. Letter Template
         </button>
         <button onClick={() => setStep(2)} className={`py-3 px-6 uppercase tracking-widest text-xs font-bold border-b-2 transition-colors ${step === 2 ? 'border-[#22C55E] text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-black dark:hover:text-white'}`}>
            2. Recipients Data
         </button>
         <button onClick={() => setStep(3)} className={`py-3 px-6 uppercase tracking-widest text-xs font-bold border-b-2 transition-colors ${step === 3 ? 'border-[#22C55E] text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-black dark:hover:text-white'}`}>
            3. Review & Download
         </button>
      </div>

      {step === 1 && (
        <div className="space-y-6">
           <h2 className="font-bold uppercase tracking-widest text-sm text-[#22C55E]">Letter Body & Placeholders</h2>
           <p className="text-sm text-black dark:text-white/70">
              Write the text of your letter. Use the following placeholders where you want the data to be inserted for each recipient:
              <br/>
              <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 mt-2 inline-block">{"{{name}}"}</code>{' '}
              <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 mt-2 inline-block">{"{{designation}}"}</code>{' '}
              <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 mt-2 inline-block">{"{{office}}"}</code>{' '}
              <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 mt-2 inline-block">{"{{address}}"}</code>{' '}
              <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 mt-2 inline-block">{"{{phone}}"}</code>
           </p>

           <div className="space-y-4">
              <div>
                 <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Subject</label>
                 <input 
                   type="text" 
                   value={subject} 
                   onChange={e => setSubject(e.target.value)} 
                   placeholder="Enter subject here..."
                   className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-2 outline-none text-sm dark:text-white" 
                 />
              </div>
              <div>
                 <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Main Body Text</label>
                 <textarea 
                   rows={10}
                   value={letterBody} 
                   onChange={e => setLetterBody(e.target.value)}
                   className="w-full bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4 outline-none text-sm font-mono dark:text-white resize-none"
                 />
              </div>
              <button 
                 onClick={() => setStep(2)}
                 className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-bold uppercase tracking-widest text-xs"
              >
                 Next: Paste Recipients Data
              </button>
           </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
           <h2 className="font-bold uppercase tracking-widest text-sm text-[#22C55E]">Extract Recipients using AI</h2>
           <p className="text-sm text-black dark:text-white/70">
             Paste unstructured text containing names, addresses, designations, etc. It can be from WhatsApp, Facebook, or a messy document. Our AI will automatically extract the structure for your placeholders.
           </p>

           <div>
              <textarea 
                rows={12}
                value={rawText} 
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste raw addresses here..."
                disabled={isExtracting}
                className="w-full bg-[#22C55E]/5 border-2 border-[#22C55E]/20 focus:border-[#22C55E] p-4 outline-none text-sm dark:text-white resize-none disabled:opacity-50"
              />
           </div>

           <div className="flex gap-4">
              <button 
                 onClick={() => setStep(1)}
                 disabled={isExtracting}
                 className="border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 px-6 py-3 font-bold uppercase tracking-widest text-xs"
              >
                 Back
              </button>
              <button 
                 onClick={handleExtract}
                 disabled={isExtracting || !rawText.trim()}
                 className="bg-[#22C55E] hover:bg-[#1fb355] text-black px-6 py-3 font-bold uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50"
              >
                 {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                 {isExtracting ? 'Extracting via AI...' : 'Parse & Extract'}
              </button>
           </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
           <div className="flex justify-between items-end mb-4">
              <h2 className="font-bold uppercase tracking-widest text-sm text-[#22C55E]">Review & Download</h2>
              {recipients.length > 0 && (
                 <button 
                   onClick={handleDownloadAllZip}
                   disabled={isGenerating}
                   className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 font-bold uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50"
                 >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download All as ZIP
                 </button>
              )}
           </div>

           {recipients.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-black/20 dark:border-white/20">
                 No recipients extracted yet. Go back to Step 2 and extract.
              </div>
           ) : (
              <div className="bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 border-b border-black/10 dark:border-white/10">
                          <th className="p-3">Verify</th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Designation</th>
                          <th className="p-3">Office</th>
                          <th className="p-3 min-w-[200px]">Address</th>
                          <th className="p-3">Action</th>
                       </tr>
                    </thead>
                    <tbody className="text-xs">
                       {recipients.map((r, i) => (
                          <tr key={r.id} className="border-b border-black/5 dark:border-white/5 group hover:bg-white dark:hover:bg-black">
                             <td className="p-3 align-top pt-4">
                               {r.status === 'valid' ? (
                                  <span title="Looks valid" className="text-green-500"><Check className="w-4 h-4"/></span>
                               ) : r.status === 'warning' ? (
                                  <span title="Address might be incomplete. Please verify." className="text-amber-500"><AlertTriangle className="w-4 h-4"/></span>
                               ) : (
                                  <span title="Missing key details" className="text-red-500"><AlertTriangle className="w-4 h-4"/></span>
                               )}
                             </td>
                             <td className="p-2 align-top">
                               <input value={r.name} onChange={e => updateRecipient(r.id, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-black/20 focus:border-black/50 outline-none p-1" />
                             </td>
                             <td className="p-2 align-top">
                               <input value={r.designation} onChange={e => updateRecipient(r.id, 'designation', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-black/20 focus:border-black/50 outline-none p-1" />
                             </td>
                             <td className="p-2 align-top">
                               <input value={r.office} onChange={e => updateRecipient(r.id, 'office', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-black/20 focus:border-black/50 outline-none p-1" />
                             </td>
                             <td className="p-2 align-top">
                               <textarea value={r.address} onChange={e => updateRecipient(r.id, 'address', e.target.value)} rows={2} className="w-full bg-transparent border border-transparent hover:border-black/20 focus:border-black/50 outline-none p-1 resize-none" />
                             </td>
                             <td className="p-2 align-top pt-3">
                                <button 
                                  onClick={() => handleDownloadSingle(r)} 
                                  disabled={generatingId === r.id || isGenerating}
                                  className="text-black dark:text-white/60 hover:text-[#22C55E] flex items-center gap-1 uppercase font-bold text-[10px] tracking-widest disabled:opacity-50"
                                >
                                   <Download className="w-3 h-3"/> {generatingId === r.id ? 'Wait' : 'DOCX'}
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           )}

           <div className="flex gap-4 mt-8">
              <button 
                 onClick={() => setStep(2)}
                 disabled={isGenerating}
                 className="border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 px-6 py-3 font-bold uppercase tracking-widest text-xs"
              >
                 Back
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
