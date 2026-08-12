import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, resolveClientId } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { RoomsService } from '../services/rooms.service';

const router = Router();

const createRoomSchema = z.object({
  buildingId: z.string().uuid(),
  roomNumber: z.string().min(1),
  floorNumber: z.number().int(),
  capacity: z.number().int().positive().optional(),
});

/**
 * GET /rooms?buildingId=uuid
 * Public within the app — both admin roles and gate staff can read rooms.
 * Tenant filtering is applied via the building's client_id.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const buildingId = req.query.buildingId as string | undefined;
    const clientId = resolveClientId(req.user!);
    const rooms = await RoomsService.listRooms(buildingId, clientId);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Write routes require SUPER_ADMIN or CLIENT_ADMIN
router.use(requireAuth, requireRole(RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN));

router.post('/', async (req: Request, res: Response) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const clientId = resolveClientId(req.user!);
    const room = await RoomsService.createRoom(
      parsed.data.buildingId,
      parsed.data.roomNumber,
      parsed.data.floorNumber,
      parsed.data.capacity,
      clientId,
    );
    res.status(201).json(room);
  } catch (err: any) {
    res.status(err.statusCode ?? 409).json({ error: err.message });
  }
});

router.get('/:roomId', async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const clientId = resolveClientId(req.user!);
    const room = await RoomsService.getRoomDetails(req.params.roomId, clientId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room details' });
  }
});

router.delete('/:roomId', async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const clientId = resolveClientId(req.user!);
    await RoomsService.deleteRoom(req.params.roomId, clientId);
    res.status(204).send();
  } catch (err: any) {
    if (err.code === '23503') {
      res.status(409).json({ error: 'Cannot delete room with associated events or reservations' });
      return;
    }
    res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Failed to delete room' });
  }
});

export default router;