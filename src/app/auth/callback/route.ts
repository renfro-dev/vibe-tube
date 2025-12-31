import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/auth/callback'
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);

        // Display the tokens nicely for the user to copy
        return new NextResponse(`
      <html>
        <head>
          <title>Google Auth Successful</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
            .token-box { background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0; overflow-x: auto; }
            code { font-family: monospace; color: #09090b; }
            h1 { color: #18181b; }
            .label { font-weight: bold; display: block; margin-bottom: 8px; color: #52525b; }
            .value { display: block; word-break: break-all; background: white; padding: 10px; border: 1px solid #e4e4e7; border-radius: 4px; }
            .warning { background: #fffbeb; color: #92400e; padding: 12px; border-radius: 4px; border: 1px solid #fcd34d; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Authentication Successful ✅</h1>
          <p>Copy the Refresh Token below and add it to your <code>.env.local</code> file.</p>
          
          <div class="token-box">
            <span class="label">GOOGLE_REFRESH_TOKEN</span>
            <code class="value">${tokens.refresh_token || 'No refresh token returned. Did you already authorize this app? Try revoking access first or use prompt=consent.'}</code>
          </div>

          ${tokens.access_token ? `
          <div class="token-box">
            <span class="label">Access Token (Temporary)</span>
            <code class="value">${tokens.access_token.substring(0, 20)}...</code>
          </div>
          ` : ''}

          <div class="warning">
            <strong>Next Steps:</strong><br>
            1. Copy the Refresh Token above.<br>
            2. Update <code>GOOGLE_REFRESH_TOKEN</code> in your <code>.env.local</code> file.<br>
            3. Restart your development server.<br>
            4. Refresh the home page.
          </div>
        </body>
      </html>
    `, {
            headers: { 'Content-Type': 'text/html' },
        });

    } catch (error: any) {
        console.error('Error retrieving access token', error);
        return NextResponse.json({ error: 'Failed to retrieve access token', details: error.message }, { status: 500 });
    }
}
