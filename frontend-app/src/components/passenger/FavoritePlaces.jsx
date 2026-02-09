import { Card, CardContent, Typography, Button, Box, IconButton } from '@mui/material';
import { Home, Work, Place, Add, Delete, Edit } from '@mui/icons-material';

const TYPE_CONFIG = {
  HOME: { icon: <Home />, label: 'Casa', color: 'primary' },
  WORK: { icon: <Work />, label: 'Trabalho', color: 'secondary' },
  OTHER: { icon: <Place />, label: 'Outro', color: 'default' },
};

export default function FavoritePlaces({ favorites = [], onAdd, onUse, onDelete }) {
  const types = ['HOME', 'WORK', 'OTHER'];

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Seus Locais
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {types.map(type => {
          const favorite = favorites.find(f => f.type === type);
          const config = TYPE_CONFIG[type];

          return (
            <Card key={type} sx={{ flex: '1 1 200px', minWidth: 200 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {config.icon}
                  <Typography variant="subtitle1">{config.label}</Typography>
                </Box>

                {favorite ? (
                  <>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {favorite.label}
                    </Typography>
                    {favorite.address_text && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {favorite.address_text}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color={config.color}
                        onClick={() => onUse(favorite)}
                        fullWidth
                      >
                        Ir
                      </Button>
                      <IconButton 
                        size="small" 
                        onClick={() => onDelete(favorite.id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </>
                ) : (
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<Add />}
                    onClick={() => onAdd(type)}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    Adicionar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
