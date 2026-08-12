
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE computadores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE computadores DROP COLUMN IF EXISTS deleted_at;`);
};
