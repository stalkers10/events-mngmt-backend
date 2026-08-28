import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { TicketTemplatesService } from '../services/ticket-templates.service';

const router = Router();

router.use(requireAuth);
router.use(requireRole(RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN));

const createSchema = z.object({
  category: z.string().min(1).max(50),
  themeName: z.string().min(1).max(100),
  themeDescription: z.string().max(1000).optional().nullable(),
  singleHtml: z.string().min(1),
  coupleHtml: z.string().min(1),
  singleMapping: z.record(z.string(), z.string()).default({}),
  coupleMapping: z.record(z.string(), z.string()).default({}),
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await TicketTemplatesService.list());
  } catch {
    res.status(500).json({ error: 'Failed to fetch ticket templates' });
  }
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const t = await TicketTemplatesService.getById(req.params.id);
    if (!t) {
      res.status(404).json({ error: 'Ticket template not found' });
      return;
    }
    res.json(t);
  } catch {
    res.status(500).json({ error: 'Failed to fetch ticket template' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const t = await TicketTemplatesService.create(
      parsed.data.category,
      parsed.data.themeName,
      parsed.data.themeDescription ?? null,
      parsed.data.singleHtml,
      parsed.data.coupleHtml,
      parsed.data.singleMapping,
      parsed.data.coupleMapping
    );
    res.status(201).json(t);
  } catch {
    res.status(500).json({ error: 'Failed to create ticket template' });
  }
});

export const ticketTemplatesRouter = router;
