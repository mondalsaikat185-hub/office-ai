import { useStore } from './store';

export async function callGeminiStream(prompt: string, onChunk: (text: string) => void, opts: { temp?: number, maxOut?: number, imageBase64?: string, imageBase64s?: string[] } = {}) {
  let { apiKeys, mistralKey, selectedModel } = useStore.getState();
  
  const envKey = process.env.GEMINI_API_KEY;
  const keysToTry = [...apiKeys];
  
  if (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey.trim().length > 0) {
    keysToTry.unshift({ key: envKey, label: 'Default Environment Key', added: Date.now(), usage: { date: new Date().toISOString().slice(0, 10), tokens: 0 } });
  }
  
  if (!keysToTry.length) throw new Error('No API key configured. Please add one in Settings.');

  const errors = [];
  
  for (let i = 0; i < keysToTry.length; i++) {
    const keyObj = keysToTry[i];
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${keyObj.key}&alt=sse`;
      const parts: any[] = [{ text: prompt }];

      if (opts.imageBase64s && opts.imageBase64s.length > 0) {
         for (const b64 of opts.imageBase64s) {
           const mimeType = b64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
           const base64Data = b64.split(',')[1] || b64;
           parts.unshift({
              inlineData: { mimeType, data: base64Data }
           });
         }
      } else if (opts.imageBase64) {
         const mimeType = opts.imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
         const base64Data = opts.imageBase64.split(',')[1] || opts.imageBase64;
         parts.unshift({
            inlineData: { mimeType, data: base64Data }
         });
      }

      const body = {
        contents: [{ parts }],
        generationConfig: { 
          temperature: opts.temp ?? 0.4, 
          maxOutputTokens: opts.maxOut ?? 16384 
        },
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const res = await fetch(url, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      if (!res.ok) {
         clearTimeout(timeoutId);
         const errorText = await res.text();
         if (res.status === 429 || /quota|exhausted/i.test(errorText)) {
           errors.push(`${keyObj.label}: quota exceeded`);
           continue;
         }
         throw new Error(errorText);
      }
      
      if (!res.body) {
         clearTimeout(timeoutId);
         throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let totalTokens = 0;
      let truncated = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) onChunk(text);
                
                if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
                   truncated = true;
                }
                if (data.usageMetadata?.totalTokenCount) {
                  totalTokens = data.usageMetadata.totalTokenCount;
                }
              } catch (e) {
                console.error("Stream parse error:", e);
              }
            }
          }
        }
      }
      return { tokens: totalTokens, truncated };
    } catch (e: any) {
      errors.push(`${keyObj.label}: ${e.message}`);
    }
  }
  
  if (mistralKey) {
     // fallback to mistral without streaming
     try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json', 'Authorization':'Bearer '+ mistralKey},
        body:JSON.stringify({model:'mistral-small-latest', messages:[{role:'user', content:prompt}], temperature:opts.temp ?? 0.4, max_tokens:opts.maxOut ?? 8192}),
        signal: controller.signal
      });
      const json = await res.json();
      clearTimeout(timeoutId);
      if(json.error) throw new Error(json.error.message);
      const outputText = json.choices[0].message.content;
      onChunk(outputText);
      return { tokens: json.usage?.total_tokens || 0, truncated: false };
    } catch(e: any) {
      errors.push('Mistral: '+e.message);
    }
  }
  
  throw new Error('All API keys failed:\n' + errors.join('\n'));
}

export async function callGemini(prompt: string, opts: { temp?: number, maxOut?: number, imageBase64?: string, imageBase64s?: string[] } = {}) {
  let { apiKeys, mistralKey, selectedModel } = useStore.getState();
  
  // Try to get key from environment first, then user's custom keys
  const envKey = process.env.GEMINI_API_KEY;
  const keysToTry = [...apiKeys];
  
  if (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey.trim().length > 0) {
    keysToTry.unshift({ key: envKey, label: 'Default Environment Key', added: Date.now(), usage: { date: new Date().toISOString().slice(0, 10), tokens: 0 } });
  }
  
  if (!keysToTry.length) throw new Error('No API key configured. Please add one in Settings.');
  
  const today = new Date().toISOString().slice(0, 10);
  const errors = [];
  
  for (let i = 0; i < keysToTry.length; i++) {
    const keyObj = keysToTry[i];
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${keyObj.key}`;
      const parts: any[] = [{ text: prompt }];

      if (opts.imageBase64s && opts.imageBase64s.length > 0) {
         for (const b64 of opts.imageBase64s) {
           const mimeType = b64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
           const base64Data = b64.split(',')[1] || b64;
           parts.unshift({
              inlineData: { mimeType, data: base64Data }
           });
         }
      } else if (opts.imageBase64) {
         const mimeType = opts.imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
         const base64Data = opts.imageBase64.split(',')[1] || opts.imageBase64;
         parts.unshift({
            inlineData: { mimeType, data: base64Data }
         });
      }

      const body = {
        contents: [{ parts }],
        generationConfig: { 
          temperature: opts.temp ?? 0.4, 
          maxOutputTokens: opts.maxOut ?? 8192 
        },
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const res = await fetch(url, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const json = await res.json();
      clearTimeout(timeoutId);
      
      if (json.error) {
        if (json.error.code === 429 || /quota|exhausted/i.test(json.error.message || '')) {
          errors.push(`${keyObj.label}: quota exceeded`);
          continue;
        }
        throw new Error(json.error.message || 'Unknown API error');
      }
      
      let text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokens = json.usageMetadata?.totalTokenCount || 0;
      
      // Auto-continuation logic for truncated output
      const finishReason = json.candidates?.[0]?.finishReason || '';
      let truncated = false;
      if (finishReason === 'MAX_TOKENS') {
         console.warn('Gemini output truncated (MAX_TOKENS)');
         truncated = true;
      }
      
      return { text, tokens, truncated };
    } catch (e: any) {
      errors.push(`${keyObj.label}: ${e.message}`);
    }
  }
  
  if (mistralKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json', 'Authorization':'Bearer '+ mistralKey},
        body:JSON.stringify({model:'mistral-small-latest', messages:[{role:'user', content:prompt}], temperature:opts.temp ?? 0.4, max_tokens:opts.maxOut ?? 8192}),
        signal: controller.signal
      });
      const json = await res.json();
      clearTimeout(timeoutId);
      if(json.error) throw new Error(json.error.message);
      return { text: json.choices[0].message.content, tokens: json.usage?.total_tokens || 0 };
    } catch(e: any) {
      errors.push('Mistral: '+e.message);
    }
  }
  
  throw new Error('All API keys failed:\n' + errors.join('\n'));
}

