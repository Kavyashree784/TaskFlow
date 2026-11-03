
import 'dotenv/config';
import dns from 'node:dns';
import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT || 5000);

// Configure DNS before connecting to MongoDB Atlas.
const dnsServers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
  console.log(`Using DNS servers: ${dnsServers.join(', ')}`);
}

async function start() {
  const jwtSecret = process.env.JWT_SECRET || '';

  if (
    jwtSecret.length < 32 ||
    /replace|placeholder|change[-_]?me|your[-_]?secret/i.test(jwtSecret)
  ) {
    throw new Error(
      'JWT_SECRET must be a unique random value of at least 32 characters; do not use the example placeholder.'
    );
  }

  await connectDatabase();

  app.listen(port, () => {
    console.log(`TaskFlow API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start TaskFlow API:', error.message);
  process.exit(1);
});
