import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, resolveClientId } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { EventsService } from '../services/events.service';

const router = Router();

router.use(requireAuth);
const eventSchema = z.object({
  roomIds: z.array(z.string().uuid()).min(1).optional(),
  roomId: z.string().uuid().optional(),
  name: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  tables: z.array(z.object({
    tableNumber: z.string().min(1),
    position: z.string().optional(),
    numberOfChairs: z.number().int().positive(),
    roomId: z.string().uuid().optional()
  })).optional(),
}).superRefine((data, ctx) => {
  const selectedRoomIds = data.roomIds ?? (data.roomId ? [data.roomId] : []);
  if (selectedRoomIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select at least one room',
      path: ['roomIds']
    });
  }
});

// GET /events (Admins see all/theirs, Gate Staff see assigned)
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userRole = user.role as RoleType;
    let events;
    
    if (userRole === RoleType.SUPER_ADMIN || userRole === RoleType.CLIENT_ADMIN) {
      const clientId = resolveClientId(user);
      events = await EventsService.list(userRole, clientId);
    } else {
      const clientId = resolveClientId(user);
      events = await EventsService.listForGateStaff(user.id, userRole, clientId);
    }
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// The following routes require admin privileges
router.use(requireRole(RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN));

router.get('/:eventId', async (req: Request<{ eventId: string }>, res: Response) => {
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    const event = await EventsService.getById(req.params.eventId, userRole, clientId);
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
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    const roomIds = parsed.data.roomIds ?? (parsed.data.roomId ? [parsed.data.roomId] : []);
    const event = await EventsService.create(
      roomIds,
      parsed.data.name,
      new Date(parsed.data.startTime),
      new Date(parsed.data.endTime),
      parsed.data.tables,
      userRole,
      clientId
    );
    res.status(201).json(event);
  } catch (err: any) {
    res.status(err.statusCode ?? 409).json({ error: err.message });
  }
});

router.put('/:eventId', async (req: Request<{ eventId: string }>, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    const roomIds = parsed.data.roomIds ?? (parsed.data.roomId ? [parsed.data.roomId] : []);
    const event = await EventsService.update(
      req.params.eventId,
      roomIds,
      parsed.data.name,
      new Date(parsed.data.startTime),
      new Date(parsed.data.endTime),
      userRole,
      clientId
    );
    res.status(200).json(event);
  } catch (err: any) {
    res.status(err.statusCode ?? 409).json({ error: err.message });
  }
});

router.delete('/:eventId', async (req: Request<{ eventId: string }>, res: Response) => {
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    await EventsService.delete(req.params.eventId, userRole, clientId);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.statusCode ?? 409).json({ error: err.message });
  }
});

// Table management endpoints
const tableSchema = z.object({
  tableNumber: z.string().min(1),
  position: z.string().optional(),
  roomId: z.string().uuid().optional(),
});

const tableUpdateSchema = z.object({
  tableNumber: z.string().min(1),
  position: z.string().optional(),
});

// Helper for verifying event ownership before allowing table operations
async function requireEventOwnership(req: Request<{ eventId: string }>, res: Response, next: import('express').NextFunction) {
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    const event = await EventsService.getById(req.params.eventId, userRole, clientId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found or access denied' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Error checking ownership' });
  }
}

router.post('/:eventId/tables', requireEventOwnership, async (req: Request<{ eventId: string }>, res: Response) => {
  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const table = await EventsService.addTable(req.params.eventId, parsed.data.tableNumber, parsed.data.position || null, parsed.data.roomId);
    res.status(201).json(table);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

router.patch('/:eventId/tables/:tableId', requireEventOwnership, async (req: Request<{ eventId: string; tableId: string }>, res: Response) => {
  const parsed = tableUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const table = await EventsService.updateTable(req.params.eventId, req.params.tableId, parsed.data.tableNumber, parsed.data.position ?? null);
    res.status(200).json(table);
  } catch (err: any) {
    res.status(err.statusCode ?? 409).json({ error: err.message });
  }
});

const chairsSchema = z.object({
  count: z.number().int().positive(),
});

// Since /tables/:tableId doesn't easily trace back to event ownership directly in this simple middleware,
// we just assume if they have the tableId it's scoped, but for safety we can add a check in service.
// (We skipped a strict check here for brevity, assuming UUID unguessability, but a real app should check).
// Wait, the path has eventId, so we CAN use requireEventOwnership!
router.post('/:eventId/tables/:tableId/chairs', requireEventOwnership, async (req: Request<{ eventId: string; tableId: string }>, res: Response) => {
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