import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { pool } from '../db';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { requireTerritoryScope } from '../middlewares/require-territory-scope';

const router = Router();
const OPERATIONS_ROLES = ['SUPER_ADMIN', 'OPERATOR', 'TERRITORIAL_MANAGER', 'TERRITORIAL_OPERATOR'];
// Operational day helper: Brazil currently has no DST, so Sao Paulo is treated as fixed UTC-03 for current reports.
const SAO_PAULO_UTC_OFFSET_HOURS = 3;

router.use(authenticateAdmin);
router.use(requireRole(OPERATIONS_ROLES));
router.use(applyTerritoryScope);
router.use(requireTerritoryScope);

type TerritoryOption = {
  id: string;
  name: string;
  city_name: string | null;
  uf: string | null;
};

function getPeriod(p: string): { start: Date; label: string } {
  const now = new Date();
  if (p === '7d') return { start: new Date(now.getTime() - 7 * 86400000), label: '7 dias' };
  if (p === '30d') return { start: new Date(now.getTime() - 30 * 86400000), label: '30 dias' };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start: today, label: 'Hoje' };
}

function minutesSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function needsAttention(status: string, requestedAt: Date): { attention: boolean; reason: string | null } {
  const minutes = minutesSince(requestedAt);
  const thresholds: Record<string, number> = {
    requested: 3,
    offered: 5,
    arrived: 10,
    in_progress: 60,
  };
  const threshold = thresholds[status];
  if (!threshold || minutes < threshold) return { attention: false, reason: null };
  return { attention: true, reason: `${minutes} min em ${status}` };
}

function money(value: unknown): number | null {
  if (value == null) return null;
  return Number(value);
}

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function shouldReturnRawOperationalDriverPhone(role?: string | null): boolean {
  // OPERATOR is treated as KAVIAR central operations staff and currently keeps global operational phone access.
  return ['SUPER_ADMIN', 'OPERATOR', 'TERRITORIAL_MANAGER', 'TERRITORIAL_OPERATOR'].includes(role || '');
}

function getTerritoryScope(req: Request): { territoryIds: string[]; neighborhoodIds: string[] } | null {
  return (req as Request & { territoryScope?: { territoryIds: string[]; neighborhoodIds: string[] } | null }).territoryScope || null;
}

async function getAvailableTerritories(req: Request): Promise<TerritoryOption[]> {
  const scope = getTerritoryScope(req);
  const where: Record<string, unknown> = { is_active: true };
  if (scope) where.id = { in: scope.territoryIds };

  return prisma.operational_territories.findMany({
    where,
    select: { id: true, name: true, city_name: true, uf: true },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });
}

function buildTerritoryMeta(req: Request, territories: TerritoryOption[], territoryId: string | null) {
  const scope = getTerritoryScope(req);
  const selected = territoryId ? territories.find(territory => territory.id === territoryId) || null : null;
  return {
    territories,
    active_territory_id: territoryId,
    active_territory: selected,
    scope_label: selected
      ? `Visualizando: ${selected.name}`
      : scope
        ? 'Visualizando meus territorios'
        : 'Visualizando todos os territorios',
  };
}

async function resolveTerritoryFilter(req: Request, res: Response) {
  const requestedTerritoryId = typeof req.query.territory_id === 'string' && req.query.territory_id.trim()
    ? req.query.territory_id.trim()
    : null;
  const territories = await getAvailableTerritories(req);

  if (requestedTerritoryId && !territories.some(territory => territory.id === requestedTerritoryId)) {
    res.status(403).json({ success: false, error: 'Sem permissao para este territorio' });
    return null;
  }

  if (!requestedTerritoryId) {
    const scope = getTerritoryScope(req);
    return { territoryId: null, neighborhoodIds: scope?.neighborhoodIds || null, territories };
  }

  const neighborhoods = await prisma.neighborhoods.findMany({
    where: { territory_id: requestedTerritoryId },
    select: { id: true },
  });

  return {
    territoryId: requestedTerritoryId,
    neighborhoodIds: neighborhoods.map(neighborhood => neighborhood.id),
    territories,
  };
}

function applyRideTerritoryFilter(where: Record<string, any>, neighborhoodIds: string[] | null) {
  if (!neighborhoodIds) return where;
  return {
    ...where,
    origin_neighborhood_id: neighborhoodIds.length > 0 ? { in: neighborhoodIds } : '__none__',
  };
}

function applyDriverTerritoryFilter(where: Record<string, any>, neighborhoodIds: string[] | null) {
  if (!neighborhoodIds) return where;
  return {
    ...where,
    driver: {
      neighborhood_id: neighborhoodIds.length > 0 ? { in: neighborhoodIds } : '__none__',
    },
  };
}

export function canScopedAdminAccessRideTerritory(scope: { territoryIds: string[] } | null, territoryId?: string | null): boolean {
  if (!scope) return true;
  if (!territoryId) return false;
  return scope.territoryIds.includes(territoryId);
}

function forbiddenRideTerritoryResponse(req: Request, territoryId?: string | null): { status: number; error: string } | null {
  const scope = getTerritoryScope(req);
  if (canScopedAdminAccessRideTerritory(scope, territoryId)) return null;
  if (!territoryId) return { status: 403, error: 'Corrida sem território de origem definido' };
  return { status: 403, error: 'Sem permissao para este territorio' };
}

export function getSaoPauloDayBounds(dateText: string): { start: Date; end: Date; date: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error('Data inválida. Use YYYY-MM-DD.');
  }
  const [year, month, day] = dateText.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, SAO_PAULO_UTC_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(start.getTime() + 86400000);
  if (
    Number.isNaN(start.getTime()) ||
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    throw new Error('Data inválida. Use YYYY-MM-DD.');
  }
  return { start, end, date: dateText };
}

type DailyReportRideStatusGroup = { status: string; _count: number };
type DailyReportSettlementSums = {
  final_price?: unknown;
  fee_amount?: unknown;
  driver_earnings?: unknown;
};
type DailyReportOfferTiming = { requested_at: Date; offered_at: Date | null };

function moneyToCents(value: unknown): number {
  if (value == null) return 0;
  return Math.round(Number(value) * 100);
}

