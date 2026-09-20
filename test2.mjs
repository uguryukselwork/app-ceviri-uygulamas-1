import { GoogleGenAI } from '@google/genai';
try {
  const ai = new GoogleGenAI();
  const res = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: 'Hello',
  });
  console.log('SUCCESS NO ARGS:', res.text);
} catch (err) {
  console.log('ERROR NO ARGS:', err.message);
}
