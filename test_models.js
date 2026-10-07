import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

try {
  const env = fs.readFileSync('.env', 'utf8');
  const keyLine = env.split('\n').find(l => l.startsWith('VITE_GEMINI_API_KEY='));
  if (!keyLine) throw new Error('No key found');
  const key = keyLine.split('=')[1].trim();
  
  const genAI = new GoogleGenerativeAI(key);
  const models = await genAI.listModels();
  console.log(models.map(m => m.name).filter(n => n.includes('gemini')));
} catch(e) {
  console.error(e);
}
