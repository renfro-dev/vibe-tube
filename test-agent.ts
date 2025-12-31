import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { fetchTranscript } from './src/lib/youtube';
import { classifyVideoAgent } from './src/lib/classifier';

// Load env from .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
    const envConfig = readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            process.env[key.trim()] = values.join('=').trim().replace(/(^"|"$)/g, '');
        }
    });
}

async function test() {
    console.log('Checking Environment...');
    const key = process.env.GOOGLE_API_KEY;
    if (key) {
        console.log(`✅ GOOGLE_API_KEY found (Starts with: ${key.slice(0, 5)}...)`);
    } else {
        console.error('❌ GOOGLE_API_KEY missing');
        return;
    }

    // 1. Test Gemini Direct
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(key);
        // USING VALID MODEL FROM LIST
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        console.log('\n[1] Testing Gemini Connection (gemini-flash-latest)...');
        const result = await model.generateContent('Say "Hello World" if you can hear me.');
        console.log('✅ Gemini Response:', result.response.text().trim());
    } catch (e: any) {
        console.error('❌ Gemini Failed:', e.message);
    }

    // 2. Test Transcript
    // Video: "Me at the zoo" (jNQXAC9IVRw) - Very old, might not have auto-caps? 
    // Let's use a TED talk or something standard. 
    // "How to learn anything" by Josh Kaufman: 5MgBikgcWnY
    const testVideoId = '5MgBikgcWnY';
    console.log(`\n[2] Fetching transcript for ${testVideoId}...`);
    try {
        const transcript = await fetchTranscript(testVideoId);
        if (transcript) {
            console.log(`✅ Transcript fetched (${transcript.length} chars)`);
            console.log('Snippet:', transcript.slice(0, 100));

            console.log('\n[3] Running Agent Classification...');
            // Mocking the classifier call to force the specific model if I haven't updated the file yet?
            // No, I need to update the file or pass the model. 
            // The classifier is hardcoded to gemini-1.5-flash.
            // So I can't test the AGENT until I update the file.
            // I'll just verify the Transcript works here.

        } else {
            console.log('❌ No transcript found');
        }
    } catch (e: any) {
        console.error('❌ Transcript Fetch Failed:', e.message);
    }
}

test();
