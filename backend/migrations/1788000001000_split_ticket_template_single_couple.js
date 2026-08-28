exports.shorthands = undefined;

/**
 * Splits the single `ticket_template` column into two so an event can store a
 * separate template for SINGLE reservations and COUPLE reservations.
 */
exports.up = (pgm) => {
  pgm.renameColumn('events', 'ticket_template', 'ticket_template_single');
  pgm.addColumn('events', {
    ticket_template_couple: { type: 'varchar(50)', notNull: true, default: 'classic' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('events', 'ticket_template_couple');
  pgm.renameColumn('events', 'ticket_template_single', 'ticket_template');
};
