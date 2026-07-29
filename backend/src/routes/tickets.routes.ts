import { Router, Request, Response } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { TicketsService } from '../services/tickets.service';
const router = Router();

// Protect all ticket routes with Auth
router.use(requireAuth);
const scanSchema = z.object({
  qrToken: z.string().min(1),
});

// Scanning is allowed for both Admin and Gate Staff
router.post('/scan', async (req: Request, res: Response) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
     res.status(400).json({ error: parsed.error.flatten() });
     return;
  }
  try {
    const user = req.user!;
    const result = await TicketsService.scanTicket(parsed.data.qrToken, user.id, user.role);
    res.json(result);
  } catch (err: any) {
    // Return 400 for bad scans or 403 for unauthorized events
    const status = err.message.includes('not assigned') ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

// PDF download is Admin only
router.get('/:ticketId', requireRole(RoleType.ADMIN), async (req: Request<{ ticketId: string }>, res: Response) => {
  try {
    const details = await TicketsService.getDetailsById(req.params.ticketId);
    if (!details) {
      res.status(404).json({ error: 'Ticket not found' });
      return; 
    }
    const qrDataUrl = await QRCode.toDataURL(details.qr_token, { errorCorrectionLevel: 'H' });
    res.json({ ...details, qrDataUrl });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

router.get('/:ticketId/pdf', requireRole(RoleType.ADMIN), async (req: Request<{ ticketId: string }>, res: Response) => {
  try {
    const pdfBuffer = await TicketsService.generatePdf(req.params.ticketId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${req.params.ticketId}.pdf`);
    res.send(pdfBuffer);
  } catch (err: any) {
    if (err.message === 'Ticket not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to generate PDF ticket' });
  }
});
export default router;
