/**
 * Tabela de utilizadores para autenticação local da API.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      ativo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    INSERT INTO usuarios (nome, email, senha_hash, role)
    VALUES (
      'Admin',
      'admin@stationcore.local',
      '$2b$10$1iZ4yBFnA1yvz8k91Vx.Ae6PznmTm38ryQVSSNwxWaMasszMTVS0G',
      'admin'
    )
    ON CONFLICT (email) DO NOTHING;
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS usuarios;`);
};
