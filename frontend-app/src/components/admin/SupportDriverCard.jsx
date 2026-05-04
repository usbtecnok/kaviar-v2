import { Card, CardContent, Typography, Box, Chip, IconButton, Tooltip } from '@mui/material';
import { Edit, Phone } from '@mui/icons-material';

const STATUS_MAP = {
  interested: { label: 'Interessado', color: '#90CAF9' },
  eligible: { label: 'Elegível', color: '#FFD54F' },
  participating: { label: 'Participando', color: '#81C784' },
  paused: { label: 'Pausado', color: '#BDBDBD' },
  future_contact: { label: 'Contato futuro', color: '#CE93D8' },
};

export default function SupportDriverCard({ entry, onEdit }) {
  const driver = entry.driver || {};
  const community = entry.community || {};
  const st = STATUS_MAP[entry.status] || STATUS_MAP.interested;

  return (
    <Card sx={{ bgcolor: '#111217', border: '1px solid #C8A84E22', borderRadius: 2, mb: 1.5 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: '#E0DDD5', fontWeight: 600, fontSize: 14 }}>
              {driver.name || 'Sem nome'}
            </Typography>
            <Typography sx={{ color: '#9CA3AF', fontSize: 12 }}>
              {driver.phone || '—'} {community.name ? `· ${community.name}` : ''}
            </Typography>
            {entry.primary_area && (
              <Typography sx={{ color: '#6B6045', fontSize: 11, mt: 0.3 }}>
                Área: {entry.primary_area}
                {entry.coverage_areas?.length > 0 && ` + ${entry.coverage_areas.length} área(s)`}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label={st.label} size="small" sx={{ bgcolor: `${st.color}18`, color: st.color, fontWeight: 600, fontSize: 11 }} />
            {onEdit && (
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => onEdit(entry)} sx={{ color: '#C8A84E' }}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