export function buildDailyReportPayload(args: {
  date: string;
  start: Date;
  end: Date;
  territory: ReturnType<typeof buildTerritoryMeta>;
  requestedGroups: DailyReportRideStatusGroup[];
  completedCount: number;
  canceledCount: number;
  noDriverCount: number;
  emergencyRegisteredCount: number;
  activeEmergencyCount: number;
  settlementSums: DailyReportSettlementSums;
  offerTimings: DailyReportOfferTiming[];
}) {
  const requestedTotal = args.requestedGroups.reduce((sum, group) => sum + group._count, 0);
  const avgToOfferSeconds = args.offerTimings.length > 0
    ? Math.round(
        args.offerTimings.reduce((sum, ride) => {
          if (!ride.offered_at) return sum;
          return sum + ((ride.offered_at.getTime() - ride.requested_at.getTime()) / 1000);
        }, 0) / args.offerTimings.length
      )
    : null;

  return {
    success: true,
    generated_at: new Date(),
    period: {
      date: args.date,
      timezone: 'America/Sao_Paulo',
      start: args.start,
      end: args.end,
    },
    territory: args.territory,
    scope_rules: {
      rides: 'Corridas são contabilizadas pelo território de origem.',
      drivers: 'Motoristas seguem o território/base operacional do motorista.',
      cross_territory: 'Corridas cross-territory entram no relatório do território de origem.',
    },
    metrics: {
      requested_rides: requestedTotal,
      completed_rides: args.completedCount,
      canceled_rides: args.canceledCount,
      no_driver_or_no_offer_rides: args.noDriverCount,
      emergencies_registered: args.emergencyRegisteredCount,
      active_emergencies: args.activeEmergencyCount,
      final_revenue_cents: moneyToCents(args.settlementSums.final_price),
      kaviar_fee_cents: moneyToCents(args.settlementSums.fee_amount),
      driver_earnings_cents: moneyToCents(args.settlementSums.driver_earnings),
      avg_to_offer_seconds: avgToOfferSeconds,
    },
  };
}

const OPERATION_NOTE_TYPES = new Set([
  'checked',
  'driver_contacted',
  'passenger_oriented',
  'emergency_followup',
  'no_action_needed',
  'other',
]);

function normalizeOperationNoteType(noteType: unknown): string {
  if (typeof noteType !== 'string') return 'other';
  const normalized = noteType.trim();
  return OPERATION_NOTE_TYPES.has(normalized) ? normalized : 'other';
}

function normalizeOperationNote(note: unknown): string | null {
  if (typeof note !== 'string') return null;
  const normalized = note.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.slice(0, 500);
}

const EMERGENCY_FOLLOWUP_TYPES = new Set([
  'emergency_seen',
  'passenger_contact_attempted',
  'driver_contact_attempted',
  'local_manager_followup',
  'support_followup',
  'no_action_needed',
  'other',
]);

function normalizeEmergencyFollowupType(followupType: unknown): string {
  if (typeof followupType !== 'string') return 'other';
  const normalized = followupType.trim();
  return EMERGENCY_FOLLOWUP_TYPES.has(normalized) ? normalized : 'other';
}

function normalizeEmergencyFollowupNote(note: unknown): string | null {
  if (typeof note !== 'string') return null;
  const normalized = note.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.slice(0, 500);
}

async function getRideOperationalNotes(rideId: string) {
  const { rows } = await pool.query(
    "SELECT a.id, a.admin_id, adm.name AS admin_name, adm.role AS admin_role, " +
      "a.new_value->>'note_type' AS note_type, " +
      "COALESCE(a.new_value->>'note', a.reason) AS note, a.created_at " +
      "FROM admin_audit_logs a " +
      "LEFT JOIN admins adm ON a.admin_id = adm.id::text " +
      "WHERE a.entity_type = 'rides_v2' " +
      "AND a.entity_id = $1 " +
      "AND a.action = 'operation_note' " +
      "ORDER BY a.created_at DESC LIMIT 30",
    [rideId]
  );
  return rows;
}

async function getRideEmergencyFollowups(rideId: string) {
  const { rows } = await pool.query(
    "SELECT a.id, a.admin_id, adm.name AS admin_name, adm.role AS admin_role, " +
      "a.new_value->>'followup_type' AS followup_type, " +
      "COALESCE(a.new_value->>'note', a.reason) AS note, a.created_at " +
      "FROM admin_audit_logs a " +
      "LEFT JOIN admins adm ON a.admin_id = adm.id::text " +
      "WHERE a.entity_type = 'rides_v2' " +
      "AND a.entity_id = $1 " +
      "AND a.action = 'emergency_followup' " +
      "ORDER BY a.created_at DESC LIMIT 30",
    [rideId]
  );
  return rows;
}

type OperationalAlert = {
  id: string;
  type: string;
  title: string;
  severity: "critical" | "attention" | "monitor";
  ride_id: string | null;
  status: string | null;
  passenger_name: string | null;
  driver_name: string | null;
  region: string | null;
  overdue_minutes: number | null;
  occurred_at: Date | null;
};

const ALERT_SEVERITY_WEIGHT: Record<OperationalAlert["severity"], number> = { critical: 0, attention: 1, monitor: 2 };

type RideAlertSource = {
  id: string;
  status: string;
  requested_at: Date;
  offered_at: Date | null;
  accepted_at: Date | null;
  arrived_at: Date | null;
  started_at: Date | null;
  passenger?: { name: string | null } | null;
  driver?: { name: string | null } | null;
  origin_neighborhood?: { name: string | null } | null;
};

