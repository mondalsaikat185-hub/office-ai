const key = process.env.GEMINI_API_KEY;

import * as https from 'https';

const req = https.get('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (data.models) {
        data.models.forEach((m: any) => console.log(m.name));
      } else {
        console.log(data);
      }
    } catch (e) {
      console.log('Parse error', e);
    }
  });
});