// Semantic Chunker & RAG Implementation
export const RAG = {
  chunk(text: string, maxChunkSize=500) {
    if(!text || text.length <= maxChunkSize) return text ? [{text, index:0}] : [];
    const chunks = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    let currentChunk = '';
    let chunkIndex = 0;
    for(const para of paragraphs) {
      if(para.length > maxChunkSize) {
        if(currentChunk.trim()) { chunks.push({text:currentChunk.trim(), index:chunkIndex++}); currentChunk = ''; }
        const sentences = para.match(/[^.!?\u0964]+[.!?\u0964]+\s*/g) || [para];
        let sentChunk = '';
        for(const sent of sentences) {
          if((sentChunk + sent).length > maxChunkSize && sentChunk.trim()) {
            chunks.push({text:sentChunk.trim(), index:chunkIndex++});
            sentChunk = sent;
          } else {
            sentChunk += sent;
          }
        }
        if(sentChunk.trim()) { currentChunk = sentChunk; }
        continue;
      }
      if((currentChunk + '\n\n' + para).length > maxChunkSize && currentChunk.trim()) {
        chunks.push({text:currentChunk.trim(), index:chunkIndex++});
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }
    if(currentChunk.trim()) chunks.push({text:currentChunk.trim(), index:chunkIndex++});
    return chunks;
  },
  _tokenize(text: string) {
    return (text||'').toLowerCase().replace(/[^\w\s\u0980-\u09FF\u0900-\u097F]/g,' ').split(/\s+/).filter(w => w.length > 2);
  },
  _termFreq(tokens: string[]) {
    const tf: any = {};
    for(const t of tokens) tf[t] = (tf[t]||0) + 1;
    return tf;
  },
  similarity(text1: string, text2: string) {
    const t1 = this._tokenize(text1), t2 = this._tokenize(text2);
    if(!t1.length || !t2.length) return 0;
    const tf1 = this._termFreq(t1), tf2 = this._termFreq(t2);
    const allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
    let dot=0, mag1=0, mag2=0;
    for(const t of allTerms) {
      const a = tf1[t]||0, b = tf2[t]||0;
      dot += a*b; mag1 += a*a; mag2 += b*b;
    }
    return mag1 && mag2 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
  },
  retrieve(query: string, opts: any = {}) {
    const maxResults = opts.maxResults || 3;
    const minScore = opts.minScore || 0.08;
    const state = useStore.getState();
    const wsLetters = state.letters.filter(l => l.workspaceId === state.activeWorkspaceId);
    
    if(!wsLetters.length) return [];
    
    const scored = [];
    for(const letter of wsLetters.slice(0, 50)) {
      const fullText = 'Subject: ' + (letter.subject||'') + '\n' + (letter.body||'');
      const chunks = this.chunk(fullText);
      for(const chunk of chunks) {
        const score = this.similarity(query, chunk.text);
        if(score >= minScore) {
          scored.push({ text: chunk.text, score, source: letter.subject || 'Untitled', date: letter.createdAt, mode: letter.mode });
        }
      }
    }
    scored.sort((a,b) => b.score - a.score);
    return scored.slice(0, maxResults);
  },
  buildContext(query: string) {
    const chunks = this.retrieve(query);
    if(!chunks.length) return '';
    let ctx = '\n\nREFERENCE FROM PREVIOUS CORRESPONDENCE (use for style, tone, and context \u2014 do NOT copy verbatim):\n';
    chunks.forEach((c, i) => {
      ctx += '--- Ref ' + (i+1) + ' [' + (c.mode||'letter') + ', ' + c.source + '] ---\n' + c.text.substring(0,400) + '\n';
    });
    return ctx;
  }
};