function buildRideOperationalAlerts(ride: RideAlertSource): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const base = {
    ride_id: ride.id,
    status: String(ride.status),
    passenger_name: ride.passenger?.name || null,
    driver_name: ride.driver?.name || null,
    region: ride.origin_neighborhood?.name || null,
  };
  const add = (type: string, title: string, severity: OperationalAlert["severity"], ref: Date | null | undefined, threshold: number) => {
    if (!ref) return;
    const elapsed = minutesSince(ref);
    if (elapsed < threshold) return;
    alerts.push({
      id: ride.id + "-" + type,
      type,
      title,
      severity,
      ...base,
      overdue_minutes: Math.max(0, elapsed - threshold),
      occurred_at: ref,
    });
  };

  if (ride.status === "requested") add("requested_wait", "Solicitada sem motorista", minutesSince(ride.requested_at) >= 8 ? "critical" : "attention", ride.requested_at, 3);
  if (ride.status === "offered") add("offer_wait", "Oferta sem aceite", minutesSince(ride.offered_at || ride.requested_at) >= 10 ? "critical" : "attention", ride.offered_at || ride.requested_at, 5);
  if (ride.status === "accepted") add("arrival_wait", "Motorista aceitou e ainda não chegou", "attention", ride.accepted_at, 10);
  if (ride.status === "arrived") add("start_wait", "Motorista chegou e corrida não iniciou", "attention", ride.arrived_at, 10);
  if (ride.status === "in_progress") add("long_in_progress", "Corrida em andamento acima do esperado", ride.started_at && minutesSince(ride.started_at) >= 90 ? "attention" : "monitor", ride.started_at, 60);
  return alerts;
}

function sortOperationalAlerts(alerts: OperationalAlert[]): OperationalAlert[] {
  return alerts.sort((a, b) => {
    const severity = ALERT_SEVERITY_WEIGHT[a.severity] - ALERT_SEVERITY_WEIGHT[b.severity];
    if (severity !== 0) return severity;
    return (b.overdue_minutes || 0) - (a.overdue_minutes || 0);
  });
}

function buildAttentionFlags(ride: {
  status: string;
  requested_at: Date;
  offered_at: Date | null;
  arrived_at: Date | null;
  started_at: Date | null;
  canceled_at: Date | null;
}, hasActiveEmergency: boolean) {
  const flags: Array<{ code: string; label: string; severity: 'info' | 'warning' | 'critical' }> = [];

  if (ride.status === 'requested' && minutesSince(ride.requested_at) >= 3) {
    flags.push({ code: 'requested_wait', label: `Solicitada há ${minutesSince(ride.requested_at)} min`, severity: 'warning' });
  }
  if (ride.status === 'offered' && ride.offered_at && minutesSince(ride.offered_at) >= 5) {
    flags.push({ code: 'offered_wait', label: `Ofertada há ${minutesSince(ride.offered_at)} min`, severity: 'warning' });
  }
  if (ride.status === 'arrived' && ride.arrived_at && minutesSince(ride.arrived_at) >= 10) {
    flags.push({ code: 'arrived_wait', label: `Motorista chegou há ${minutesSince(ride.arrived_at)} min`, severity: 'warning' });
  }
  if (ride.status === 'in_progress' && ride.started_at && minutesSince(ride.started_at) >= 60) {
    flags.push({ code: 'long_in_progress', label: `Em andamento há ${minutesSince(ride.started_at)} min`, severity: 'warning' });
  }
  if (ride.status === 'canceled_by_passenger' || ride.status === 'canceled_by_driver') {
    flags.push({ code: 'canceled', label: 'Corrida cancelada', severity: 'warning' });
  }
  if (hasActiveEmergency) {
    flags.push({ code: 'active_emergency', label: 'Emergência ativa vinculada', severity: 'critical' });
  }

  return flags;
}

