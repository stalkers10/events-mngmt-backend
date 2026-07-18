import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  // Handles idle client errors so a bad connection doesn't crash the whole process
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Thin query helper. Prefer this over pool.query() directly so we have a
 * single place to add logging/metrics later if needed.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Run a callback inside a transaction. Commits on success, rolls back and
 * rethrows on any error. Use this for anything touching Reservation +
 * Chair availability together (the double-booking risk area from the spec).
 */
export async function withTransaction<T>(
  callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
