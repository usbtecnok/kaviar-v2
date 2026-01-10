// Rio de Janeiro (município) — guard rail aproximado (bbox)
// Aceita uma folga pra não bloquear bordas.
export const RJ_BBOX = {
  minLat: -23.15,
  maxLat: -22.70,
  minLng: -43.85,
  maxLng: -43.00,
};

export function isLikelyInRioCity(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  return (
    lat >= RJ_BBOX.minLat &&
    lat <= RJ_BBOX.maxLat &&
    lng >= RJ_BBOX.minLng &&
    lng <= RJ_BBOX.maxLng
  );
}

export function fmtLatLng(lat, lng) {
  const f = (n) => (typeof n === "number" ? n.toFixed(6) : "N/A");
  return `${f(lat)}, ${f(lng)}`;
}

export function geometryQuality(geometryType) {
  // Quanto maior, melhor
  switch (geometryType) {
    case "MultiPolygon":
      return 30;
    case "Polygon":
      return 25;
    case "LineString":
    case "MultiLineString":
      return 10;
    case "Point":
    case "MultiPoint":
      return 5;
    case null:
    case undefined:
      return 0;
    default:
      return 1;
  }
}

export function canonicalScore(candidate) {
  const type = candidate?.geofence?.geometry?.type;
  const q = geometryQuality(type);

  const lat = candidate?.centerLat;
  const lng = candidate?.centerLng;
  const inRio = isLikelyInRioCity(lat, lng) ? 1 : 0;

  // Se você tiver status 404 confirmado, zera qualidade.
  const status = candidate?.geofenceStatus;
  const hasGeofence = status === 200 || q > 0 ? 1 : 0;

  // Peso final: primeiro qualidade, depois estar no RJ, depois existir geofence
  return q * 100 + inRio * 10 + hasGeofence;
}

export function pickCanonical(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    const sb = canonicalScore(b);
    const sa = canonicalScore(a);
    if (sb !== sa) return sb - sa;

    // desempate: preferir ID que já aparece como "canônico" na governance (se você tiver esse campo)
    // ou ordenação estável por id
    return String(a.id).localeCompare(String(b.id));
  });

  return ranked[0];
}

export function canVerifyGeofence({
  isDuplicateName,
  hasSelectedCanonical,
  centerLat,
  centerLng,
  geometryType,
  geofenceStatus,
}) {
  // 1) Fora do RJ → bloqueio total
  if (!isLikelyInRioCity(centerLat, centerLng)) {
    return {
      ok: false,
      reason: `Coordenadas fora do RJ (${fmtLatLng(centerLat, centerLng)}).`,
    };
  }

  // 2) Duplicado → exige escolha explícita do canônico
  if (isDuplicateName && !hasSelectedCanonical) {
    return {
      ok: false,
      reason:
        "Nome duplicado: selecione o ID canônico antes de marcar como verificado.",
    };
  }

  // 3) Se for SEM_DADOS (404) → recomendação: não permitir verified
  // (Opcional, mas MUITO seguro)
  if (geofenceStatus === 404 || geometryQuality(geometryType) === 0) {
    return {
      ok: false,
      reason:
        "Sem geofence (SEM_DADOS). Busque/salve um Polygon antes de verificar.",
    };
  }

  return { ok: true, reason: "" };
}
