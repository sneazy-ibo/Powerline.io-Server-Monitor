import PowerlineBot from './bot-core/bot-logic.js';

function parseServerAddress(serverAddress) {
  const [addressPart, roomNumber] = serverAddress.split('/');
  const [serverIp, port] = addressPart.split(':');
  const sdm = roomNumber === undefined ? parseInt(port) : 8080;
  const sslPort = (parseInt(roomNumber) || 0) + sdm + 1000;
  
  const wsUrl = `wss://${serverIp.replace(/\./g, '-')}.powerline.io:${sslPort}/`;
  return wsUrl;
}

async function fetchGameStats(serverAddress) {
  const wsUrl = parseServerAddress(serverAddress);
  console.log(`Connecting to: ${wsUrl}`);
  
  const bot = new PowerlineBot(wsUrl);
  
  try {
    await bot.connect();
    
    // Wait for data to populate
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (bot.arenaSize > 0 && bot.ping > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
    
    const data = bot.getData();
    bot.disconnect();
    
    return data;
  } catch (error) {
    console.error(`Error gathering data from ${serverAddress}:`, error);
    bot.disconnect();
    throw error;
  }
}

export { fetchGameStats };