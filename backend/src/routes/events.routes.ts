import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { EventsService } from '../services/events.service';
const router = Router();

router.use(requireAuth);
const eventSchema = z.object({
  roomId: z.string().uuid(),
  name: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  tables: z.array(z.object({
    tableNumber: z.string().min(1),
    position: z.string().optional(),
    numberOfChairs: z.number().int().positive()
  })).optional(),
});
// GET /events (Admins see all, Gate Staff see assigned)
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let events;
    if (user.role === RoleType.ADMIN) {
      events = await EventsService.listAll();
    } else {
      events = await EventsService.listForGateStaff(user.id);
    }
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});
// The following routes are Admin-only
router.use(requireRole(RoleType.ADMIN));
router.get('/:eventId', async (req: Request<{ eventId: string }>, res: Response) => {
  try {
    const event = await EventsService.getById(req.params.eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});
router.post('/', async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const event = await EventsService.create(
      parsed.data.roomId,
      parsed.data.name,
      new Date(parsed.data.startTime),
      new Date(parsed.data.endTime),
      parsed.data.tables
    );
    res.status(201).json(event);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});
router.put('/:eventId', async (req: Request<{ eventId: string }>, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const event = await EventsService.update(
      req.params.eventId,
      parsed.data.roomId,
      parsed.data.name,
      new Date(parsed.data.startTime),
      new Date(parsed.data.endTime)
    );
    res.status(200).json(event);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});
router.delete('/:eventId', async (req: Request<{ eventId: string }>, res: Response) => {
  try {
    await EventsService.delete(req.params.eventId);
    res.status(204).send();
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// Table management endpoints
const tableSchema = z.object({
  tableNumber: z.string().min(1),
  position: z.string().optional(),
});
router.post('/:eventId/tables', async (req: Request<{ eventId: string }>, res: Response) => {
  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const table = await EventsService.addTable(req.params.eventId, parsed.data.tableNumber, parsed.data.position || null);
    res.status(201).json(table);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

const chairsSchema = z.object({
  count: z.number().int().positive(),
});
router.post('/:eventId/tables/:tableId/chairs', async (req: Request<{ eventId: string; tableId: string }>, res: Response) => {
  const parsed = chairsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const chairs = await EventsService.addChairs(req.params.tableId, parsed.data.count);
    res.status(201).json(chairs);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

export default router;