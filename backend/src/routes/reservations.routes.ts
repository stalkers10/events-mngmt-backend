import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, resolveClientId } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { ReservationsService } from '../services/reservations.service';
import { query } from '../config/db';

const router = Router();

const createReservationSchema = z.object({
  eventId: z.string().uuid(),
  tableId: z.string().uuid(),
  chairId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  invitee: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
});

/**
 * GET /reservations/event/:eventId/occupancy
 *
 * Accessible to SUPER_ADMIN, CLIENT_ADMIN and GATE_STAFF.
 * Gate staff are additionally checked against gate_staff_assignments.
 */
router.get(
  '/event/:eventId/occupancy',
  requireAuth,
  async (req: Request<{ eventId: string }>, res: Response) => {
    const user = req.user!;
    const { eventId } = req.params;

    // Gate staff: verify they are assigned to this event
    if (user.role === RoleType.GATE_STAFF) {
      const assignment = await query(
        `SELECT 1 FROM gate_staff_assignments WHERE user_id = $1 AND event_id = $2`,
        [user.id, eventId]
      );
      if (assignment.rows.length === 0) {
        res.status(403).json({ error: 'You are not assigned to this event' });
        return;
      }
    }

    try {
      const clientId = resolveClientId(user);
      const occupancy = await ReservationsService.getEventOccupancy(eventId, clientId);
      res.json(occupancy);
    } catch (err: any) {
      if (err.message === 'Event not found' || err.statusCode === 403) {
        res.status(err.statusCode ?? 404).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch occupancy' });
    }
  }
);

// All remaining reservation routes are Super Admin or Client Admin only
router.use(requireAuth, requireRole(RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN));

router.post('/', async (req: Request, res: Response) => {
  const parsed = createReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const clientId = resolveClientId(req.user!);
    const result = await ReservationsService.createReservationAndTicket(
      parsed.data.eventId,
      parsed.data.tableId,
      parsed.data.chairId,
      parsed.data.invitee,
      parsed.data.roomId,
      clientId
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.statusCode ?? 409).json({ error: err.message });
  }
});

router.delete('/:reservationId', async (req: Request<{ reservationId: string }>, res: Response) => {
  try {
    const clientId = resolveClientId(req.user!);
    await ReservationsService.cancelReservation(req.params.reservationId, clientId);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Failed to cancel reservation' });
  }
});

export default router;
