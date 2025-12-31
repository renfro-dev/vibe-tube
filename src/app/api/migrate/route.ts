import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const cachePath = path.join(process.cwd(), 'sample.json');
        let data;

        try {
            const cacheContent = fs.readFileSync(cachePath, 'utf8');
            data = JSON.parse(cacheContent);
        } catch (error) {
            return NextResponse.json({ error: 'No local sample.json found to migrate.' }, { status: 404 });
        }

        if (!data.videos || !Array.isArray(data.videos)) {
            return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
        }

        const videos = data.videos;
        const records = videos.map((v: any) => ({
            id: v.id,
            title: v.title,
            description: v.description || '',
            channel: v.channel,
            url: v.url,
            published_at: v.publishedAt ? new Date(v.publishedAt).toISOString() : null,
            shared_at: v.sharedAt ? new Date(v.sharedAt).toISOString() : null, // Important for grouping
            vibe: v.vibe,
            reason: v.reason,
            metadata: {
                thumbnails: v.thumbnails,
                tags: v.tags,
                durationSec: v.durationSec,
                viewCount: v.viewCount,
                likeCount: v.likeCount
            }
        }));

        console.log(`Migrating ${records.length} videos to Supabase...`);

        // Upsert in batches of 50 to be safe
        const batchSize = 50;
        const errors = [];

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabase.from('videos').upsert(batch, { onConflict: 'id' });

            if (error) {
                console.error('Batch error:', error);
                errors.push(error);
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({
                success: false,
                message: 'Some batches failed',
                errors
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: records.length,
            message: 'Migration complete. Database seeded.'
        });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Internal Migration Error' }, { status: 500 });
    }
}
