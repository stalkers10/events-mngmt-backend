exports.shorthands = undefined;

/**
 * Adds ownership columns to custom ticket templates so that a CLIENT_ADMIN
 * can only delete templates they created, while a SUPER_ADMIN can delete any.
 * - created_by: the user who created the template (null for global/seeded).
 * - client_id:  the tenant owner (CLIENT_ADMIN user id) of the template.
 *               Null for SUPER_ADMIN-created or global templates.
 */
exports.up = (pgm) => {
  pgm.addColumns('ticket_templates', {
    created_by: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    client_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addIndex('ticket_templates', 'client_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('ticket_templates', 'client_id');
  pgm.dropColumns('ticket_templates', ['created_by', 'client_id']);
};
