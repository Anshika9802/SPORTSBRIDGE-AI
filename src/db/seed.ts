import 'dotenv/config';
import { seedDatabase } from './seed-data.ts';

async function main() {
  const result = await seedDatabase();
  console.log('Seed completed:', JSON.stringify(result));
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
