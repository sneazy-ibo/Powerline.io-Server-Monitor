import { fetchGameStats } from "./roomdata.js";
import "dotenv/config";

const MASTER_API = "http://master.powerline.io/servers";

const CONTINENTS = [
    ["Europe", "🌍"],
    ["America", "🌎"],
    ["Asia", "🌏"],
];

const continent = (label) => {
    const i = CONTINENTS.findIndex(([name]) => label.includes(name));
    return i === -1 ? CONTINENTS.length : i;
};

const regionEmoji = (label) => CONTINENTS[continent(label)]?.[1] ?? "🌐";

const DISCORD_WEBHOOKS = (() => {
    const urls = (process.env.DISCORD_WEBHOOK_URLS || "").split(",").filter(Boolean);
    const ids = (process.env.DISCORD_MESSAGE_IDS || "").split(",").filter(Boolean);

    if (!urls.length) {
        console.log("No Discord webhook URLs provided. Status updates will not be sent.");
        return [];
    }

    return urls.map((url, i) => ({ url, messageId: ids[i] || "0" }));
})();

async function fetchRegions() {
    const response = await fetch(MASTER_API);

    if (!response.ok) {
        throw new Error(`Master server returned ${response.status}`);
    }

    const { regions = [] } = await response.json();
    console.log(`Discovered ${regions.length} region(s): ${regions.map((r) => r.region).join(", ")}`);

    return regions
        .filter((region) => region?.server && region?.hash)
        .map((region) => ({
            label: region.region,
            serverAddress: region.server,
            roomCode: region.hash,
            emoji: regionEmoji(region.region),
        }))
        .sort((a, b) => continent(a.label) - continent(b.label) || a.label.localeCompare(b.label));
}

async function gatherRoomData(regions) {
    return Promise.all(
        regions.map(async (region) => {
            try {
                return await fetchGameStats(region.serverAddress);
            } catch (error) {
                console.error(`Error gathering data for ${region.label}:`, error);
                return null;
            }
        }),
    );
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

function formatLeaderboard(data) {
    const leaderboard = (data?.leaderboard || []).slice(0, 10);
    const totalScore = leaderboard.reduce((sum, p) => sum + p.score, 0);

    if (!leaderboard.length) {
        return "💯 Total Score: 0\n\n*Room is empty* 💨";
    }

    const rankings = leaderboard
        .map((player, i) => {
            const rank =
                i < 3
                    ? RANK_ICONS[i]
                    : i === 9
                      ? "💀"
                      : "\u2008" + String.fromCharCode("➃".charCodeAt(0) + i - 3);

            const nick = (player.nick || "<Unnamed>").replace(/([*_`~|])/g, "\\$1");

            return `${rank} ${nick} - ${player.score}`;
        })
        .join("\n");

    return `💯 Total Score: ${totalScore}\n\n${rankings}`;
}

const SPACER = { name: "\u200b", value: "\u200b", inline: true };

// Empty field between the two items of each row -> [item, gap, item]
const emptyBetween = (fields) =>
    fields.flatMap((field, i) => (i % 2 === 0 ? [field, SPACER] : [field]));

function createServerField(region, data) {
    const players = data?.totalPlayers ?? 0;
    const arena =
        data?.arenaWidth != null && data?.arenaHeight != null
            ? `${Math.round(data.arenaWidth)}x${Math.round(data.arenaHeight)}`
            : "N/A";

    return {
        name: `${region.emoji} ${region.label}`,
        value: [
            `🏟️ Arena: ${arena}`,
            `👥 Players: ${players}${players > 15 ? " 🔥" : ""}`,
            `🔗 Room: [${region.roomCode}](https://powerline.io/#${region.roomCode})`,
        ].join("\n"),
        inline: true,
    };
}

function createLeaderboardField(region, data) {
    return {
        name: `${region.emoji} ${region.label}`,
        value: formatLeaderboard(data),
        inline: true,
    };
}

function createPayload(regions, roomData, layout) {
    const serverFields = regions.map((region, i) => createServerField(region, roomData[i]));
    const leaderboardFields = regions.map((region, i) => createLeaderboardField(region, roomData[i]));

    return {
        embeds: [
            {
                title: "🐍 Powerline.io Server Status 📈",
                description: TEXT.stats,
                color: 0x00ff00,
                fields: layout(serverFields),
                footer: { text: "Data updates every few minutes." },
                timestamp: new Date(),
            },
            {
                title: "Powerline.io Leaderboard 🏆",
                description: TEXT.leaderboard,
                color: 0xffd700,
                fields: layout(leaderboardFields),
                footer: { text: "Leaderboard updates every few minutes." },
                timestamp: new Date(),
            },
        ],
    };
}

const TEXT = {
    stats: "Real-time stats for every region. Tap a roomcode to join now",
    leaderboard: "Top 10 players per region. See who dominates the arena now",
};

async function sendToDiscord(payload) {
    if (!DISCORD_WEBHOOKS.length) return;

    await Promise.all(
        DISCORD_WEBHOOKS.map(async ({ url, messageId }) => {
            try {
                const isUpdate = messageId !== "0";
                const endpoint = isUpdate ? `${url}/messages/${messageId}` : `${url}?wait=true`;

                const response = await fetch(endpoint, {
                    method: isUpdate ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(
                        `Discord API error: ${response.status} ${await response.text()}`,
                    );
                }

                const result = await response.json().catch(() => null);
                console.log(
                    `Successfully ${isUpdate ? "updated" : "sent"} Discord message${result?.id ? ` (id ${result.id})` : ""}`,
                );
            } catch (error) {
                console.error("Failed to update Discord webhook:", error);
            }
        }),
    );
}

async function main() {
    try {
        const regions = await fetchRegions();
        const roomData = await gatherRoomData(regions);
        await sendToDiscord(createPayload(regions, roomData, emptyBetween));
    } catch (error) {
        console.error("Error in main process:", error);
    } finally {
        process.exit(0);
    }
}

main();
