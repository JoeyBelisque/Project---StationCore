export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS headset_achados_perdidos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      headset_id UUID REFERENCES headsets(id) ON DELETE SET NULL,
      lacre TEXT NOT NULL DEFAULT '',
      numero_serie TEXT NOT NULL DEFAULT '',
      marca TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'aguardando_devolucao',
      localizacao TEXT NOT NULL DEFAULT '',
      encontrado_por TEXT NOT NULL DEFAULT '',
      chamado TEXT NOT NULL DEFAULT '',
      encontrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      devolvido_em TIMESTAMPTZ,
      devolvido_para TEXT NOT NULL DEFAULT '',
      observacoes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT headset_achados_perdidos_status_chk
        CHECK (status IN ('aguardando_devolucao', 'devolvido', 'cancelado'))
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS headset_achados_perdidos_status_idx
    ON headset_achados_perdidos (status, encontrado_em DESC);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS headset_achados_perdidos_headset_idx
    ON headset_achados_perdidos (headset_id, encontrado_em DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS headset_achados_perdidos_headset_idx;`);
  pgm.sql(`DROP INDEX IF EXISTS headset_achados_perdidos_status_idx;`);
  pgm.sql(`DROP TABLE IF EXISTS headset_achados_perdidos;`);
};
