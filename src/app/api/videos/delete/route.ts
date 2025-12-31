import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
    // 1. Auth Check
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_token')?.value === 'true';

    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing Video ID' }, { status: 400 });
        }

        // 2. Delete from Supabase
        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete error:', error);
            return NextResponse.json({ error: 'Database delete failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Video deleted' });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