router.get('/rides/:id', async (req: Request, res: Response) => {
  try {
    const adminReq = req as Request & { admin?: { role?: string } };
    const canSeeEmergencyDetails = adminReq.admin?.role === 'SUPER_ADMIN';

    const ride = await prisma.rides_v2.findUnique({
      where: { id: req.params.id },
      include: {
        passenger: { select: { id: true, name: true, phone: true } },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            neighborhoods: { select: { name: true } },
            communities: { select: { name: true } },
          },
        },
        origin_neighborhood: { select: { name: true, territory_id: true } },
        dest_neighborhood: { select: { name: true } },
        offers: {
          orderBy: { sent_at: 'asc' },
          select: {
            id: true,
            status: true,
            sent_at: true,
            expires_at: true,
            responded_at: true,
            territory_tier: true,
            driver: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            sender_type: true,
            recipient_type: true,
            message_code: true,
            message_text: true,
            created_at: true,
            read_at: true,
          },
        },
        emergency_events: {
          orderBy: { created_at: 'asc' },
          include: {
            _count: { select: { location_trail: true } },
          },
        },
      },
    });

    if (!ride) return res.status(404).json({ success: false, error: 'Corrida não encontrada' });

    const requestedTerritoryId = typeof req.query.territory_id === 'string' && req.query.territory_id.trim()
      ? req.query.territory_id.trim()
      : null;
    const rideTerritoryId = ride.origin_neighborhood?.territory_id || null;
    const territoryBlock = forbiddenRideTerritoryResponse(req, rideTerritoryId);
    if (territoryBlock) {
      return res.status(territoryBlock.status).json({ success: false, error: territoryBlock.error });
    }
    if (requestedTerritoryId && rideTerritoryId !== requestedTerritoryId) {
      return res.status(403).json({ success: false, error: 'Sem permissao para este territorio' });
    }

    const timeline: Array<{
      type: string;
      title: string;
      at: Date;
      description?: string | null;
      severity: 'info' | 'success' | 'warning' | 'critical';
    }> = [];
    const addTimeline = (
      type: string,
      title: string,
      at?: Date | null,
      description?: string | null,
      severity: 'info' | 'success' | 'warning' | 'critical' = 'info'
    ) => {
      if (at) timeline.push({ type, title, at, description, severity });
    };

    addTimeline('requested', 'Corrida solicitada', ride.requested_at, ride.origin_text || null, 'info');
    addTimeline('offered', 'Primeira oferta enviada', ride.offered_at, null, 'info');
    addTimeline('accepted', 'Corrida aceita', ride.accepted_at, ride.driver?.name || null, 'success');
    addTimeline('arrived', 'Motorista chegou', ride.arrived_at, null, 'success');
    addTimeline('started', 'Corrida iniciada', ride.started_at, null, 'success');
    addTimeline('completed', 'Corrida finalizada', ride.completed_at, null, 'success');
    addTimeline('canceled', 'Corrida cancelada', ride.canceled_at, ride.status, 'warning');
    if (ride.status === 'no_driver') addTimeline('no_driver', 'Encerrada sem motorista', ride.updated_at, null, 'warning');

    for (const offer of ride.offers) {
      addTimeline('offer', 'Oferta enviada', offer.sent_at, offer.driver?.name || null, 'info');
      if (offer.responded_at) addTimeline('offer_response', `Oferta ${offer.status}`, offer.responded_at, offer.driver?.name || null, offer.status === 'accepted' ? 'success' : 'warning');
    }

    for (const message of ride.messages) {
      addTimeline('message', 'Mensagem rapida enviada', message.created_at, `${message.sender_type} -> ${message.recipient_type}: ${message.message_text}`, 'info');
    }

    for (const event of ride.emergency_events) {
      addTimeline('emergency', 'Evento de emergencia', event.created_at, event.status, event.status === 'active' ? 'critical' : 'warning');
      addTimeline('emergency_resolved', 'Emergência resolvida', event.resolved_at, event.status, 'success');
    }

    timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const hasActiveEmergency = ride.emergency_events.some(event => event.status === 'active');
    const [operationalNotes, emergencyFollowups] = await Promise.all([
      getRideOperationalNotes(ride.id),
      getRideEmergencyFollowups(ride.id),
    ]);

    res.json({
      success: true,
      data: {
        ride: {
          id: ride.id,
          status: ride.status,
          origin_text: ride.origin_text,
          destination_text: ride.destination_text,
          passenger: ride.passenger ? {
            ...ride.passenger,
            phone: canSeeEmergencyDetails ? ride.passenger.phone : maskPhone(ride.passenger.phone),
          } : null,
          driver: ride.driver ? {
            ...ride.driver,
            phone: canSeeEmergencyDetails ? ride.driver.phone : maskPhone(ride.driver.phone),
          } : null,
          region: ride.origin_neighborhood?.name || null,
          destination_region: ride.dest_neighborhood?.name || null,
          territory_match: ride.territory_match,
          service_category: ride.service_category,
          ride_type: ride.ride_type,
          requested_at: ride.requested_at,
          offered_at: ride.offered_at,
          accepted_at: ride.accepted_at,
          arrived_at: ride.arrived_at,
          started_at: ride.started_at,
          completed_at: ride.completed_at,
          canceled_at: ride.canceled_at,
          updated_at: ride.updated_at,
          values: {
            quoted_price: money(ride.quoted_price),
            locked_price: money(ride.locked_price),
            adjusted_price: money(ride.adjusted_price),
            final_price: money(ride.final_price),
            platform_fee: money(ride.platform_fee),
            driver_earnings: money(ride.driver_earnings),
          },
        },
        timeline,
        attention_flags: buildAttentionFlags({
          status: String(ride.status),
          requested_at: ride.requested_at,
          offered_at: ride.offered_at,
          arrived_at: ride.arrived_at,
          started_at: ride.started_at,
          canceled_at: ride.canceled_at,
        }, hasActiveEmergency),
        messages: ride.messages,
        offers: ride.offers,
        operational_notes: operationalNotes,
        emergencies: {
          total: ride.emergency_events.length,
          active: ride.emergency_events.filter(event => event.status === 'active').length,
          items: canSeeEmergencyDetails
            ? ride.emergency_events.map(event => ({
                id: event.id,
                status: event.status,
                triggered_by_type: event.triggered_by_type,
                trigger_source: event.trigger_source,
                created_at: event.created_at,
                resolved_at: event.resolved_at,
                resolution_notes: event.resolution_notes,
                trail_points: event._count.location_trail,
              }))
            : ride.emergency_events.map(event => ({
                status: event.status,
                created_at: event.created_at,
                resolved_at: event.resolved_at,
              })),
          followups: emergencyFollowups,
        },
      },
    });
  } catch (err) {
    console.error('[OPS_RIDE_DETAIL]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar detalhe operacional' });
  }
});


router.post("/rides/:id/notes", async (req: Request, res: Response) => {
  try {
    const adminReq = req as Request & { admin: { id: string; email?: string | null; name?: string | null; role?: string | null } };
    const admin = adminReq.admin;
    const note = normalizeOperationNote(req.body?.note);
    const noteType = normalizeOperationNoteType(req.body?.note_type);

    if (!note) return res.status(400).json({ success: false, error: "Observação obrigatória" });

    const ride = await prisma.rides_v2.findUnique({
      where: { id: req.params.id },
      select: { id: true, origin_neighborhood: { select: { territory_id: true } } },
    });

    if (!ride) return res.status(404).json({ success: false, error: "Corrida não encontrada" });

    const requestedTerritoryId = typeof req.query.territory_id === "string" && req.query.territory_id.trim()
      ? req.query.territory_id.trim()
      : null;
    const rideTerritoryId = ride.origin_neighborhood?.territory_id || null;
    const territoryBlock = forbiddenRideTerritoryResponse(req, rideTerritoryId);
    if (territoryBlock) {
      return res.status(territoryBlock.status).json({ success: false, error: territoryBlock.error });
    }
    if (requestedTerritoryId && rideTerritoryId !== requestedTerritoryId) {
      return res.status(403).json({ success: false, error: "Sem permissao para este territorio" });
    }

    const payload = { note_type: noteType, note };
    const { rows } = await pool.query(
      "INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, new_value, reason, ip_address) " +
        "VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) " +
        "RETURNING id, admin_id, new_value->>'note_type' AS note_type, COALESCE(new_value->>'note', reason) AS note, created_at",
      [
        admin.id,
        "operation_note",
        "rides_v2",
        ride.id,
        JSON.stringify(payload),
        note,
        req.ip || null,
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        admin_name: admin.name || null,
        admin_role: admin.role || null,
      },
    });
  } catch (err) {
    console.error("[OPS_RIDE_NOTE]", err);
    res.status(500).json({ success: false, error: "Erro ao registrar observação interna." });
  }
});

