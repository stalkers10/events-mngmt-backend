/* eslint-disable camelcase */
exports.shorthands = undefined;

/**
 * Migration: 3-Role Architecture
 * - Adds SUPER_ADMIN and CLIENT_ADMIN to role_type enum
 * - Adds name, email, phone, client_id columns to users
 * - Adds client_id to buildings, events, invitees
 * - Gate Staff rows get client_id pointing to their CLIENT_ADMIN owner
 */
exports.up = async (pgm) => {
  // 1. Extend the enum with new role values
  pgm.sql(`ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
  pgm.sql(`ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'CLIENT_ADMIN'`);

  // 2. Add profile columns to users (for CLIENT_ADMIN rows)
  pgm.addColumns('users', {
    name:  { type: 'varchar(200)' },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
  });

  // 3. Add client_id to users (self-referential: GATE_STAFF rows point to their CLIENT_ADMIN)
  pgm.addColumns('users', {
    client_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  // 4. Add client_id to buildings (CLIENT_ADMIN owns buildings they create)
  pgm.addColumns('buildings', {
    client_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  // 5. Add client_id to events
  pgm.addColumns('events', {
    client_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  // 6. Add client_id to invitees
  pgm.addColumns('invitees', {
    client_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  // 7. Indexes for fast tenant-scoped queries
  pgm.createIndex('buildings', ['client_id']);
  pgm.createIndex('events',    ['client_id']);
  pgm.createIndex('invitees',  ['client_id']);
  pgm.createIndex('users',     ['client_id']);
};

exports.down = async (pgm) => {
  pgm.dropIndex('users',     ['client_id']);
  pgm.dropIndex('invitees',  ['client_id']);
  pgm.dropIndex('events',    ['client_id']);
  pgm.dropIndex('buildings', ['client_id']);

  pgm.dropColumns('invitees',  ['client_id']);
  pgm.dropColumns('events',    ['client_id']);
  pgm.dropColumns('buildings', ['client_id']);
  pgm.dropColumns('users',     ['client_id', 'name', 'email', 'phone']);

  // NOTE: PostgreSQL does not support removing enum values.
  // SUPER_ADMIN and CLIENT_ADMIN remain in the enum after rollback.
};
