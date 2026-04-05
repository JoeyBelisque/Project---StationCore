/**
 * Migração = alteração versionada ao schema da base de dados.
 * `up` aplica; `down` reverte (útil em dev). O nome do ficheiro define a ordem de execução.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS computadores (
      id SERIAL PRIMARY KEY,
      hostname TEXT NOT NULL,
      serial_number TEXT,
      status TEXT NOT NULL DEFAULT 'em_uso',
      pa TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS computadores;`);
};
