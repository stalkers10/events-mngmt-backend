import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';

import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/rooms.routes';
import eventRoutes from './routes/events.routes';
import reservationRoutes from './routes/reservations.routes';
import ticketRoutes from './routes/tickets.routes';
import gateStaffRoutes from './routes/gateStaff.routes';
import buildingRoutes from './routes/buildings.routes';
import clientsRoutes from './routes/clients.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
    
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
app.use('/events', eventRoutes);
app.use('/reservations', reservationRoutes);
app.use('/tickets', ticketRoutes);
app.use('/gate-staff', gateStaffRoutes);
app.use('/buildings', buildingRoutes);
app.use('/clients', clientsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler (catches anything thrown/passed to next() unhandled above)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
