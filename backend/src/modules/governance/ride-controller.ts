import { Request, Response } from 'express';
import { RideService } from './ride-service';
import { GeofenceService } from '../../services/geofence';
import { DiamondService } from '../../services/diamond';
import { validateLocationInCommunity } from '../../utils/geofence-validator';
import { prisma } from '../../config/database';
import { 
  rideRequestSchema,
  locationUpdateSchema,
  userIdSchema
} from './ride-schemas';

export class RideController {
  private rideService = new RideService();
  private geofenceService = new GeofenceService();
  private diamondService = new DiamondService();

  // POST /api/governance/ride/request
  requestRide = async (req: Request, res: Response) => {
    try {
      const data = rideRequestSchema.parse(req.body);
      
      // Validar geofence para corridas de comunidade
      if (data.type === 'comunidade' && data.passengerLat && data.passengerLng) {
        // Buscar comunidade do passageiro
        const passenger = await prisma.passenger.findUnique({
          where: { id: data.passengerId },
          select: { communityId: true, community: { select: { name: true } } }
        });

        if (!passenger?.communityId) {
          return res.status(400).json({
            success: false,
            error: 'Passageiro não está associado a nenhum bairro'
          });
        }

        // Validar se está dentro do geofence
        const geofenceValidation = await validateLocationInCommunity(
          passenger.communityId,
          { lat: data.passengerLat, lng: data.passengerLng }
        );

        if (!geofenceValidation.isValid) {
          return res.status(400).json({
            success: false,
            error: geofenceValidation.message || 'Fora da área atendida deste bairro'
          });
        }
      }
      
      // If confirmation token provided, process confirmed ride
      if (data.confirmationToken) {
        const result = await this.geofenceService.processConfirmedRide(
          data.confirmationToken, 
          data.passengerId,
          data // Pass current request for validation
        );
        
        if (result.isExisting) {
          return res.json({
            success: true,
            rideId: result.rideId,
            message: 'Corrida já criada anteriormente'
          });
        }

        // Create ride with original data
        const ride = await this.rideService.createOutOfFenceRide(result.rideData);
        
        // Mark token as used
        await this.geofenceService.markConfirmationUsed(data.confirmationToken, ride.id);

        return res.status(201).json({
          success: true,
          ride,
          diamondInfo: await this.diamondService.getDiamondInfo(ride, ride.driverId),
          message: 'Corrida fora da cerca criada com sucesso'
        });
      }
      
      const result = await this.rideService.requestRide(data);

      if (!result.success) {
        if (result.requiresOutOfFenceConfirmation) {
          // Generate confirmation token for fallback
          const confirmation = await this.geofenceService.handleOutOfFenceFallback(
            data.passengerId,
            data
          );

          return res.status(202).json({
            success: false,
            requiresConfirmation: true,
            confirmationToken: confirmation.confirmationToken,
            expiresAt: confirmation.expiresAt,
            ttlMinutes: confirmation.ttlMinutes,
            fallbackInfo: {
              driversInFence: result.geofenceInfo?.driversInFence || 0,
              driversOutOfFence: result.geofenceInfo?.driversOutOfFence || 0,
              fallbackReason: 'NO_DRIVERS_IN_FENCE'
            },
            message: 'Nenhum motorista disponível na sua comunidade. Confirme para buscar motoristas de outras áreas.',
            instructions: {
              toAccept: 'Envie novamente com o confirmationToken fornecido',
              toDecline: 'Tente novamente mais tarde'
            }
          });
        }

        return res.status(400).json({
          success: false,
          error: result.error,
          geofenceInfo: result.geofenceInfo
        });
      }

      res.json({
        success: true,
        data: result.ride,
        geofenceInfo: result.geofenceInfo,
        diamondInfo: await this.diamondService.getDiamondInfo(result.ride, result.ride.driverId),
        message: 'Corrida solicitada com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao solicitar corrida'
      });
    }
  };

  // PUT /api/governance/driver/:id/location
  updateDriverLocation = async (req: Request, res: Response) => {
    try {
      const { id } = userIdSchema.parse(req.params);
      const { lat, lng } = locationUpdateSchema.parse(req.body);
      
      await this.geofenceService.updateDriverLocation(id, lat, lng);

      res.json({
        success: true,
        message: 'Localização do motorista atualizada com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar localização'
      });
    }
  };

  // PUT /api/governance/passenger/:id/location
  updatePassengerLocation = async (req: Request, res: Response) => {
    try {
      const { id } = userIdSchema.parse(req.params);
      const { lat, lng } = locationUpdateSchema.parse(req.body);
      
      await this.geofenceService.updatePassengerLocation(id, lat, lng);

      res.json({
        success: true,
        message: 'Localização do passageiro atualizada com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar localização'
      });
    }
  };
}
