import 'dotenv/config';

function getStatsUrl(serverAddress) {
  const [addressPart, roomNumber] = serverAddress.split('/');
  const [serverIp, port] = addressPart.split(':');
  const sdm = roomNumber === undefined ? parseInt(port) : 8080;
  const sslPort = (parseInt(roomNumber) || 0) + sdm;

  return `http://${serverIp}:${sslPort}${ process.env.ENDPOINT}`;
}

async function fetchGameStats(serverAddress) {
  const url = getStatsUrl(serverAddress);
  console.log(`Fetching stats from: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Stats endpoint returned ${response.status}`);
    }

    const json = await response.json();

    const leaderboard = (json.leaderboard || [])
      .sort((a, b) => a.rank - b.rank)
      .map(entry => ({
        id: entry.playerId,
        nick: entry.nick,
        score: entry.score
      }));

    return {
      ping: null,
      arenaWidth: json.arenaWidth,
      arenaHeight: json.arenaHeight,
      totalPlayers: json.totalPlayers,
      leaderboard
    };
  } catch (error) {
    clearTimeout(timeout);
    console.error(`Error gathering data from ${serverAddress}:`, error);
    throw error;
  }
}

export { fetchGameStats };