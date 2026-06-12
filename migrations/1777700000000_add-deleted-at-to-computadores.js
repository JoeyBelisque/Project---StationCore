
exports.up = (pgm) => {
  pgm.addColumn('computadores', {
    deleted_at: { type: 'timestamptz', default: null }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('computadores', 'deleted_at');
};
