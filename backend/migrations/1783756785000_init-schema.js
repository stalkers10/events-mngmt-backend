/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Initial schema for Elite Events.
 * Mirrors the class diagram: venue layout (static) is separated from
 * event-scoped occupancy (Reservation/Ticket), per the spec.
 */
exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true }); // for gen_random_uuid()

  // ---- Enums ----
  pgm.createType('role_type', ['ADMIN', 'GATE_STAFF']);
  pgm.createType('reservation_status', ['ACTIVE', 'PENDING_CANCELLATION', 'CANCELLED']);
  pgm.createType('ticket_status', ['ISSUED', 'CHECKED_IN', 'CANCELLED']);

  // ---- Users (Admin is hardcoded in .env; this table is for Gate Staff) ----
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    username: { type: 'varchar(100)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    role: { type: 'role_type', notNull: true, default: 'GATE_STAFF' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ---- Venue layout (static master data) ----
  pgm.createTable('buildings', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    address: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('rooms', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    building_id: {
      type: 'uuid',
      notNull: true,
      references: 'buildings',
      onDelete: 'CASCADE',
    },
    room_number: { type: 'varchar(50)', notNull: true },
    floor_number: { type: 'integer', notNull: true },
    capacity: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  // Room number is unique per building, per floor (no global uniqueness required)
  pgm.addConstraint('rooms', 'rooms_building_room_number_unique', {
    unique: ['building_id', 'room_number'],
  });

  pgm.createTable('tables', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    room_id: { type: 'uuid', notNull: true, references: 'rooms', onDelete: 'CASCADE' },
    table_number: { type: 'varchar(50)', notNull: true },
    position: { type: 'varchar(100)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  // Table number unique within its room (spec: "no duplicates")
  pgm.addConstraint('tables', 'tables_room_table_number_unique', {
    unique: ['room_id', 'table_number'],
  });

  pgm.createTable('chairs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    table_id: { type: 'uuid', notNull: true, references: 'tables', onDelete: 'CASCADE' },
    chair_number: { type: 'varchar(50)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  // Chair number unique within its table (spec: "no duplicates")
  pgm.addConstraint('chairs', 'chairs_table_chair_number_unique', {
    unique: ['table_id', 'chair_number'],
  });

  // ---- Events ----
  pgm.createTable('events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    room_id: { type: 'uuid', notNull: true, references: 'rooms', onDelete: 'RESTRICT' },
    name: { type: 'varchar(200)', notNull: true },
    start_time: { type: 'timestamptz', notNull: true },
    end_time: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('events', 'events_end_after_start', {
    check: 'end_time > start_time',
  });
  // Speeds up the schedule-conflict check (Section 2 of the spec)
  pgm.createIndex('events', ['room_id', 'start_time', 'end_time']);

  // ---- Invitees ----
  pgm.createTable('invitees', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(200)', notNull: true },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ---- Reservations (event-scoped occupancy) ----
  pgm.createTable('reservations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    event_id: { type: 'uuid', notNull: true, references: 'events', onDelete: 'CASCADE' },
    table_id: { type: 'uuid', notNull: true, references: 'tables', onDelete: 'RESTRICT' },
    chair_id: { type: 'uuid', notNull: true, references: 'chairs', onDelete: 'RESTRICT' },
    invitee_id: { type: 'uuid', notNull: true, references: 'invitees', onDelete: 'RESTRICT' },
    status: { type: 'reservation_status', notNull: true, default: 'ACTIVE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    cancelled_at: { type: 'timestamptz' },
  });
  // Core anti-double-booking rule: a chair can only have ONE active
  // reservation per event. Cancelled/pending_cancellation rows don't block
  // a new reservation on that chair (partial unique index).
  pgm.createIndex('reservations', ['event_id', 'chair_id'], {
    unique: true,
    where: "status = 'ACTIVE'",
    name: 'reservations_one_active_per_chair_per_event',
  });
  pgm.createIndex('reservations', ['event_id', 'table_id']);

  // ---- Tickets ----
  pgm.createTable('tickets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    reservation_id: {
      type: 'uuid',
      notNull: true,
      unique: true, // one ticket per reservation
      references: 'reservations',
      onDelete: 'CASCADE',
    },
    qr_token: { type: 'varchar(64)', notNull: true, unique: true },
    status: { type: 'ticket_status', notNull: true, default: 'ISSUED' },
    issued_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    checked_in_at: { type: 'timestamptz' },
  });

  // ---- Gate Staff assignments (many-to-many: User <-> Event) ----
  pgm.createTable('gate_staff_assignments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    event_id: { type: 'uuid', notNull: true, references: 'events', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('gate_staff_assignments', 'gate_staff_assignments_unique', {
    unique: ['user_id', 'event_id'],
  });
};

exports.down = (pgm) => {
  pgm.dropTable('gate_staff_assignments');
  pgm.dropTable('tickets');
  pgm.dropTable('reservations');
  pgm.dropTable('invitees');
  pgm.dropTable('events');
  pgm.dropTable('chairs');
  pgm.dropTable('tables');
  pgm.dropTable('rooms');
  pgm.dropTable('buildings');
  pgm.dropTable('users');
  pgm.dropType('ticket_status');
  pgm.dropType('reservation_status');
  pgm.dropType('role_type');
};
