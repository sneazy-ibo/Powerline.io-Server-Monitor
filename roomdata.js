import "dotenv/config";

const STATS_PATH = "/info";

const getStatsUrl = (serverAddress) => `http://${serverAddress}${STATS_PATH}`;

async function fetchGameStats(serverAddress) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10000);

	try {
		const response = await fetch(getStatsUrl(serverAddress), {
			signal: controller.signal,
		});
		clearTimeout(timeout);

		if (!response.ok) {
			throw new Error(`Stats endpoint returned ${response.status}`);
		}

		const json = await response.json();

		return {
			arenaWidth: json.arenaWidth,
			arenaHeight: json.arenaHeight,
			totalPlayers: json.totalPlayers,
			leaderboard: (json.leaderboard || [])
				.sort((a, b) => a.rank - b.rank)
				.map((entry) => ({
					id: entry.playerId,
					nick: entry.nick,
					score: entry.score,
				})),
		};
	} catch (error) {
		clearTimeout(timeout);
		throw error;
	}
}

export { fetchGameStats };
