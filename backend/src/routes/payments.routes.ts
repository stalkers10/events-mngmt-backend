import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { PaymentsService } from "../services/payments.service";
import { RoleType } from "../types/auth";

export const campayWebhookRouter = Router();
async function webhook(req: Request, res: Response) {
  const data = {
    ...(req.query as Record<string, unknown>),
    ...(req.body as Record<string, unknown>),
  };
  const reference = typeof data.reference === "string" ? data.reference : "";
  // A callback is never treated as proof of payment. Its reference is used to
  // fetch the authoritative transaction state directly from CamPay before any
  // subscription changes. This also keeps the endpoint safe if CamPay's
  // dashboard callback signature format changes.
  if (!reference) {
    res.status(400).json({ error: "Missing CamPay reference" });
    return;
  }
  try {
    await PaymentsService.refreshByReference(reference);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("CamPay webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
campayWebhookRouter.get("/campay", webhook);
campayWebhookRouter.post("/campay", webhook);

const router = Router();
router.use(requireAuth, requireRole(RoleType.CLIENT_ADMIN));
const checkoutSchema = z.object({
  planCode: z.enum(["GO", "PRO"]),
  phone: z.string().min(9).max(20),
});
router.post("/checkout", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "A valid plan and Mobile Money number are required" });
    return;
  }
  try {
    res
      .status(201)
      .json(
        await PaymentsService.checkout(
          req.user!.clientId!,
          parsed.data.planCode,
          parsed.data.phone,
        ),
      );
  } catch (error: any) {
    res.status(error.statusCode ?? 502).json({ error: error.message });
  }
});
router.post("/payments/reconcile", async (req, res) => {
  try {
    res.json(await PaymentsService.refreshPendingForClient(req.user!.clientId!));
  } catch (error: any) {
    res.status(error.statusCode ?? 502).json({ error: error.message });
  }
});
router.get("/payments/:id", async (req, res) => {
  try {
    res.json(await PaymentsService.refresh(req.params.id, req.user!.clientId!));
  } catch (error: any) {
    res.status(error.statusCode ?? 502).json({ error: error.message });
  }
});

/**
 * Super Admin only: inspect a client's payment history (including pending and
 * failed transactions). Per-route guard so it never collides with the
 * CLIENT_ADMIN-guarded routes above.
 */
export const adminPaymentRouter = Router();
adminPaymentRouter.get('/admin/payments', requireAuth, requireRole(RoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
  if (!clientId) {
    res.status(400).json({ error: 'clientId query parameter is required' });
    return;
  }
  try {
    res.json(await PaymentsService.listForClient(clientId));
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

export default router;
