/**
 * Segunda migração (timestamp maior que a dos computadores) = corre depois da primeira.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Headsets: campos alinhados ao formulário React (matrícula, lacre, etc.).
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS headsets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      matricula TEXT NOT NULL,
      lacre TEXT NOT NULL,
      marca TEXT NOT NULL DEFAULT '',
      numero_serie TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'em_uso',
      observacoes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS headsets;`);
};
