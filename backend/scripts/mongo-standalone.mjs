import { MongoMemoryServer } from 'mongodb-memory-server';
const mongod = await MongoMemoryServer.create();
console.log(mongod.getUri());
process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
