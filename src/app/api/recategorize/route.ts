import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, newVibe } = body;

        if (!videoId || !newVibe) {
            return NextResponse.json({ error: 'Missing videoId or newVibe' }, { status: 400 });
        }

        // Update in Supabase
        const { error } = await supabase
            .from('videos')
            .update({
                vibe: newVibe,
                reason: 'Manually Recategorized'
            })
            .eq('id', videoId);

        if (error) {
            console.error('Supabase update failed:', error);
            return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Video recategorized' });

    } catch (error) {
        console.error('Recategorize error:', error);
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}
