export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE headsets
      ALTER COLUMN matricula DROP NOT NULL;
  `);

  pgm.sql(`
    ALTER TABLE headsets
      ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'estoque';
  `);

  pgm.sql(`
    ALTER TABLE headsets
      ALTER COLUMN numero_serie DROP NOT NULL;
  `);

  pgm.sql(`
    UPDATE headsets
    SET numero_serie = NULL
    WHERE numero_serie = '';
  `);

  pgm.sql(`
    ALTER TABLE headsets
      ADD CONSTRAINT headsets_marca_chk
      CHECK (marca = '' OR lower(marca) IN ('intelbras', 'plantronics'));
  `);

  pgm.sql(`
    ALTER TABLE headsets
      ADD CONSTRAINT headsets_categoria_chk
      CHECK (categoria IN ('estoque', 'emprestimo', 'entrega', 'manutencao', 'operacao'));
  `);

  pgm.sql(`
    ALTER TABLE headsets
      ADD CONSTRAINT headsets_status_chk
      CHECK (status IN ('em_uso', 'estoque', 'defeito', 'emprestimo', 'entrega', 'manutencao', 'reserva', 'troca_pendente', 'desligado'));
  `);

  pgm.sql(`
    ALTER TABLE headsets
      ADD CONSTRAINT headsets_lacre_uk UNIQUE (lacre);
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS headsets_numero_serie_uk
    ON headsets (numero_serie)
    WHERE numero_serie IS NOT NULL;
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS headset_historico (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      headset_id UUID NOT NULL REFERENCES headsets(id) ON DELETE CASCADE,
      acao TEXT NOT NULL,
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT,
      observacao TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS headset_historico_headset_id_created_idx
    ON headset_historico (headset_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS headset_historico_headset_id_created_idx;`);
  pgm.sql(`DROP TABLE IF EXISTS headset_historico;`);
  pgm.sql(`DROP INDEX IF EXISTS headsets_numero_serie_uk;`);
  pgm.sql(`ALTER TABLE headsets DROP CONSTRAINT IF EXISTS headsets_lacre_uk;`);
  pgm.sql(`ALTER TABLE headsets DROP CONSTRAINT IF EXISTS headsets_status_chk;`);
  pgm.sql(`ALTER TABLE headsets DROP CONSTRAINT IF EXISTS headsets_categoria_chk;`);
  pgm.sql(`ALTER TABLE headsets DROP CONSTRAINT IF EXISTS headsets_marca_chk;`);
  pgm.sql(`ALTER TABLE headsets DROP COLUMN IF EXISTS categoria;`);
};
