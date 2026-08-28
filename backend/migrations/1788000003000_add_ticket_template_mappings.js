exports.up = (pgm) => {
  pgm.addColumn('ticket_templates', {
    single_mapping: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    couple_mapping: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('ticket_templates', ['single_mapping', 'couple_mapping']);
};
