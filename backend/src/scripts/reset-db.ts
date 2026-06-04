import { DataSource } from 'typeorm';
import { SeederService } from '@/database/seeder/seeder.service';
import { runScript } from './lib/script-runner';

const shouldSeed = process.argv.includes('--seed');

void runScript(async (app) => {
  const dataSource = app.get(DataSource);

  console.log('Dropping and synchronizing database schema...');
  await dataSource.synchronize(true); // true = dropSchema
  console.log('Database schema synchronized.');

  if (shouldSeed) {
    console.log('Seeding database...');
    await app.get(SeederService).seed();
    console.log('Seeding complete.');
  }
});
