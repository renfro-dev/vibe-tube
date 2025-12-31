import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/auth/callback'
    );

    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical for getting a refresh token
        scope: scopes,
        prompt: 'consent' // Forces a refresh token to be generated
    });

    return NextResponse.redirect(url);
}
