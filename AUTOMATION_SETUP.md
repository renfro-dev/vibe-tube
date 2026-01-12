# VibeTube Automated Updates Setup

This guide explains how to set up automated weekly video updates using GitHub Actions.

## Overview

VibeTube can automatically fetch and process new videos from your newsletters every week using GitHub Actions. The system:

1. Runs every Monday at 1:00 AM UTC (configurable)
2. Scans your Gmail for new newsletter emails
3. Extracts and processes YouTube videos
4. Classifies them using AI
5. Updates your Supabase database

## Setup Steps

### 1. Generate a Cron Secret

Generate a secure random secret for authenticating cron requests:

```bash
openssl rand -base64 32
```

Copy the output (it will look something like: `dGhpc2lzYXNlY3VyZXJhbmRvbXN0cmluZw==`)

### 2. Add Secret to Local Environment

Add the secret to your `.env.local` file:

```env
CRON_SECRET=your_generated_secret_here
```

### 3. Configure GitHub Repository Secrets

Go to your GitHub repository:

1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `CRON_SECRET` | Your generated secret from step 1 | Authenticates cron requests |
| `VIBETUBE_URL` | Your deployed VibeTube URL | e.g., `https://vibetube.vercel.app` |

**Important:** Do NOT include a trailing slash in `VIBETUBE_URL`

### 4. Deploy Your Application

Deploy VibeTube to your hosting platform (Vercel, Railway, etc.) with the `CRON_SECRET` environment variable configured.

**Vercel:**
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add `CRON_SECRET` with your generated secret

**Railway/Other platforms:**
- Add the `CRON_SECRET` environment variable through your platform's dashboard

### 5. Verify Workflow is Active

1. Push the `.github/workflows/update-videos.yml` file to your repository
2. Go to the **Actions** tab in your GitHub repository
3. You should see the "Update VibeTube Videos Weekly" workflow listed

### 6. Test the Automation (Optional)

Manually trigger the workflow to test:

1. Go to **Actions** → **Update VibeTube Videos Weekly**
2. Click **Run workflow**
3. Select the branch (usually `main`)
4. Click **Run workflow**

Watch the logs to ensure it completes successfully.

## Customizing the Schedule

The default schedule is every Monday at 1:00 AM UTC. To change this:

1. Edit `.github/workflows/update-videos.yml`
2. Modify the `cron` expression:

```yaml
schedule:
  - cron: '0 1 * * 1'  # Minute Hour Day-of-Month Month Day-of-Week
```

**Examples:**
- Every day at midnight: `'0 0 * * *'`
- Every Sunday at 2 AM: `'0 2 * * 0'`
- Twice a week (Mon & Fri at noon): `'0 12 * * 1,5'`

Use [crontab.guru](https://crontab.guru/) to build custom schedules.

## Monitoring

### Check Workflow Runs

1. Go to **Actions** tab in GitHub
2. Click on **Update VibeTube Videos Weekly**
3. View recent runs and logs

### Troubleshooting

**Workflow fails with 401 Unauthorized:**
- Verify `CRON_SECRET` matches between GitHub Secrets and your deployment
- Check that the secret has no extra spaces or line breaks

**Workflow fails with 500 Internal Server Error:**
- Check your deployment logs
- Verify all API keys (Gmail, YouTube, Gemini) are configured
- Ensure Supabase credentials are correct

**No new videos appearing:**
- Check if there are actually new newsletters in your Gmail
- Verify `NEWSLETTER_SENDERS` includes the correct domains
- Review the workflow logs for processing details

## Manual Update

You can still manually trigger updates by:

1. Clicking the "Refresh" button in the VibeTube UI
2. Running the workflow manually from GitHub Actions
3. Calling the API directly (requires authentication):

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-vibetube-url.com/api/cron/update-videos
```

## Security Notes

- **Never commit** `.env.local` to version control
- The `CRON_SECRET` prevents unauthorized users from triggering expensive API calls
- Only share the secret through encrypted channels or GitHub Secrets
- Rotate the secret periodically for enhanced security

## Cost Considerations

Each automated run will consume:
- Gmail API quota (free tier: 1 billion quota units/day)
- YouTube Data API quota (free tier: 10,000 units/day)
- Gemini API tokens (depends on your plan)

Running once per week should stay well within free tier limits.

## Disabling Automation

To temporarily disable automated updates:

1. Go to **Actions** in GitHub
2. Click on **Update VibeTube Videos Weekly**
3. Click the **...** menu → **Disable workflow**

Or delete the `.github/workflows/update-videos.yml` file.
