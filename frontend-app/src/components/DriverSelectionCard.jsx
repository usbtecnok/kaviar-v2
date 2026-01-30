import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  LocalTaxi as TaxiIcon,
} from '@mui/icons-material';
import axios from 'axios';
import ReputationBadge from '../../components/ReputationBadge';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Component to display driver with reputation badge
 * Integrates with ride request flow
 */
export default function DriverSelectionCard({ driver, passengerCommunityId, onSelect }) {
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDriverReputation();
  }, [driver.id, passengerCommunityId]);
  
  const fetchDriverReputation = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/reputation/${driver.id}/${passengerCommunityId}`
      );
      setReputation(response.data);
    } catch (err) {
      console.error('Error fetching driver reputation:', err);
      // Driver has no reputation in this community yet
      setReputation(null);
    } finally {
      setLoading(false);
    }
  };
  
  const isFromAnotherCommunity = driver.community_id !== passengerCommunityId;
  
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
            {driver.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{driver.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {driver.vehicle_model} • {driver.vehicle_color}
            </Typography>
          </Box>
          <TaxiIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        </Box>
        
        {/* Reputation Badge */}
        {!loading && reputation && (
          <Box sx={{ mb: 2 }}>
            <ReputationBadge
              level={reputation.level}
              badge={reputation.badge}
              totalRides={reputation.stats.total_rides}
              avgRating={reputation.stats.avg_rating}
              firstRideAt={reputation.first_ride_at}
              showDetails={true}
            />
          </Box>
        )}
        
        {/* Warning for drivers from another community */}
        {isFromAnotherCommunity && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              <strong>Motorista de outra comunidade</strong>
            </Typography>
            <Typography variant="caption">
              Este motorista não é cadastrado na sua área. 
              {reputation && reputation.stats.total_rides === 0 && (
                <> Ele não possui histórico de corridas aqui.</>
              )}
            </Typography>
          </Alert>
        )}
        
        {/* Driver stats */}
        {reputation && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip
              label={`${reputation.stats.total_rides} corridas`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`⭐ ${reputation.stats.avg_rating.toFixed(1)}`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
        
        <Button
          fullWidth
          variant="contained"
          onClick={() => onSelect(driver)}
        >
          Solicitar Corrida
        </Button>
      </CardContent>
    </Card>
  );
}
