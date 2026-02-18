import { Request, Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  type: 'driver' | 'passenger';
  entityId: string; // driver_id ou ride_id
}

class RealTimeService {
  private clients: Map<string, SSEClient> = new Map();

  // Conectar cliente SSE
  connect(req: Request, res: Response, type: 'driver' | 'passenger', entityId: string) {
    const clientId = `${type}-${entityId}-${Date.now()}`;

    // Configurar SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Nginx
    });

    // Enviar comentário inicial (mantém conexão viva)
    res.write(': connected\n\n');

    // Armazenar cliente
    this.clients.set(clientId, { id: clientId, res, type, entityId });

    console.log(`[REALTIME] Client connected: ${clientId}`);

    // Cleanup ao desconectar
    req.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[REALTIME] Client disconnected: ${clientId}`);
    });

    // Heartbeat a cada 30s
    const heartbeat = setInterval(() => {
      if (this.clients.has(clientId)) {
        res.write(': heartbeat\n\n');
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);
  }

  // Enviar evento para motorista específico
  emitToDriver(driverId: string, event: any) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.type === 'driver' && client.entityId === driverId) {
        const data = JSON.stringify(event);
        client.res.write(`data: ${data}\n\n`);
        console.log(`[REALTIME] Sent to driver ${driverId}: ${event.type}`);
      }
    }
  }

  // Enviar evento para passageiro de uma corrida específica
  emitToRide(rideId: string, event: any) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.type === 'passenger' && client.entityId === rideId) {
        const data = JSON.stringify(event);
        client.res.write(`data: ${data}\n\n`);
        console.log(`[REALTIME] Sent to ride ${rideId}: ${event.type}`);
      }
    }
  }

  // Broadcast para todos os clientes de um tipo
  broadcast(type: 'driver' | 'passenger', event: any) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.type === type) {
        const data = JSON.stringify(event);
        client.res.write(`data: ${data}\n\n`);
      }
    }
  }

  // Estatísticas
  getStats() {
    const drivers = Array.from(this.clients.values()).filter(c => c.type === 'driver').length;
    const passengers = Array.from(this.clients.values()).filter(c => c.type === 'passenger').length;
    return { total: this.clients.size, drivers, passengers };
  }
}

export const realTimeService = new RealTimeService();
