
export const up = (pgm) => {
  // 1. Atualiza os dados existentes
  pgm.sql("UPDATE headsets SET categoria = 'operacao' WHERE categoria = 'estoque';");
  
  // 2. Altera o valor padrão da coluna
  pgm.alterColumn('headsets', 'categoria', {
    default: 'operacao'
  });

  // 3. Atualiza a constraint de check se ela existir (conforme visto no grep)
  pgm.sql(`
    ALTER TABLE headsets 
    DROP CONSTRAINT IF EXISTS headsets_categoria_chk;
    
    ALTER TABLE headsets 
    ADD CONSTRAINT headsets_categoria_chk 
    CHECK (categoria IN ('operacao', 'emprestimo', 'entrega', 'manutencao'));
  `);
};

export const down = (pgm) => {
  pgm.sql("UPDATE headsets SET categoria = 'estoque' WHERE categoria = 'operacao';");
  pgm.alterColumn('headsets', 'categoria', {
    default: 'estoque'
  });
  pgm.sql(`
    ALTER TABLE headsets 
    DROP CONSTRAINT IF EXISTS headsets_categoria_chk;
    
    ALTER TABLE headsets 
    ADD CONSTRAINT headsets_categoria_chk 
    CHECK (categoria IN ('estoque', 'emprestimo', 'entrega', 'manutencao'));
  `);
};
