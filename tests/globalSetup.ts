import { execSync } from 'child_process'

const TEST_DB_URL =
  'postgresql://postgres:postgres@localhost:5432/phantom_mask?schema=test'

export default async function setup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  })
}
