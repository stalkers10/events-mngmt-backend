import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { BuildingsService } from '../services/buildings.service';


const router = Router();
// Protect all building routes

router.use(requireAuth, requireRole(RoleType.ADMIN));
const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const buildings = await BuildingsService.list();
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  
  try {
    const building = await BuildingsService.create(parsed.data.name, parsed.data.address);
    res.status(201).json(building);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create building' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await BuildingsService.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

export default router;