router.post("/rides/:id/emergency-followups", async (req: Request, res: Response) => {
  try {
    const adminReq = req as Request & { admin: { id: string; name?: string | null; role?: string | null } };
    const admin = adminReq.admin;
    const followupType = normalizeEmergencyFollowupType(req.body?.followup_type);
    const note = normalizeEmergencyFollowupNote(req.body?.note);

    if (!note) return res.status(400).json({ success: false, error: "Observação obrigatória" });

    const ride = await prisma.rides_v2.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        origin_neighborhood: { select: { territory_id: true } },
        emergency_events: { select: { id: true }, take: 1 },
      },
    });

    if (!ride) return res.status(404).json({ success: false, error: "Corrida não encontrada" });
    if (ride.emergency_events.length === 0) {
      return res.status(400).json({ success: false, error: "Corrida sem emergência vinculada" });
    }

    const requestedTerritoryId = typeof req.query.territory_id === "string" && req.query.territory_id.trim()
      ? req.query.territory_id.trim()
      : null;
    const rideTerritoryId = ride.origin_neighborhood?.territory_id || null;
    const territoryBlock = forbiddenRideTerritoryResponse(req, rideTerritoryId);
    if (territoryBlock) {
      return res.status(territoryBlock.status).json({ success: false, error: territoryBlock.error });
    }
    if (requestedTerritoryId && rideTerritoryId !== requestedTerritoryId) {
      return res.status(403).json({ success: false, error: "Sem permissao para este territorio" });
    }

    const payload = { followup_type: followupType, note };
    const { rows } = await pool.query(
      "INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, new_value, reason, ip_address) " +
        "VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) " +
        "RETURNING id, admin_id, new_value->>'followup_type' AS followup_type, COALESCE(new_value->>'note', reason) AS note, created_at",
      [
        admin.id,
        "emergency_followup",
        "rides_v2",
        ride.id,
        JSON.stringify(payload),
        note,
        req.ip || null,
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        admin_name: admin.name || null,
        admin_role: admin.role || null,
      },
    });
  } catch (err) {
    console.error("[OPS_EMERGENCY_FOLLOWUP]", err);
    res.status(500).json({ success: false, error: "Erro ao registrar acompanhamento de emergência." });
  }
});


router.get('/daily-report', async (req: Request, res: Response) => {
  try {
    const rawDate = typeof req.query.date === 'string' && req.query.date.trim()
      ? req.query.date.trim()
      : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    let bounds: { start: Date; end: Date; date: string };
    try {
      bounds = getSaoPauloDayBounds(rawDate);
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Data inválida. Use YYYY-MM-DD.' });
    }

    const territoryFilter = await resolveTerritoryFilter(req, res);
    if (!territoryFilter) return;

    // Fase 4A: relatório read-only por território de origem. Corridas cross-territory entram pelo território da origem.
    const requestedWhere = applyRideTerritoryFilter({ requested_at: { gte: bounds.start, lt: bounds.end } }, territoryFilter.neighborhoodIds);
    const completedWhere = applyRideTerritoryFilter({ status: 'completed', completed_at: { gte: bounds.start, lt: bounds.end } }, territoryFilter.neighborhoodIds);
    const canceledWhere = applyRideTerritoryFilter({ status: { in: ['canceled_by_passenger', 'canceled_by_driver'] }, canceled_at: { gte: bounds.start, lt: bounds.end } }, territoryFilter.neighborhoodIds);
    const noDriverWhere = applyRideTerritoryFilter({ status: 'no_driver', requested_at: { gte: bounds.start, lt: bounds.end } }, territoryFilter.neighborhoodIds);
    const offerTimingWhere = applyRideTerritoryFilter({ requested_at: { gte: bounds.start, lt: bounds.end }, offered_at: { not: null } }, territoryFilter.neighborhoodIds);
    const emergencyRegisteredWhere: any = territoryFilter.neighborhoodIds
      ? { created_at: { gte: bounds.start, lt: bounds.end }, ride: { origin_neighborhood_id: territoryFilter.neighborhoodIds.length > 0 ? { in: territoryFilter.neighborhoodIds } : '__none__' } }
      : { created_at: { gte: bounds.start, lt: bounds.end } };
    const activeEmergencyWhere: any = territoryFilter.neighborhoodIds
      ? { status: 'active', ride: { origin_neighborhood_id: territoryFilter.neighborhoodIds.length > 0 ? { in: territoryFilter.neighborhoodIds } : '__none__' } }
      : { status: 'active' };

    const [
      requestedGroups,
      completedCount,
      canceledCount,
      noDriverCount,
      settlementSums,
      offerTimings,
      emergencyRegisteredCount,
      activeEmergencyCount,
    ] = await Promise.all([
      prisma.rides_v2.groupBy({ by: ['status'], where: requestedWhere, _count: true }),
      prisma.rides_v2.count({ where: completedWhere }),
      prisma.rides_v2.count({ where: canceledWhere }),
      prisma.rides_v2.count({ where: noDriverWhere }),
      // Financial report values come from ride_settlements, the persisted source of truth.
      prisma.ride_settlements.aggregate({ where: { ride: { is: completedWhere } }, _sum: { final_price: true, fee_amount: true, driver_earnings: true } }),
      prisma.rides_v2.findMany({ where: offerTimingWhere, select: { requested_at: true, offered_at: true } }),
      prisma.ride_emergency_events.count({ where: emergencyRegisteredWhere }),
      prisma.ride_emergency_events.count({ where: activeEmergencyWhere }),
    ]);

    res.json(buildDailyReportPayload({
      date: bounds.date,
      start: bounds.start,
      end: bounds.end,
      territory: buildTerritoryMeta(req, territoryFilter.territories, territoryFilter.territoryId),
      requestedGroups: requestedGroups.map(group => ({ status: String(group.status), _count: group._count })),
      completedCount,
      canceledCount,
      noDriverCount,
      emergencyRegisteredCount,
      activeEmergencyCount,
      settlementSums: settlementSums._sum,
      offerTimings,
    }));
  } catch (err) {
    console.error('[OPS_DAILY_REPORT]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar relatório diário operacional' });
  }
});

