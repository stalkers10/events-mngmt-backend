/* eslint-disable camelcase */
'use strict';

exports.shorthands = undefined;

/**
 * Adds a `sessions` JSONB column to the events table.
 * Each session is: { label: string, datetime: string (ISO-8601), location: string }
 * Existing rows default to an empty array.
 */
exports.up = (pgm) => {
  pgm.addColumns('events', {
    sessions: {
      type: 'jsonb',
      notNull: true,
      default: '[]',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('events', ['sessions']);
};
