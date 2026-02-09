import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { SentimentChip } from './SentimentChip';
import type { SentimentAnalysis } from '../types/rideFeedback';

interface SentimentCardProps {
  sentiment: SentimentAnalysis | null;
}

export const SentimentCard: React.FC<SentimentCardProps> = ({ sentiment }) => {
  if (!sentiment) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Análise de Sentimento
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ⏳ Análise de sentimento em processamento...
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            O resultado estará disponível em até 1 minuto.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const confidencePercent = Math.round(sentiment.confidence * 100);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📊 Análise de Sentimento
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Sentimento
          </Typography>
          <SentimentChip sentiment={sentiment.label} size="medium" />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Confiança: {confidencePercent}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={confidencePercent}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {sentiment.modelVersion && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Modelo: {sentiment.modelVersion}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Analisado em: {new Date(sentiment.analyzedAt).toLocaleString('pt-BR')}
          </Typography>
        </Box>

        {sentiment.metadata?.timing_ms && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Tempo de processamento: {sentiment.metadata.timing_ms.total_ms}ms
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