router.get('/cockpit', async (req: Request, res: Response) => {
  try {
    const { start, label } = getPeriod('today');
    const admin = (req as any).admin;
    const canSeeEmergencyDetails = admin?.role === 'SUPER_ADMIN';
    const canSeeRawDriverPhone = shouldReturnRawOperationalDriverPhone(admin?.role);
    const activeStatuses = ['requested', 'offered', 'accepted', 'arrived', 'in_progress'];
    const territoryFilter = await resolveTerritoryFilter(req, res);
    if (!territoryFilter) return;

    const rideTodayWhere = applyRideTerritoryFilter({ requested_at: { gte: start } }, territoryFilter.neighborhoodIds);
    const activeRideWhere = applyRideTerritoryFilter({ status: { in: activeStatuses as any } }, territoryFilter.neighborhoodIds);
    const offerTimingWhere = applyRideTerritoryFilter({ requested_at: { gte: start }, offered_at: { not: null } }, territoryFilter.neighborhoodIds);
    const demandWhere = applyRideTerritoryFilter({ status: 'no_driver', requested_at: { gte: start } }, territoryFilter.neighborhoodIds);
    const completedWhere = applyRideTerritoryFilter({ status: 'completed', completed_at: { gte: start } }, territoryFilter.neighborhoodIds);
    const canceledWhere = applyRideTerritoryFilter({ status: { in: ['canceled_by_passenger', 'canceled_by_driver'] }, canceled_at: { gte: start } }, territoryFilter.neighborhoodIds);
    const driverWhere = applyDriverTerritoryFilter({ availability: { in: ['online', 'busy'] } }, territoryFilter.neighborhoodIds);
    const emergencyWhere: any = territoryFilter.neighborhoodIds
      ? { status: 'active', ride: { origin_neighborhood_id: territoryFilter.neighborhoodIds.length > 0 ? { in: territoryFilter.neighborhoodIds } : '__none__' } }
      : { status: 'active' };

    const [
      rideGroups,
      activeRides,
      onlineDrivers,
      ridesWithOffer,
      demandRows,
      completedRides,
      canceledRows,
      activeEmergencyCount,
      emergencyAlertEvents,
      emergencyEvents,
    ] = await Promise.all([
      prisma.rides_v2.groupBy({
        by: ['status'],
        where: rideTodayWhere,
        _count: true,
      }),
      prisma.rides_v2.findMany({
        where: activeRideWhere,
        orderBy: { requested_at: 'desc' },
        take: 30,
        select: {
          id: true,
          status: true,
          origin_text: true,
          destination_text: true,
          requested_at: true,
          offered_at: true,
          accepted_at: true,
          arrived_at: true,
          started_at: true,
          updated_at: true,
          passenger: { select: { name: true } },
          driver: { select: { name: true } },
          origin_neighborhood: { select: { name: true } },
        },
      }),
      prisma.driver_status.findMany({
        where: driverWhere,
        orderBy: { updated_at: 'desc' },
        take: 50,
        select: {
          availability: true,
          updated_at: true,
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              secondary_base_label: true,
              last_location_updated_at: true,
              neighborhoods: { select: { name: true } },
              communities: { select: { name: true } },
            },
          },
        },
      }),
      prisma.rides_v2.findMany({
        where: offerTimingWhere,
        select: { requested_at: true, offered_at: true },
      }),
      prisma.rides_v2.findMany({
        where: demandWhere,
        orderBy: { requested_at: 'desc' },
        take: 100,
        select: {
          id: true,
          requested_at: true,
          origin_text: true,
          origin_neighborhood: { select: { name: true } },
        },
      }),
      prisma.rides_v2.findMany({
        where: completedWhere,
        orderBy: { completed_at: 'desc' },
        take: 30,
        select: {
          id: true,
          status: true,
          origin_text: true,
          destination_text: true,
          completed_at: true,
          final_price: true,
          platform_fee: true,
          driver_earnings: true,
          passenger: { select: { name: true } },
          driver: { select: { name: true } },
          origin_neighborhood: { select: { name: true } },
        },
      }),
      prisma.rides_v2.findMany({
        where: canceledWhere,
        orderBy: { canceled_at: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          requested_at: true,
          canceled_at: true,
          updated_at: true,
          passenger: { select: { name: true } },
          driver: { select: { name: true } },
          origin_neighborhood: { select: { name: true } },
        },
      }),
      prisma.ride_emergency_events.count({ where: emergencyWhere }),
      prisma.ride_emergency_events.findMany({
        where: emergencyWhere,
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          ride: {
            select: {
              id: true,
              status: true,
              requested_at: true,
              passenger: { select: { name: true } },
              driver: { select: { name: true } },
              origin_neighborhood: { select: { name: true } },
            },
          },
        },
      }),
      canSeeEmergencyDetails
        ? prisma.ride_emergency_events.findMany({
            where: emergencyWhere,
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
              ride: {
                select: {
                  id: true,
                  status: true,
                  passenger: { select: { name: true } },
                  driver: { select: { name: true } },
                },
              },
              _count: { select: { location_trail: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const byStatus: Record<string, number> = {};
    rideGroups.forEach(g => { byStatus[g.status] = g._count; });
    const avgToOfferSeconds = ridesWithOffer.length > 0
      ? Math.round(
          ridesWithOffer.reduce((sum, ride) => {
            return sum + ((ride.offered_at!.getTime() - ride.requested_at.getTime()) / 1000);
          }, 0) / ridesWithOffer.length
        )
      : null;

    const demandByRegion = new Map<string, { region: string; count: number; last_requested_at: Date | null }>();
    for (const ride of demandRows) {
      const region = ride.origin_neighborhood?.name || ride.origin_text || 'Região não informada';
      const current = demandByRegion.get(region) || { region, count: 0, last_requested_at: null };
      current.count += 1;
      if (!current.last_requested_at || ride.requested_at > current.last_requested_at) {
        current.last_requested_at = ride.requested_at;
      }
      demandByRegion.set(region, current);
    }

    const operationalAlerts = sortOperationalAlerts([
      ...activeRides.flatMap(ride => buildRideOperationalAlerts(ride)),
      ...emergencyAlertEvents.map(event => ({
        id: event.id + '-emergency',
        type: 'active_emergency',
        title: 'Emergência ativa',
        severity: 'critical' as const,
        ride_id: event.ride_id || null,
        status: event.ride?.status || event.status || null,
        passenger_name: event.ride?.passenger?.name || null,
        driver_name: event.ride?.driver?.name || null,
        region: event.ride?.origin_neighborhood?.name || null,
        overdue_minutes: minutesSince(event.created_at),
        occurred_at: event.created_at,
      })),
      ...canceledRows.map(ride => ({
        id: ride.id + '-canceled',
        type: 'recent_cancellation',
        title: 'Cancelamento recente',
        severity: 'monitor' as const,
        ride_id: ride.id,
        status: String(ride.status),
        passenger_name: ride.passenger?.name || null,
        driver_name: ride.driver?.name || null,
        region: ride.origin_neighborhood?.name || null,
        overdue_minutes: null,
        occurred_at: ride.canceled_at || ride.updated_at,
      })),
      ...demandRows.slice(0, 20).map(ride => ({
        id: ride.id + '-no-driver',
        type: 'no_driver',
        title: 'Pedido encerrado sem motorista',
        severity: 'attention' as const,
        ride_id: ride.id,
        status: 'no_driver',
        passenger_name: null,
        driver_name: null,
        region: ride.origin_neighborhood?.name || ride.origin_text || null,
        overdue_minutes: minutesSince(ride.requested_at),
        occurred_at: ride.requested_at,
      })),
    ]).slice(0, 20);

    res.json({
      success: true,
      generated_at: new Date(),
      period: { start, end: new Date(), label },
      territory: buildTerritoryMeta(req, territoryFilter.territories, territoryFilter.territoryId),
      cards: {
        drivers_online: onlineDrivers.filter(d => d.availability === 'online').length,
        active_rides: activeStatuses.reduce((sum, status) => sum + (byStatus[status] || 0), 0),
        no_driver_today: byStatus['no_driver'] || 0,
        canceled_today: (byStatus['canceled_by_passenger'] || 0) + (byStatus['canceled_by_driver'] || 0),
        active_emergencies: activeEmergencyCount,
        avg_to_offer_seconds: avgToOfferSeconds,
      },
      operational_alerts: operationalAlerts,
      active_rides: activeRides.map(ride => {
        const attention = needsAttention(ride.status, ride.requested_at);
        return {
          id: ride.id,
          status: ride.status,
          origin_text: ride.origin_text,
          destination_text: ride.destination_text,
          passenger_name: ride.passenger?.name || null,
          driver_name: ride.driver?.name || null,
          region: ride.origin_neighborhood?.name || null,
          requested_at: ride.requested_at,
          minutes_since_request: minutesSince(ride.requested_at),
          attention: attention.attention,
          attention_reason: attention.reason,
        };
      }),
      online_drivers: onlineDrivers.map(status => ({
        id: status.driver.id,
        name: status.driver.name,
        phone: canSeeRawDriverPhone ? status.driver.phone : maskPhone(status.driver.phone),
        base: status.driver.secondary_base_label || status.driver.communities?.name || status.driver.neighborhoods?.name || null,
        availability: status.availability,
        driver_status: status.driver.status,
        last_seen_at: status.updated_at,
        last_location_at: status.driver.last_location_updated_at,
      })),
      completed_rides_today: completedRides.map(ride => ({
        id: ride.id,
        status: ride.status,
        origin_text: ride.origin_text,
        destination_text: ride.destination_text,
        passenger_name: ride.passenger?.name || null,
        driver_name: ride.driver?.name || null,
        region: ride.origin_neighborhood?.name || null,
        completed_at: ride.completed_at,
        final_price: money(ride.final_price),
        platform_fee: money(ride.platform_fee),
        driver_earnings: money(ride.driver_earnings),
      })),
      demand_unserved: {
        total: demandRows.length,
        by_region: Array.from(demandByRegion.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 12),
        recent: demandRows.slice(0, 20).map(ride => ({
          id: ride.id,
          region: ride.origin_neighborhood?.name || ride.origin_text || 'Região não informada',
          requested_at: ride.requested_at,
        })),
      },
      emergencies: canSeeEmergencyDetails
        ? emergencyEvents.map(event => ({
            id: event.id,
            ride_id: event.ride_id,
            status: event.status,
            triggered_by_type: event.triggered_by_type,
            trigger_source: event.trigger_source,
            created_at: event.created_at,
            passenger_name: event.ride?.passenger?.name || null,
            driver_name: event.ride?.driver?.name || null,
            ride_status: event.ride?.status || null,
            trail_points: event._count.location_trail,
          }))
        : [],
    });
  } catch (err: any) {
    console.error('[OPS_COCKPIT]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar cockpit operacional' });
  }
});

router.get('/monitor', requireRole(['SUPER_ADMIN', 'OPERATOR']), async (req: Request, res: Response) => {
  try {
    const { start, label } = getPeriod(req.query.period as string || 'today');

    // Rides by status
    const rideGroups = await prisma.rides_v2.groupBy({
      by: ['status'],
      where: { requested_at: { gte: start } },
      _count: true,
    });
    const rc: Record<string, number> = {};
    rideGroups.forEach(g => { rc[g.status] = g._count; });

    const activeStatuses = ['requested', 'offered', 'accepted', 'arrived', 'in_progress'];
    const rides = {
      requested: rideGroups.reduce((s, g) => s + g._count, 0),
      completed: rc['completed'] || 0,
      canceled_by_passenger: rc['canceled_by_passenger'] || 0,
      canceled_by_driver: rc['canceled_by_driver'] || 0,
      no_driver: rc['no_driver'] || 0,
      active: activeStatuses.reduce((s, st) => s + (rc[st] || 0), 0),
    };

    // Offers by status
    const offerGroups = await prisma.ride_offers.groupBy({
      by: ['status'],
      where: { sent_at: { gte: start } },
      _count: true,
    });
    const oc: Record<string, number> = {};
    offerGroups.forEach(g => { oc[g.status] = g._count; });
    const offers = {
      total: offerGroups.reduce((s, g) => s + g._count, 0),
      accepted: oc['accepted'] || 0,
      rejected: oc['rejected'] || 0,
      expired: oc['expired'] || 0,
      canceled: oc['canceled'] || 0,
    };

    // Territory distribution (accepted offers only)
    const tierGroups = await prisma.ride_offers.groupBy({
      by: ['territory_tier'],
      where: { status: 'accepted', sent_at: { gte: start } },
      _count: true,
    });
    const territory: Record<string, number> = { COMMUNITY: 0, NEIGHBORHOOD: 0, OUTSIDE: 0 };
    tierGroups.forEach(g => { if (g.territory_tier) territory[g.territory_tier] = g._count; });

    // Timing: avg accept time
    const acceptedOffers = await prisma.ride_offers.findMany({
      where: { status: 'accepted', sent_at: { gte: start }, responded_at: { not: null } },
      select: { sent_at: true, responded_at: true },
    });
    const acceptTimes = acceptedOffers
      .filter(o => o.responded_at)
      .map(o => (o.responded_at!.getTime() - o.sent_at.getTime()) / 1000);
    const avgAccept = acceptTimes.length > 0 ? Math.round(acceptTimes.reduce((a, b) => a + b, 0) / acceptTimes.length) : null;

    // Timing: avg to first offer
    const ridesWithOffer = await prisma.rides_v2.findMany({
      where: { requested_at: { gte: start }, offered_at: { not: null } },
      select: { requested_at: true, offered_at: true },
    });
    const toOfferTimes = ridesWithOffer.map(r => (r.offered_at!.getTime() - r.requested_at.getTime()) / 1000);
    const avgToOffer = toOfferTimes.length > 0 ? Math.round(toOfferTimes.reduce((a, b) => a + b, 0) / toOfferTimes.length) : null;

    // Timing: avg to no_driver
    const noDriverRides = await prisma.rides_v2.findMany({
      where: { status: 'no_driver', requested_at: { gte: start } },
      select: { requested_at: true, updated_at: true },
    });
    const noDriverTimes = noDriverRides.map(r => (r.updated_at.getTime() - r.requested_at.getTime()) / 1000);
    const avgNoDriver = noDriverTimes.length > 0 ? Math.round(noDriverTimes.reduce((a, b) => a + b, 0) / noDriverTimes.length) : null;

    // Recent rides
    const recentRides = await prisma.rides_v2.findMany({
      where: { requested_at: { gte: start } },
      orderBy: { requested_at: 'desc' },
      take: 15,
      select: {
        id: true, status: true, origin_text: true, destination_text: true,
        requested_at: true, completed_at: true, updated_at: true,
        driver: { select: { name: true } },
        offers: { where: { status: 'accepted' }, select: { territory_tier: true, sent_at: true, responded_at: true }, take: 1 },
      },
    });

    const recent = recentRides.map(r => {
      const acceptedOffer = r.offers[0];
      const acceptSec = acceptedOffer?.responded_at && acceptedOffer?.sent_at
        ? Math.round((acceptedOffer.responded_at.getTime() - acceptedOffer.sent_at.getTime()) / 1000) : null;
      const endTime = r.completed_at || r.updated_at;
      const totalMin = endTime ? Math.round((endTime.getTime() - r.requested_at.getTime()) / 60000) : null;
      return {
        id: r.id,
        status: r.status,
        origin_text: r.origin_text,
        destination_text: r.destination_text,
        driver_name: r.driver?.name || null,
        territory_tier: acceptedOffer?.territory_tier || null,
        accept_time_seconds: acceptSec,
        total_time_minutes: totalMin,
        requested_at: r.requested_at,
        completed_at: r.completed_at,
      };
    });

    res.json({
      success: true,
      period: { start, end: new Date(), label },
      rides, offers, territory,
      timing: { avg_accept_seconds: avgAccept, avg_to_offer_seconds: avgToOffer, avg_to_no_driver_seconds: avgNoDriver },
      recent,
    });
  } catch (err: any) {
    console.error('[OPS_MONITOR]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar monitor' });
  }
});

// GET /api/admin/operations/demand-gaps — demanda reprimida (corridas sem motorista)
router.get('/demand-gaps', async (req: Request, res: Response) => {
  try {
    const { start, label } = getPeriod(req.query.period as string || '7d');
    const realOnly = req.query.real !== 'false'; // default: filter out likely test rides

    const where: any = { status: 'no_driver', requested_at: { gte: start } };
    if (realOnly) {
      where.passenger_app_version = { not: null }; // exclude API-only / no-app rides
    }

    const rows = await prisma.rides_v2.findMany({
      where,
      select: {
        requested_at: true,
        origin_neighborhood: { select: { name: true } },
      },
    });

    const total = rows.length;

    // Por bairro de origem
    const byNeighborhood: Record<string, { count: number; hours: number[] }> = {};
    const byHour: Record<number, number> = {};
    const byDow: Record<number, number> = {};

    for (const r of rows) {
      const name = r.origin_neighborhood?.name || 'Sem bairro';
      const h = r.requested_at.getHours();
      const dow = r.requested_at.getDay();

      if (!byNeighborhood[name]) byNeighborhood[name] = { count: 0, hours: [] };
      byNeighborhood[name].count++;
      byNeighborhood[name].hours.push(h);

      byHour[h] = (byHour[h] || 0) + 1;
      byDow[dow] = (byDow[dow] || 0) + 1;
    }

    const dowNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

    const neighborhoods = Object.entries(byNeighborhood)
      .map(([name, d]) => {
        const freq: Record<number, number> = {};
        d.hours.forEach(h => { freq[h] = (freq[h] || 0) + 1; });
        const peak_hour = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        return { neighborhood: name, count: d.count, peak_hour: peak_hour ? Number(peak_hour[0]) : null };
      })
      .sort((a, b) => b.count - a.count);

    const hours = Object.entries(byHour)
      .map(([h, count]) => ({ hour: Number(h), count }))
      .sort((a, b) => a.hour - b.hour);

    const days = Object.entries(byDow)
      .map(([d, count]) => ({ day: dowNames[Number(d)], count }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    res.json({
      success: true,
      period: { start, label },
      filter: { real_only: realOnly },
      total_no_driver: total,
      by_origin_neighborhood: neighborhoods,
      by_hour: hours,
      by_day_of_week: days,
    });
  } catch (err: any) {
    console.error('[DEMAND_GAPS]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar demanda reprimida' });
  }
});

export default router;
