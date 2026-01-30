import { Router } from 'express';
import { AuthController } from '../modules/auth/controller';
import { adminLoginRateLimit, emailRateLimit } from '../middlewares/rate-limit';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
const authController = new AuthController();

router.post('/login', adminLoginRateLimit, emailRateLimit, authController.login);
router.post('/change-password', authenticateAdmin, authController.changePassword);
router.post('/logout', authController.logout);

export { router as authRoutes };
