import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { RoomsService } from '../services/rooms.service';
const router = Router();


const createRoomSchema = z.object({
  buildingId: z.string().uuid(),
  roomNumber: z.string().min(1),
  floorNumber: z.number().int(),
  capacity: z.number().int().positive().optional(),
});
// GET /rooms?buildingId=123
router.get('/', async (req: Request, res: Response) => {
  try {
    const buildingId = req.query.buildingId as string | undefined;
    const rooms = await RoomsService.listRooms(buildingId);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.use(requireAuth, requireRole(RoleType.ADMIN));
router.post('/', async (req: Request, res: Response) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const room = await RoomsService.createRoom(
      parsed.data.buildingId,
      parsed.data.roomNumber,
      parsed.data.floorNumber,
      parsed.data.capacity
    );
    res.status(201).json(room);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});
router.get('/:roomId', async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const room = await RoomsService.getRoomDetails(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room details' });
  }
});
export default router;