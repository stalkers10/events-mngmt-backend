/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

/**
 * Adds a `status` column to events so that events can exist as DRAFT before
 * all mandatory fields (room, times) are filled in. Also makes `room_id`,
 * `start_time`, and `end_time` nullable so a draft row can be inserted with
 * only a name.
 *
 * Default for existing rows is 'PUBLISHED' so nothing breaks.
 */
exports.up = (pgm) => {
  // Allow room_id / start_time / end_time to be NULL for draft events
  pgm.alterColumn('events', 'room_id', { notNull: false });
  pgm.alterColumn('events', 'start_time', { notNull: false });
  pgm.alterColumn('events', 'end_time', { notNull: false });

  // Drop the check constraint that requires end_time > start_time — it can't
  // hold for drafts where both are NULL. We re-apply it only for PUBLISHED.
  pgm.dropConstraint('events', 'events_end_after_start', { ifExists: true });

  // Add status column with safe default
  pgm.addColumns('events', {
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'PUBLISHED',
    },
  });

  // Check constraint that covers both cases
  pgm.addConstraint('events', 'events_status_valid', {
    check: "status IN ('DRAFT', 'PUBLISHED')",
  });

  // When status is PUBLISHED, enforce end_time > start_time
  pgm.addConstraint('events', 'events_published_end_after_start', {
    check: "status = 'DRAFT' OR end_time > start_time",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('events', 'events_published_end_after_start', { ifExists: true });
  pgm.dropConstraint('events', 'events_status_valid', { ifExists: true });
  pgm.dropColumns('events', ['status']);

  // Restore original constraints (assumes all rows are PUBLISHED at this point)
  pgm.addConstraint('events', 'events_end_after_start', {
    check: 'end_time > start_time',
  });
  pgm.alterColumn('events', 'room_id', { notNull: true });
  pgm.alterColumn('events', 'start_time', { notNull: true });
  pgm.alterColumn('events', 'end_time', { notNull: true });
};
