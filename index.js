import { fetchGameStats } from './roomdata.js';
import 'dotenv/config';

const MASTER_URL = 'http://master.powerline.io';
const REGION_CONFIG = {
  eu: { country: 'DE', emoji: '🌍', name: 'Europe & Africa' },
  us: { country: 'US', emoji: '🌎', name: 'America' },
  as: { country: 'JP', emoji: '🌏', name: 'Asia & Oceania' }
};

const DISCORD_WEBHOOKS = (() => {
  const urls = (process.env.DISCORD_WEBHOOK_URLS || '').split(',').filter(Boolean);
  const ids = (process.env.DISCORD_MESSAGE_IDS || '').split(',').filter(Boolean);

  if (!urls.length) {
    console.log('No Discord webhook URLs provided. Status updates will not be sent.');
    return [];
  }

  return urls.map((url, i) => ({ url, messageId: ids[i] || '0' }));
})();

async function fetchRoomForRegion(region) {
  const { country } = REGION_CONFIG[region];

  try {
    const response = await fetch(MASTER_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'RoomCodeFetcher/1.0' },
      body: country
    });

    if (!response.ok) return null;

    const data = await response.text();
    const room = data.split(',').find(r => r.split('!').length === 2);
    console.log(`${region} - ${data}`);

    if (room) {
      const [serverAddress, roomCode] = room.split('!');
      return { serverAddress, roomCode };
    }
  } catch (error) {
    console.error(`Error fetching room for ${region}:`, error);
  }

  return null;
}

async function fetchAllRooms() {
  const regions = Object.keys(REGION_CONFIG);
  const rooms = await Promise.all(regions.map(fetchRoomForRegion));

  return Object.fromEntries(
    regions.map((region, i) => [region, rooms[i]])
  );
}

async function gatherRoomData(allRooms) {
  const entries = Object.entries(allRooms);
  const data = await Promise.all(
    entries.map(async ([region, room]) => {
      if (!room?.serverAddress) return [region, null];

      try {
        console.log(`Gathering data for ${region}: ${room.serverAddress}`);
        return [region, await fetchGameStats(room.serverAddress)];
      } catch (error) {
        console.error(`Error gathering data for ${region}:`, error);
        return [region, null];
      }
    })
  );

  return Object.fromEntries(data);
}

function createServerField(region, room, data) {
  const { emoji, name } = REGION_CONFIG[region];
  const ping = data?.ping ?? 'N/A';
  const arena = data?.arenaWidth && data?.arenaHeight
    ? `${data.arenaWidth.toFixed(0)}x${data.arenaHeight.toFixed(0)}`
    : 'N/A';
  const players = data?.totalPlayers ?? 0;
  const isHot = players > 15 ? '🔥' : '';

  const value = room
    ? `🏟️ Arena: ${arena}\n👥 Players: ${players} ${isHot}\n\n🔗 Room: [${room.roomCode}](https://powerline.io/#${room.roomCode})\n🏓 Ping: ${ping}ms\n🚦 Status: ✅ Online`
    : `🏟️ Arena: N/A\n👥 Players: 0\n\n🔗 Room: N/A\n🏓 Ping: N/A\n🚦 Status: ❌ Down`;

  return { name: `${emoji} ${name}`, value, inline: true };
}

function createLeaderboardField(region, data) {
  const { emoji, name } = REGION_CONFIG[region];
  const leaderboard = (data?.leaderboard || []).slice(0, 10);
  const totalScore = leaderboard.reduce((sum, p) => sum + p.score, 0);

  if (!leaderboard.length) {
    return {
      name: `${emoji} ${name}`,
      value: `💯 Total Score: 0\n\n*No players currently online* 💨`,
      inline: true
    };
  }

  const RANK_ICONS = ['🥇', '🥈', '🥉'];
  const rankings = leaderboard.map((player, i) => {
    const rank = i < 3 ? RANK_ICONS[i] :
      i === 9 ? '💀' :
        '\u2008' + String.fromCharCode('➃'.charCodeAt(0) + i - 3);

    const nick = (player.nick || '<Unnamed>')
      .replace(/n.*?g.*?g/gi, m => m.replace(/g/gi, '*'))
      .replace(/([*_`~|])/g, '\\$1');

    return `${rank} ${nick} - ${player.score}`;
  }).join('\n');

  return {
    name: `${emoji} ${name}`,
    value: `💯 Total Score: ${totalScore}\n\n${rankings}`,
    inline: true
  };
}

function createDiscordPayload(allRooms, roomData) {
  const regions = Object.keys(REGION_CONFIG);

  return {
    embeds: [
      {
        title: "🐍 Powerline.io Server Status 📈",
        description: "Real-time data for all regions. Click on the roomcodes to join them",
        color: 0x00FF00,
        fields: regions.map(r => createServerField(r, allRooms[r], roomData[r])),
        footer: { text: "Data updates every few minutes." },
        timestamp: new Date()
      },
      {
        title: "Powerline.io Leaderboard 🏆",
        description: "🏅 Top 10 players for each region. Who will dominate the arena? 🏆",
        color: 0xFFD700,
        fields: regions.map(r => createLeaderboardField(r, roomData[r])),
        footer: { text: "Leaderboard updates every few minutes." },
        timestamp: new Date()
      }
    ]
  };
}

async function sendToDiscord(allRooms, roomData) {
  if (!DISCORD_WEBHOOKS.length) return;

  const payload = createDiscordPayload(allRooms, roomData);

  await Promise.all(DISCORD_WEBHOOKS.map(async ({ url, messageId }) => {
    try {
      const isUpdate = messageId !== '0';
      const endpoint = isUpdate ? `${url}/messages/${messageId}` : url;

      const response = await fetch(endpoint, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      console.log(`Successfully ${isUpdate ? 'updated' : 'sent'} Discord message`);
    } catch (error) {
      console.error(`Failed to update Discord webhook:`, error);
    }
  }));
}

async function main() {
  try {
    const allRooms = await fetchAllRooms();
    const roomData = await gatherRoomData(allRooms);
    console.log(roomData);
    await sendToDiscord(allRooms, roomData);
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    process.exit(0);
  }
}

main();