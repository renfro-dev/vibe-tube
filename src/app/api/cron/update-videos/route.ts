import { NextRequest, NextResponse } from 'next/server';

/**
 * Secure cron endpoint for automated weekly video updates
 * Called by GitHub Actions on schedule
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== expectedAuth) {
      console.warn('Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🤖 Automated update triggered at:', new Date().toISOString());

    // Determine the base URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Trigger the main newsletter processing endpoint
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/api/newsletters`, {
      method: 'GET',
      headers: {
        'User-Agent': 'VibeTube-Cron/1.0'
      }
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error('Newsletter fetch failed:', data);
      return NextResponse.json(
        {
          success: false,
          error: 'Newsletter processing failed',
          details: data,
          duration
        },
        { status: 500 }
      );
    }

    console.log(`✅ Update completed in ${duration}ms`);
    console.log(`   Videos processed: ${data.videos?.length || 0}`);
    console.log(`   Emails scanned: ${data.metadata?.emailsProcessed || 0}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      stats: {
        videosTotal: data.videos?.length || 0,
        emailsProcessed: data.metadata?.emailsProcessed || 0,
        uniqueVideos: data.metadata?.uniqueVideos || 0,
        lastUpdated: data.metadata?.lastUpdated
      }
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
