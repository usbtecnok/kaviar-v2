import { Router } from 'express';
import { AuthController } from '../modules/auth/controller';

const router = Router();
const authController = new AuthController();

router.post('/login', authController.login);
router.post('/logout', authController.logout);

export { router as authRoutes };
