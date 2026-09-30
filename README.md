# Powerline.io Server Monitor

A periodically updated monitoring system for [powerline.io](https://powerline.io) that tracks room activity, player statistics, and regional leaderboards.

> [!IMPORTANT]
> This project focuses on data visualization and reporting and is not affiliated with Powerline.io or its developer.

---

## Features

- **Automatic region discovery**: the live region list is read from the Powerline master server, so newly added servers appear with no code changes
- **Scheduled server stats aggregation**
- **Clickable room code links**
- **Top player leaderboards per region**
- **Discord webhook integration**
- **Automated periodic updates**

## Architecture

- **Discovery**: the Powerline master API is queried for the current list of regions, each with a display label, stats host, and room code.
- **Collection**: each region's stats endpoint (`http://<host>:<port>/info`) is fetched directly over HTTP.
- **Presentation**: region labels are matched to globe emojis by keyword (Europe / America / Asia, falling back to a generic globe), formatted into Discord embeds, and dispatched to the configured webhooks.

## How It Works

1. The system fetches the list of live regions from the Powerline master server

2. Each region's stats host is queried over HTTP via `roomdata.js`

3. Raw data is normalized into structured statistics and leaderboard entries

4. Discord embeds are generated from the processed data

5. Updates are dispatched to configured Discord webhooks

## Configuration

Works out of the box with no configuration: the Powerline endpoints are static and public.
Optional environment variables:

| Variable               | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `DISCORD_WEBHOOK_URLS` | Comma-separated Discord webhook URLs (omit to disable posting)         |
| `DISCORD_MESSAGE_IDS`  | Comma-separated message IDs to edit in place (`0` posts a new message) |

## Example Output

Discord embed showing near real-time room stats and leaderboard updates in the official Powerline.io Discord server:

![Discord Embed Preview](/embed_example.png)
