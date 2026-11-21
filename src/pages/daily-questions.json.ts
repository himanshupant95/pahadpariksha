import { dailyPool } from '../lib/daily-pool';

export const GET = () => new Response(JSON.stringify(dailyPool()), { headers: { 'Content-Type': 'application/json' } });
