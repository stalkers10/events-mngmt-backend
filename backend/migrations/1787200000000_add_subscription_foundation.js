/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * SaaS billing foundation. Plan definitions themselves live in backend code
 * while this migration stores each tenant's effective subscription, payment
 * audit trail, and immutable usage records.
 */
exports.up = async (pgm) => {
  pgm.createType('subscription_plan_code', ['FREE', 'GO', 'PRO']);
  pgm.createType('subscription_status', [
    'FREE',
    'PENDING_PAYMENT',
    'ACTIVE',
    'PAST_DUE',
    'CANCEL_AT_PERIOD_END',
    'EXPIRED',
  ]);
  pgm.createType('payment_status', ['PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED', 'CANCELLED']);

  pgm.createTable('subscriptions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: { type: 'uuid', notNull: true, unique: true, references: 'users(id)', onDelete: 'CASCADE' },
    plan_code: { type: 'subscription_plan_code', notNull: true, default: 'FREE' },
    status: { type: 'subscription_status', notNull: true, default: 'FREE' },
    current_period_start: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    current_period_end: { type: 'timestamptz' },
    cancel_at_period_end: { type: 'boolean', notNull: true, default: false },
    price_xaf: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('subscriptions', ['status']);

  pgm.createTable('payment_transactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    intended_plan_code: { type: 'subscription_plan_code', notNull: true },
    amount_xaf: { type: 'integer', notNull: true },
    currency: { type: 'varchar(3)', notNull: true, default: 'XAF' },
    provider: { type: 'varchar(50)', notNull: true, default: 'CAMPAY' },
    provider_reference: { type: 'varchar(255)', unique: true },
    idempotency_key: { type: 'uuid', notNull: true, unique: true, default: pgm.func('gen_random_uuid()') },
    payment_phone: { type: 'varchar(32)' },
    payment_operator: { type: 'varchar(50)' },
    status: { type: 'payment_status', notNull: true, default: 'PENDING' },
    initiated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    confirmed_at: { type: 'timestamptz' },
    failed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('payment_transactions', ['client_id', 'status']);

  pgm.createTable('payment_webhook_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    provider: { type: 'varchar(50)', notNull: true, default: 'CAMPAY' },
    provider_event_id: { type: 'varchar(255)', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    received_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    processed_at: { type: 'timestamptz' },
    processing_error: { type: 'text' },
  });
  pgm.addConstraint('payment_webhook_events', 'payment_webhook_events_provider_event_unique', {
    unique: ['provider', 'provider_event_id'],
  });

  pgm.createTable('subscription_usage_ledger', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    usage_type: { type: 'varchar(50)', notNull: true },
    resource_id: { type: 'uuid', notNull: true },
    period_start: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('subscription_usage_ledger', 'subscription_usage_ledger_unique_resource', {
    unique: ['usage_type', 'resource_id'],
  });
  pgm.createIndex('subscription_usage_ledger', ['client_id', 'usage_type', 'period_start']);

  // Every existing Client Admin begins on the Free plan. The WHERE clause is
  // intentional: platform and gate-staff users must never receive subscriptions.
  pgm.sql(`
    INSERT INTO subscriptions (client_id, plan_code, status, price_xaf)
    SELECT id, 'FREE', 'FREE', 0
    FROM users
    WHERE role = 'CLIENT_ADMIN'
    ON CONFLICT (client_id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('subscription_usage_ledger');
  pgm.dropTable('payment_webhook_events');
  pgm.dropTable('payment_transactions');
  pgm.dropTable('subscriptions');
  pgm.dropType('payment_status');
  pgm.dropType('subscription_status');
  pgm.dropType('subscription_plan_code');
};
