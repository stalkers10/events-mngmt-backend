
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { ReservationsService } from '../services/reservations.service';
const router = Router();

router.use(requireAuth, requireRole(RoleType.ADMIN));
const createReservationSchema = z.object({
  eventId: z.string().uuid(),
  tableId: z.string().uuid(),
  chairId: z.string().uuid(),
  invitee: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
});
router.get('/event/:eventId/occupancy', async (req: Request<{ eventId: string }>, res: Response) => {
  try {
    const occupancy = await ReservationsService.getEventOccupancy(req.params.eventId);
    res.json(occupancy);
  } catch (err: any) {
    if (err.message === 'Event not found') {
       res.status(404).json({ error: err.message });
       return;
    }
    res.status(500).json({ error: 'Failed to fetch occupancy' });
  }
});
router.post('/', async (req: Request, res: Response) => {
  const parsed = createReservationSchema.safeParse(req.body);
  if (!parsed.success) {
     res.status(400).json({ error: parsed.error.flatten() });
     return; 
  }
  try {
    const result = await ReservationsService.createReservationAndTicket(
      parsed.data.eventId,
      parsed.data.tableId,
      parsed.data.chairId,
      parsed.data.invitee
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});
router.delete('/:reservationId', async (req: Request<{ reservationId: string }>, res: Response) => {
  try {
    await ReservationsService.cancelReservation(req.params.reservationId);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});
export default router;