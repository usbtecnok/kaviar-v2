import { Chip } from '@mui/material';
import {
  SentimentSatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  Psychology,
} from '@mui/icons-material';
import type { SentimentLabel } from '../types/rideFeedback';

interface SentimentChipProps {
  sentiment: SentimentLabel | null;
  size?: 'small' | 'medium';
}

const SENTIMENT_CONFIG: Record<
  SentimentLabel,
  {
    label: string;
    color: 'success' | 'error' | 'warning' | 'secondary';
    icon: React.ReactElement;
  }
> = {
  POSITIVE: {
    label: 'Positivo',
    color: 'success',
    icon: <SentimentSatisfied />,
  },
  NEGATIVE: {
    label: 'Negativo',
    color: 'error',
    icon: <SentimentDissatisfied />,
  },
  NEUTRAL: {
    label: 'Neutro',
    color: 'warning',
    icon: <SentimentNeutral />,
  },
  MIXED: {
    label: 'Misto',
    color: 'secondary',
    icon: <Psychology />,
  },
};

export const SentimentChip: React.FC<SentimentChipProps> = ({
  sentiment,
  size = 'small',
}) => {
  if (!sentiment) {
    return (
      <Chip
        label="Processando..."
        size={size}
        variant="outlined"
        aria-label="Análise de sentimento em processamento"
      />
    );
  }

  const config = SENTIMENT_CONFIG[sentiment];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      icon={config.icon}
      aria-label={`Sentimento ${config.label.toLowerCase()}`}
    />
  );
};
