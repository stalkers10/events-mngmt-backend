import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { ClientsService } from '../services/clients.service';

const router = Router();

// All client-management routes are Super Admin only
router.use(requireAuth, requireRole(RoleType.SUPER_ADMIN));

const createSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  password: z.string().min(8).optional(),
});

/** GET /clients — list all client admins */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const clients = await ClientsService.list();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/** POST /clients — create a new client admin */
router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const client = await ClientsService.create(
      parsed.data.username,
      parsed.data.password,
      parsed.data.name,
      parsed.data.email,
      parsed.data.phone,
    );
    res.status(201).json(client);
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

/** PUT /clients/:id — update a client admin's profile */
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const client = await ClientsService.update(
      req.params.id,
      parsed.data.name,
      parsed.data.email,
      parsed.data.phone,
      parsed.data.password,
    );
    res.json(client);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/** PATCH /clients/:id/deactivate — soft-block a client admin */
router.patch('/:id/deactivate', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await ClientsService.deactivate(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate client' });
  }
});

/** PATCH /clients/:id/reactivate — re-enable a deactivated client admin */
router.patch('/:id/reactivate', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await ClientsService.reactivate(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to reactivate client' });
  }
});

/** DELETE /clients/:id — permanently delete a client and ALL their data */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await ClientsService.deletePermanently(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
