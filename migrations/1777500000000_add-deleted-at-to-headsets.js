export const up = (pgm) => {
  pgm.addColumn('headsets', {
    deleted_at: { type: 'TIMESTAMPTZ', default: null }
  });
};

export const down = (pgm) => {
  pgm.dropColumn('headsets', 'deleted_at');
};
