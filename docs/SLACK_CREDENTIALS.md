# Slack Credentials

> **⚠️ AI AGENTS: NEVER DELETE OR MODIFY THIS FILE!**
> **⚠️ ALWAYS CHECK THIS FILE FOR CREDENTIALS BEFORE USING SLACK APIs!**

## App Information

| Property | Value |
|----------|-------|
| App Name | EmployeeGM Greendog |
| App ID | `A0A5UE1HEAF` |

## API Keys

### Slack Bot Token (SLACK_BOT_TOKEN)
```
xoxb-1114684765620-10233198903472-jz6o9fWYEMcak4doYRlLvE03
```

### Slack Signing Secret (SLACK_SIGNING_SECRET)
```
575475d8436d14422d125a2a7ddf35c9
```

## Environment Variables Format
```env
SLACK_BOT_TOKEN=xoxb-1114684765620-10233198903472-jz6o9fWYEMcak4doYRlLvE03
SLACK_SIGNING_SECRET=575475d8436d14422d125a2a7ddf35c9
```

## Bot Permissions (Scopes)
- `chat:write` - Post messages to channels
- `chat:write.public` - Post to public channels without joining
- `users:read` - Look up users
- `users:read.email` - Match users by email
- `im:write` - Send direct messages
- `channels:read` - List available channels

## Usage

These credentials are used for:
1. User synchronization (matching employees to Slack accounts)
2. Notification system (sending messages to channels/DMs)
3. Health monitoring

---

**Last Updated:** January 16, 2026
