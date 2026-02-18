import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface DriverCandidate {
  driver_id: string;
  distance_km: number;
  score: number;
  same_neighborhood: boolean;
  same_geofence?: boolean;
}

export class DispatcherService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly OFFER_TIMEOUT_SECONDS = 15;
  private readonly MAX_DISTANCE_KM = 10;
  private readonly LOCATION_FRESHNESS_SECONDS = process.env.NODE_ENV === 'production' ? 30 : 3600; // DEV: 1h

  async dispatchRide(rideId: string): Promise<void> {
    const ride = await prisma.rides_v2.findUnique({
      where: { id: rideId },
      include: { offers: true }
    });

    if (!ride) {
      console.error(`[DISPATCHER] Ride ${rideId} not found`);
      return;
    }

    if (ride.status !== 'requested' && ride.status !== 'offered') {
      console.log(`[DISPATCHER] Ride ${rideId} status=${ride.status}, skipping dispatch`);
      return;
    }

    const attemptCount = ride.offers.filter(o => o.status === 'expired' || o.status === 'rejected').length;
    if (attemptCount >= this.MAX_ATTEMPTS) {
      console.log(`[DISPATCHER] Ride ${rideId} reached max attempts (${this.MAX_ATTEMPTS}), setting no_driver`);
      await prisma.rides_v2.update({
        where: { id: rideId },
        data: { status: 'no_driver' }
      });
      return;
    }

    // Buscar candidatos
    const candidates = await this.findCandidates(ride);
    
    console.log(`[DISPATCH_CANDIDATES] ride_id=${rideId} attempt=${attemptCount + 1} candidates=${candidates.length} top3=${JSON.stringify(candidates.slice(0, 3))}`);

    if (candidates.length === 0) {
      console.log(`[DISPATCHER] No candidates for ride ${rideId}, setting no_driver`);
      await prisma.rides_v2.update({
        where: { id: rideId },
        data: { status: 'no_driver' }
      });
      return;
    }

    // Pegar o melhor candidato
    const bestCandidate = candidates[0];

    // Criar oferta
    const expiresAt = new Date(Date.now() + this.OFFER_TIMEOUT_SECONDS * 1000);
    
    const offer = await prisma.ride_offers.create({
      data: {
        ride_id: rideId,
        driver_id: bestCandidate.driver_id,
        status: 'pending',
        expires_at: expiresAt,
        rank_score: new Decimal(bestCandidate.score)
      }
    });

    // Atualizar ride para offered
    await prisma.rides_v2.update({
      where: { id: rideId },
      data: {
        status: 'offered',
        offered_at: new Date()
      }
    });

    console.log(`[OFFER_SENT] ride_id=${rideId} offer_id=${offer.id} driver_id=${bestCandidate.driver_id} expires_at=${expiresAt.toISOString()} score=${bestCandidate.score}`);

    // Emitir evento real-time para o motorista
    this.emitOfferToDriver(bestCandidate.driver_id, offer.id, ride);

    // DEV: simular decisão do driver com probabilidades
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTO_ACCEPT === 'true') {
      let acceptProb = parseFloat(process.env.DEV_ACCEPT_PROB || '0.85');
      const rejectProb = parseFloat(process.env.DEV_REJECT_PROB || '0.10');
      const ignoreProb = parseFloat(process.env.DEV_IGNORE_PROB || '0.05');
      const geofenceBoost = parseFloat(process.env.DEV_GEOFENCE_BOOST || '0');
      const timeScale = parseFloat(process.env.DEV_TIME_SCALE || '1');
      
      const acceptProbBase = acceptProb;
      
      // Boost accept prob if same geofence
      if (bestCandidate.same_geofence && geofenceBoost > 0) {
        acceptProb = Math.min(0.98, acceptProb + geofenceBoost * 0.2);
        console.log(`[DEV_GEOFENCE_BOOST_APPLIED] driver_id=${bestCandidate.driver_id} accept_prob_base=${acceptProbBase.toFixed(3)} accept_prob_boosted=${acceptProb.toFixed(3)} boost=${geofenceBoost}`);
      }
      
      const rand = Math.random();
      let action: 'accept' | 'reject' | 'ignore';
      
      if (rand < acceptProb) {
        action = 'accept';
      } else if (rand < acceptProb + rejectProb) {
        action = 'reject';
      } else {
        action = 'ignore';
      }
      
      const jitterRaw = 200 + Math.random() * 400;
      const jitter = jitterRaw / timeScale;
      
      console.log(`[DEV_DRIVER_DECISION] offer_id=${offer.id} driver_id=${bestCandidate.driver_id} action=${action} prob=${rand.toFixed(3)} accept_prob=${acceptProb.toFixed(3)} same_geofence=${bestCandidate.same_geofence || false} jitter_ms=${Math.round(jitter)}`);
      
      setTimeout(async () => {
        try {
          if (action === 'accept') {
            const { acceptOfferInternal } = require('./offer-acceptance.service');
            await acceptOfferInternal(offer.id, bestCandidate.driver_id);
            console.log(`[DEV_AUTO_ACCEPT_DONE] offer_id=${offer.id} ride_id=${rideId} driver_id=${bestCandidate.driver_id}`);
            
            // DEV: auto-release após duração simulada
            if (process.env.DEV_AUTO_RELEASE === 'true') {
              const minDuration = parseInt(process.env.DEV_RELEASE_MIN_MS || '90000');
              const maxDuration = parseInt(process.env.DEV_RELEASE_MAX_MS || '180000');
              const durationSim = minDuration + Math.random() * (maxDuration - minDuration);
              const durationReal = durationSim / timeScale;
              
              console.log(`[DEV_AUTO_RELEASE_SCHEDULED] driver_id=${bestCandidate.driver_id} duration_ms_sim=${Math.round(durationSim)} duration_ms_real=${Math.round(durationReal)}`);
              
              setTimeout(async () => {
                try {
                  await prisma.driver_status.update({
                    where: { driver_id: bestCandidate.driver_id },
                    data: { availability: 'online' }
                  });
                  console.log(`[DEV_AUTO_RELEASE_DONE] driver_id=${bestCandidate.driver_id} availability=online`);
                } catch (err: any) {
                  console.log(`[DEV_AUTO_RELEASE_FAILED] driver_id=${bestCandidate.driver_id} error=${err.message}`);
                }
              }, durationReal);
            }
          } else if (action === 'reject') {
            await prisma.ride_offers.update({
              where: { id: offer.id },
              data: { status: 'rejected', responded_at: new Date() }
            });
            console.log(`[DEV_AUTO_REJECT_DONE] offer_id=${offer.id} driver_id=${bestCandidate.driver_id}`);
            
            // Redispatch
            await prisma.rides_v2.update({
              where: { id: rideId },
              data: { status: 'requested' }
            });
            await this.dispatchRide(rideId);
          } else {
            console.log(`[DEV_AUTO_IGNORE] offer_id=${offer.id} driver_id=${bestCandidate.driver_id} will_expire=true`);
          }
        } catch (error: any) {
          console.log(`[DEV_DRIVER_ACTION_FAILED] offer_id=${offer.id} action=${action} reason=${error.message}`);
        }
      }, jitter);
    }
  }

  private async findCandidates(ride: any): Promise<DriverCandidate[]> {
    const cutoffTime = new Date(Date.now() - this.LOCATION_FRESHNESS_SECONDS * 1000);

    // Buscar motoristas online com localização recente
    const onlineDrivers = await prisma.driver_status.findMany({
      where: {
        availability: 'online'
      },
      include: {
        driver: {
          include: {
            driver_location: true
          }
        }
      }
    });

    // Diagnóstico: contar motoristas por filtro
    const onlineDriversCount = onlineDrivers.length;
    
    // Log inicial para debug
    console.log(`[DISPATCHER_DEBUG] ride_id=${ride.id} query_returned=${onlineDriversCount} drivers with availability=online`);
    if (onlineDriversCount > 0) {
      console.log(`[DISPATCHER_DEBUG] Sample driver:`, JSON.stringify({
        driver_id: onlineDrivers[0].driver_id,
        availability: onlineDrivers[0].availability,
        has_location: !!onlineDrivers[0].driver.driver_location,
        location_updated_at: onlineDrivers[0].driver.driver_location?.updated_at
      }));
    }
    
    let withLocationCount = 0;
    let withFreshLocationCount = 0;
    let withinDistanceCount = 0;
    const droppedReasons: { [key: string]: number } = {
      no_location: 0,
      stale_location: 0,
      too_far: 0
    };

    const candidates: DriverCandidate[] = [];

    for (const ds of onlineDrivers) {
      const location = ds.driver.driver_location;
      
      if (!location) {
        droppedReasons.no_location++;
        continue;
      }
      withLocationCount++;
      
      if (location.updated_at < cutoffTime) {
        droppedReasons.stale_location++;
        continue;
      }
      withFreshLocationCount++;

      const distance = this.haversineDistance(
        Number(ride.origin_lat),
        Number(ride.origin_lng),
        Number(location.lat),
        Number(location.lng)
      );

      if (distance > this.MAX_DISTANCE_KM) {
        droppedReasons.too_far++;
        continue;
      }
      withinDistanceCount++;

      const sameNeighborhood = ride.origin_neighborhood_id && 
                               ds.driver.neighborhood_id === ride.origin_neighborhood_id;

      // Calcular score (menor é melhor)
      let score = distance;
      if (sameNeighborhood) {
        score *= 0.7; // 30% de bônus
      }

      // DEV: Geofence boost (INSIDE coords: -22.965 to -22.975 lat, -43.170 to -43.185 lng)
      let sameGeofence = false;
      if (process.env.NODE_ENV !== 'production' && process.env.DEV_GEOFENCE_BOOST) {
        const rideLat = Number(ride.origin_lat);
        const rideLng = Number(ride.origin_lng);
        const driverLat = Number(location.lat);
        const driverLng = Number(location.lng);
        
        const rideInside = rideLat >= -22.975 && rideLat <= -22.965 && rideLng >= -43.185 && rideLng <= -43.170;
        const driverInside = driverLat >= -22.975 && driverLat <= -22.965 && driverLng >= -43.185 && driverLng <= -43.170;
        
        if (rideInside && driverInside) {
          const boost = parseFloat(process.env.DEV_GEOFENCE_BOOST);
          score *= (1 - boost);
          sameGeofence = true;
        }
      }

      candidates.push({
        driver_id: ds.driver_id,
        distance_km: distance,
        score,
        same_neighborhood: sameNeighborhood,
        same_geofence: sameGeofence
      });
    }

    // Log de diagnóstico
    console.log(`[DISPATCHER_FILTER] ride_id=${ride.id} online=${onlineDriversCount} with_location=${withLocationCount} fresh_location=${withFreshLocationCount} within_distance=${withinDistanceCount} final_candidates=${candidates.length} dropped=${JSON.stringify(droppedReasons)}`);

    // Ordenar por score (menor primeiro)
    candidates.sort((a, b) => a.score - b.score);

    return candidates;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async checkExpiredOffers(): Promise<void> {
    const expiredOffers = await prisma.ride_offers.findMany({
      where: {
        status: 'pending',
        expires_at: {
          lt: new Date()
        }
      },
      include: {
        ride: true
      }
    });

    for (const offer of expiredOffers) {
      console.log(`[OFFER_EXPIRED] offer_id=${offer.id} ride_id=${offer.ride_id} driver_id=${offer.driver_id}`);
      
      await prisma.ride_offers.update({
        where: { id: offer.id },
        data: { status: 'expired' }
      });

      // Redispatch
      if (offer.ride.status === 'offered') {
        await prisma.rides_v2.update({
          where: { id: offer.ride_id },
          data: { status: 'requested' }
        });
        
        await this.dispatchRide(offer.ride_id);
      }
    }
  }

  private emitOfferToDriver(driverId: string, offerId: string, ride: any): void {
    const event = {
      type: 'ride.offer.created',
      offer: {
        id: offerId,
        ride_id: ride.id,
        expires_at: new Date(Date.now() + this.OFFER_TIMEOUT_SECONDS * 1000).toISOString()
      },
      ride: {
        origin: {
          lat: Number(ride.origin_lat),
          lng: Number(ride.origin_lng),
          text: ride.origin_text
        },
        destination: {
          lat: Number(ride.dest_lat),
          lng: Number(ride.dest_lng),
          text: ride.destination_text
        }
      }
    };

    // Enviar via SSE
    const { realTimeService } = require('./realtime.service');
    realTimeService.emitToDriver(driverId, event);
    
    console.log(`[REALTIME] Emitted to driver ${driverId}:`, JSON.stringify(event));
  }
}

export const dispatcherService = new DispatcherService();
