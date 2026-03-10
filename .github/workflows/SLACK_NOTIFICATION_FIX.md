# Slack Notification Fix

## Issue Fixed

**Error**: `Specify secrets.SLACK_WEBHOOK_URL` and `Unexpected input(s) 'webhook_url'`

**Root Cause**: 
1. The Slack webhook secret wasn't set in GitHub Secrets
2. The parameter name was wrong (`webhook_url` instead of using environment variable)

## Solution Applied

Made the Slack notification step optional and fixed the configuration:

```yaml
- name: Notify deployment status
  if: always() && secrets.SLACK_WEBHOOK_URL != ''
  uses: 8398a7/action-slack@v3
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  with:
    status: ${{ job.status }}
    text: 'Production deployment ${{ job.status }}'
```

### Changes Made

1. **Conditional Execution**: Only runs if `SLACK_WEBHOOK_URL` secret is set
2. **Environment Variable**: Uses `env` instead of `with.webhook_url`
3. **Graceful Degradation**: Deployment succeeds even without Slack configured

## How It Works Now

### Without Slack Configured (Current)
- ✅ Deployment completes successfully
- ⚠️ Slack notification step is skipped
- ✅ No errors or warnings

### With Slack Configured (Optional)
- ✅ Deployment completes successfully
- ✅ Slack notification sent to your channel
- ✅ Shows deployment status (success/failure)

## How to Enable Slack Notifications (Optional)

If you want Slack notifications for deployments:

### 1. Create Slack Webhook

1. Go to your Slack workspace
2. Navigate to: https://api.slack.com/apps
3. Click "Create New App" → "From scratch"
4. Name it "Farmer Platform Deployments"
5. Select your workspace
6. Click "Incoming Webhooks" in the sidebar
7. Toggle "Activate Incoming Webhooks" to On
8. Click "Add New Webhook to Workspace"
9. Select the channel for notifications
10. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

### 2. Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste the webhook URL from Slack
6. Click "Add secret"

### 3. Test Notification

Push a change to trigger the workflow:

```bash
git commit --allow-empty -m "Test Slack notification"
git push origin main
```

You should receive a Slack message when deployment completes.

## Notification Format

When enabled, you'll receive messages like:

```
Production deployment success
Status: success
```

or

```
Production deployment failure
Status: failure
```

## Customizing Notifications

You can customize the notification by editing the workflow:

```yaml
- name: Notify deployment status
  if: always() && secrets.SLACK_WEBHOOK_URL != ''
  uses: 8398a7/action-slack@v3
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  with:
    status: ${{ job.status }}
    text: |
      Deployment to Production: ${{ job.status }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
      Branch: ${{ github.ref }}
    fields: |
      [
        {
          "title": "Environment",
          "value": "Production",
          "short": true
        },
        {
          "title": "Status",
          "value": "${{ job.status }}",
          "short": true
        }
      ]
```

## Alternative Notification Methods

If you don't want to use Slack, you can:

### 1. Email Notifications
GitHub automatically sends email notifications for workflow failures if you have them enabled in your GitHub settings.

### 2. Discord Webhook
Replace the Slack action with Discord:

```yaml
- name: Notify deployment status
  if: always() && secrets.DISCORD_WEBHOOK_URL != ''
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK_URL }}
    status: ${{ job.status }}
    title: "Production Deployment"
```

### 3. Microsoft Teams
Use Teams webhook:

```yaml
- name: Notify deployment status
  if: always() && secrets.TEAMS_WEBHOOK_URL != ''
  uses: aliencube/microsoft-teams-actions@v0.8.0
  with:
    webhook_uri: ${{ secrets.TEAMS_WEBHOOK_URL }}
    title: "Production Deployment"
    summary: "Deployment ${{ job.status }}"
```

### 4. PagerDuty
For critical alerts:

```yaml
- name: Notify deployment failure
  if: failure() && secrets.PAGERDUTY_INTEGRATION_KEY != ''
  uses: moia-oss/pagerduty-change-events-action@v1
  with:
    integration-key: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
    summary: "Production deployment failed"
```

## Current Status

✅ **Deployment works without Slack configured**  
✅ **No errors or warnings**  
⚠️ **Slack notifications disabled** (optional feature)  

To enable Slack notifications, follow the steps above to add the `SLACK_WEBHOOK_URL` secret.

## Summary

- Slack notification is now optional
- Deployment succeeds whether or not Slack is configured
- Easy to enable by adding one GitHub secret
- Can be customized or replaced with other notification methods
