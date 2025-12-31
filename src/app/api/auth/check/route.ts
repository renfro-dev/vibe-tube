import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_token')?.value === 'true';

    return NextResponse.json({ isAdmin });
}
