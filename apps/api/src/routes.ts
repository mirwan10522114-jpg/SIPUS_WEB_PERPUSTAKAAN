import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { booksRouter, categoriesRouter, uploadsRouter } from './modules/books/book.routes';
import { membersRouter } from './modules/members/member.routes';
import { loansRouter } from './modules/loans/loan.routes';
import { finesRouter } from './modules/fines/fines.routes';
import { reservationsRouter } from './modules/reservations/reservation.routes';
import { notificationsRouter } from './modules/notifications/notification.routes';
import { announcementsRouter } from './modules/announcements/announcement.routes';
import { reportsRouter } from './modules/reports/report.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { settingsRouter, accountsRouter } from './modules/settings/settings.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/books', booksRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/members', membersRouter);
apiRouter.use('/loans', loansRouter);
apiRouter.use('/fines', finesRouter);
apiRouter.use('/reservations', reservationsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/announcements', announcementsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/accounts', accountsRouter);
apiRouter.use('/uploads', uploadsRouter);
