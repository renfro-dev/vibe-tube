import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { fetchVideoMetadata } from './src/lib/youtube';

// 1. Env Setup
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debug() {
    console.log('--- Debugging DB ---');
    // Fetch all videos
    const { data: videos, error } = await supabase.from('videos').select('*');

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    // Filter for the problematic ones (e.g. "Week of 12/29" or generic title)
    const badVideos = videos.filter((v: any) =>
        v.title.includes('AI Video') ||
        !v.metadata?.durationSec ||
        v.metadata?.durationSec === 0
    );

    console.log(`Found ${badVideos.length} potentially broken videos.`);

    if (badVideos.length > 0) {
        const sample = badVideos[0];
        console.log('\nSample Bad Video:', {
            id: sample.id,
            title: sample.title,
            metadata: sample.metadata
        });

        console.log('\n--- Attempting Live Fetch ---');
        const freshData = await fetchVideoMetadata([sample.id]);
        if (freshData.length > 0) {
            console.log('✅ Live Fetch SUCCESS:', freshData[0].title);
            console.log('Duration:', freshData[0].durationSec);
        } else {
            console.log('❌ Live Fetch FAILED (returned empty array)');
        }
    } else {
        console.log('Strange... no "bad" videos found using the filter logic. Maybe the Week date is different?');
        // Just print 5 random titles
        console.log('First 5 videos:', videos.slice(0, 5).map((v: any) => v.title));
    }
}

debug();
