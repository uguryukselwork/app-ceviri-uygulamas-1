import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Key exists:", !!process.env.GEMINI_API_KEY);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello',
    });
    console.log(response.text);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
