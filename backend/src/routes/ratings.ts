import { Router } from 'express';
import { RatingController } from '../modules/rating/controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
const ratingController = new RatingController();
router.use(requireAuth);

/**
 * Ratings (Avaliação de Motorista)
 * - POST /api/ratings                   -> cria avaliação
 * - GET  /api/ratings/driver/:driverId  -> resumo/estatísticas do motorista
 *
 * Obs: seu controller já implementa esses handlers:
 * - createRating
 * - getRatingSummary
 */

// Criar rating (1-5 + comentário opcional)
router.post('/', ratingController.createRating);

// Buscar corrida pendente de avaliação
router.get('/pending/:passengerId', ratingController.getPendingRating);

// Resumo/estatísticas do motorista
router.get('/driver/:driverId', ratingController.getRatingSummary);

// Resumo/estatísticas do passageiro
router.get('/passenger/:passengerId', ratingController.getPassengerSummary);

// Alias para compatibilidade com frontend que chama /stats
router.get('/driver/:driverId/stats', ratingController.getRatingSummary);

export { router as ratingsRoutes };
