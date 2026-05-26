# 🐍 Powerline.io Server Monitor 📊

A periodically updated monitoring system for **Powerline.io** that tracks room activity, player statistics, and regional leaderboards.

> This project focuses on data visualization and reporting. The core data collection and game interaction logic is handled externally.

---

## 🚀 Features

- 🌍 **Multi-region monitoring** (EU / US / AS)
- 📊 **Scheduled server stats aggregation**
- 🔗 **Clickable room code links**
- 🏆 **Top player leaderboards per region**
- 🔔 **Discord webhook integration**
- 📡 **Automated periodic updates**

## 🧩 Architecture

This system consists of two decoupled components:

### 📡 Public Monitor (this repository)
- Discord webhook integration
- Data formatting and embed generation
- Aggregation and presentation of server statistics
- Multi-region visualization logic

### 🔒 Core Data System (external)
Responsible for collecting and processing raw data from WebSocket connections.
This separation is intentional to prevent misuse of the reversed protocol for bots/exploits.

## 🏗️ How It Works

1. The system queries the Powerline master server to retrieve the latest available regional room descriptors
   (`http://master.powerline.io`)

2. The response is parsed and transformed into active WebSocket room URLs via `roomdata.js`

3. External core logic connects to these WebSocket URLs and processes incoming room data

4. Raw data is normalized and formatted into structured statistics and leaderboard entries

5. Discord embeds are generated from the processed data

6. Updates are dispatched to configured Discord webhooks

## 🖼️ Example Output

Discord embed showing near real-time room stats and leaderboard updates in the official Powerline.io Discord server:

![Discord Embed Preview](/embed_example.png)


## ⚠️ Disclaimer

This project is not affiliated with Powerline.io or its developer.

It is intended for informational and visualization purposes only.
