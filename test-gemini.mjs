import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
try {
  const res = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: 'Hello',
  });
  console.log('SUCCESS 3.8:', res.text);
} catch (err) {
  console.log('ERROR 3.8:', err.message);
}
try {
  const res2 = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: 'Hello',
  });
  console.log('SUCCESS 1.5:', res2.text);
} catch (err) {
  console.log('ERROR 1.5:', err.message);
}
