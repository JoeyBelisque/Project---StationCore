export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE headsets DROP CONSTRAINT IF EXISTS headsets_status_chk;`);
  pgm.sql(`
    ALTER TABLE headsets
      ADD CONSTRAINT headsets_status_chk
      CHECK (status IN (
        'em_uso', 'estoque', 'defeito', 'emprestimo', 'entrega', 'manutencao',
        'reserva', 'troca_pendente', 'desligado', 'perdido', 'furtado'
      ));
  `);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE headsets DROP CONSTRAINT IF EXISTS headsets_status_chk;`);
  pgm.sql(`
    ALTER TABLE headsets
      ADD CONSTRAINT headsets_status_chk
      CHECK (status IN (
        'em_uso', 'estoque', 'defeito', 'emprestimo', 'entrega', 'manutencao',
        'reserva', 'troca_pendente', 'desligado'
      ));
  `);
};
