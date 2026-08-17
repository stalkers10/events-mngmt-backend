/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Distinguishes a normal single-seat booking from a couple booking
  // (two adjacent chairs reserved together under one invitee + one ticket).
  pgm.createType('reservation_type', ['SINGLE', 'COUPLE']);

  pgm.addColumn('reservations', {
    reservation_type: {
      type: 'reservation_type',
      notNull: true,
      default: 'SINGLE',
    },
    // Links the two reservations of a couple booking so they can be
    // cancelled together and surfaced on the shared ticket.
    couple_group_id: {
      type: 'uuid',
    },
  });

  pgm.createIndex('reservations', ['couple_group_id']);
};

exports.down = (pgm) => {
  pgm.dropIndex('reservations', 'reservations_couple_group_id_index');
  pgm.dropColumn('reservations', 'couple_group_id');
  pgm.dropColumn('reservations', 'reservation_type');
  pgm.dropType('reservation_type');
};
