exports.shorthands = undefined;

/**
 * Stores custom ticket templates created from the UI (designer HTML).
 * Global/shared across the app (no client_id). Each row holds a single
 * template's single + couple HTML, grouped under a category and theme.
 */
exports.up = (pgm) => {
  pgm.createTable('ticket_templates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    category: { type: 'varchar(50)', notNull: true },
    theme_name: { type: 'varchar(100)', notNull: true },
    theme_description: { type: 'text' },
    single_html: { type: 'text', notNull: true },
    couple_html: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('ticket_templates');
};
