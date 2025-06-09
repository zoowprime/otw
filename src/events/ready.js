module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    const alimentationSystem = require('./alimentationSystem');
    alimentationSystem.start(client);
  }
};
