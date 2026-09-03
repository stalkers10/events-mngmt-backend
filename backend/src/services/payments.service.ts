import { query, withTransaction } from "../config/db";
import {
  getSubscriptionPlan,
  SubscriptionPlanCode,
} from "../config/subscriptionPlans";
import { CamPayService } from "./campay.service";

interface Payment {
  id: string;
  client_id: string;
  intended_plan_code: SubscriptionPlanCode;
  amount_xaf: number;
  provider_reference: string | null;
  status: string;
}
const normalizedPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9 ? `237${digits}` : digits;
};
export const PaymentsService = {
  async refreshPendingForClient(clientId: string) {
    const pending = await query<Payment>(`SELECT * FROM payment_transactions WHERE client_id=$1 AND status='PENDING' AND provider_reference IS NOT NULL`, [clientId]);
    return Promise.all(pending.rows.map((payment) => this.refresh(payment.id, clientId)));
  },
  /** Super Admin: full payment history for a client (pending/failed included). */
  async listForClient(clientId: string) {
    const result = await query(
      `SELECT id, client_id, intended_plan_code, amount_xaf, currency, provider,
              provider_reference, payment_phone, payment_operator, status,
              initiated_at, confirmed_at, failed_at, created_at
       FROM payment_transactions WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId],
    );
    return result.rows;
  },
  /** Client-facing invoice history: issued/payable invoice records derived from
   * successful and pending payment transactions. */
  async listInvoicesForClient(clientId: string) {
    const result = await query(
      `SELECT pt.id, pt.intended_plan_code, pt.amount_xaf, pt.currency, pt.status,
              pt.initiated_at, pt.confirmed_at, pt.created_at,
              u.name AS client_name, u.username AS client_username
       FROM payment_transactions pt
       JOIN users u ON u.id = pt.client_id
       WHERE pt.client_id = $1 AND pt.status IN ('SUCCESSFUL', 'PENDING', 'FAILED', 'EXPIRED', 'CANCELLED')
       ORDER BY pt.created_at DESC`,
      [clientId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      number: `INV-${String(row.created_at).slice(0, 10)}-${row.id.slice(0, 4).toUpperCase()}`,
      date: row.initiated_at ?? row.created_at,
      amountXaf: row.amount_xaf,
      currency: row.currency,
      status: row.status,
      clientName: row.client_name ?? row.client_username ?? '',
    }));
  },
  async checkout(
    clientId: string,
    planCode: SubscriptionPlanCode,
    phone: string,
  ) {
    const plan = getSubscriptionPlan(planCode);
    if (planCode === "FREE" || plan.priceXaf === null)
      throw Object.assign(new Error("Selected plan cannot be purchased"), {
        statusCode: 400,
      });
    const created = await query<Payment>(
      `INSERT INTO payment_transactions (client_id, intended_plan_code, amount_xaf, payment_phone) VALUES ($1,$2,$3,$4) RETURNING *`,
      [clientId, planCode, plan.priceXaf, normalizedPhone(phone)],
    );
    try {
      const campay = await CamPayService.initiateCollection(
        plan.priceXaf,
        normalizedPhone(phone),
        created.rows[0].id,
        `Elite Events ${plan.name} subscription`,
      );
      await query(
        `UPDATE payment_transactions SET provider_reference=$1, payment_operator=$2, updated_at=NOW() WHERE id=$3`,
        [campay.reference, campay.operator ?? null, created.rows[0].id],
      );
      return {
        paymentId: created.rows[0].id,
        reference: campay.reference,
        status: "PENDING",
        ussdCode: campay.ussd_code,
      };
    } catch (error) {
      await query(
        `UPDATE payment_transactions SET status='FAILED', failed_at=NOW() WHERE id=$1`,
        [created.rows[0].id],
      );
      throw error;
    }
  },
  async refresh(paymentId: string, clientId?: string) {
    const found = await query<Payment>(
      `SELECT * FROM payment_transactions WHERE id=$1${clientId ? " AND client_id=$2" : ""}`,
      clientId ? [paymentId, clientId] : [paymentId],
    );
    if (!found.rows.length)
      throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
    const payment = found.rows[0];
    if (!payment.provider_reference || payment.status !== "PENDING")
      return payment;
    const remote = await CamPayService.transactionStatus(
      payment.provider_reference,
    );
    return this.apply(
      payment,
      remote.status,
      remote.reference,
      remote.operator,
    );
  },
  async refreshByReference(reference: string) {
    const found = await query<Payment>(
      `SELECT * FROM payment_transactions WHERE provider_reference=$1`,
      [reference],
    );
    if (!found.rows.length)
      throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
    const remote = await CamPayService.transactionStatus(reference);
    return this.apply(
      found.rows[0],
      remote.status,
      remote.reference,
      remote.operator,
    );
  },
  async apply(
    payment: Payment,
    remoteStatus: string,
    reference: string,
    operator?: string,
  ) {
    const status =
      remoteStatus === "SUCCESSFUL"
        ? "SUCCESSFUL"
        : remoteStatus === "FAILED"
          ? "FAILED"
          : "PENDING";
    return withTransaction(async (client) => {
      await client.query(
        `UPDATE payment_transactions SET status=$1::payment_status, provider_reference=$2, payment_operator=COALESCE($3,payment_operator), confirmed_at=CASE WHEN $1::payment_status='SUCCESSFUL'::payment_status THEN NOW() ELSE confirmed_at END, failed_at=CASE WHEN $1::payment_status='FAILED'::payment_status THEN NOW() ELSE failed_at END, updated_at=NOW() WHERE id=$4`,
        [status, reference, operator ?? null, payment.id],
      );
      if (status === "SUCCESSFUL") {
        const now = new Date();
        const end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        await client.query(
          `INSERT INTO subscriptions (client_id,plan_code,status,current_period_start,current_period_end,price_xaf) VALUES ($1,$2,'ACTIVE',$3,$4,$5) ON CONFLICT (client_id) DO UPDATE SET plan_code=EXCLUDED.plan_code,status='ACTIVE',current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,price_xaf=EXCLUDED.price_xaf,cancel_at_period_end=false,updated_at=NOW()`,
          [
            payment.client_id,
            payment.intended_plan_code,
            now,
            end,
            payment.amount_xaf,
          ],
        );
      }
      return { ...payment, status };
    });
  },
};
