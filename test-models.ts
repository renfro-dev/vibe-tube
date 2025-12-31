import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

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

async function listModels() {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
        console.error('No API Key');
        return;
    }

    console.log('Fetching models via REST API...');
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();

        if (data.models) {
            console.log(`✅ Found ${data.models.length} models:`);
            data.models.forEach((m: any) => {
                if (m.name.includes('gemini')) console.log(` - ${m.name}`);
            });
        } else {
            console.error('❌ No models found or error:', JSON.stringify(data, null, 2));
        }
    } catch (e: any) {
        console.error('❌ Fetch failed:', e.message);
    }
}

listModels();
