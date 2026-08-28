exports.shorthands = undefined;

/**
 * Adds a `ticket_template` column to events so each event can select its
 * ticket layout (per-event selection). Defaults to 'classic'.
 */
exports.up = (pgm) => {
  pgm.addColumn('events', {
    ticket_template: { type: 'varchar(50)', notNull: true, default: 'classic' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('events', 'ticket_template');
};
