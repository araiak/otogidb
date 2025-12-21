import { WebhookAlertChannel } from 'checkly/constructs'

// Alert channel configuration
const sendDefaults = {
  sendFailure: true,
  sendRecovery: true,
  sendDegraded: true,
}

// Discord webhook alert channel
// The webhook URL is configured via environment variable for security
export const discordChannel = new WebhookAlertChannel('discord-alerts', {
  name: 'Discord Notifications',
  url: process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/placeholder',
  method: 'POST',
  ...sendDefaults,
  // Discord webhook format
  template: `{
  "embeds": [{
    "title": "{{ALERT_TITLE}}",
    "description": "**Check:** {{CHECK_NAME}}\\n**Type:** {{CHECK_TYPE}}\\n**Result:** {{ALERT_TYPE}}",
    "color": {{#eq ALERT_TYPE "ALERT_FAILURE"}}15158332{{else}}{{#eq ALERT_TYPE "ALERT_DEGRADED"}}16776960{{else}}3066993{{/eq}}{{/eq}},
    "fields": [
      {
        "name": "Response Time",
        "value": "{{RESPONSE_TIME}}ms",
        "inline": true
      },
      {
        "name": "Location",
        "value": "{{RUN_LOCATION}}",
        "inline": true
      }
    ],
    "timestamp": "{{STARTED_AT}}",
    "footer": {
      "text": "OtogiDB Monitoring"
    },
    "url": "{{RESULT_LINK}}"
  }]
}`,
})
