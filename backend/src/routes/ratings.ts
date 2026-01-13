import { Router } from 'express';
import { RatingController } from '../modules/rating/controller';

const router = Router();
const ratingController = new RatingController();

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

// Resumo/estatísticas do motorista
router.get('/driver/:driverId', ratingController.getRatingSummary);

// Alias para compatibilidade com frontend que chama /stats
router.get('/driver/:driverId/stats', ratingController.getRatingSummary);

export { router as ratingsRoutes };
