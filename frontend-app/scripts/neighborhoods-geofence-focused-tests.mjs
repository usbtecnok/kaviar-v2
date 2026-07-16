import assert from 'node:assert/strict';
import {
  shouldFetchGeofence,
  isValidPolygonCoordinates,
  isCompatibleWithCity,
  getCityCenter
} from '../src/pages/admin/neighborhoodsGeofenceUtils.js';
import { clearActiveLayer } from '../src/components/maps/leafletLayerUtils.js';

function polygonAround(city) {
  const c = getCityCenter(city);
  return [[
    [c.lng - 0.01, c.lat - 0.01],
    [c.lng + 0.01, c.lat - 0.01],
    [c.lng + 0.01, c.lat + 0.01],
    [c.lng - 0.01, c.lat + 0.01],
    [c.lng - 0.01, c.lat - 0.01]
  ]];
}

async function runSelectionScenario({ selections, fetchById, city }) {
  let currentRequestId = 0;
  let geofence = null;
  let geofenceLoading = false;
  const calls = [];

  const handleSelect = async (neighborhood) => {
    const requestId = ++currentRequestId;
    geofence = null;
    geofenceLoading = true;

    if (!shouldFetchGeofence(neighborhood)) {
      if (requestId === currentRequestId) {
        geofence = 'NO_GEOMETRY';
        geofenceLoading = false;
      }
      return;
    }

    try {
      calls.push(neighborhood.id);
      const response = await fetchById(neighborhood.id);
      if (requestId !== currentRequestId) return;

      const coordinates = response?.data?.coordinates;
      if (!coordinates || !isValidPolygonCoordinates(coordinates)) {
        geofence = 'INVALID_GEOMETRY';
        return;
      }

      if (!isCompatibleWithCity(coordinates, city)) {
        geofence = 'INCOMPATIBLE_CITY_GEOMETRY';
        return;
      }

      geofence = { type: 'Polygon', coordinates };
    } catch {
      if (requestId !== currentRequestId) return;
      geofence = 'NETWORK_ERROR';
    } finally {
      if (requestId === currentRequestId) {
        geofenceLoading = false;
      }
    }
  };

  await Promise.all(selections.map((entry) => entry(handleSelect)));
  return { geofence, geofenceLoading, calls };
}

async function testAThenNoGeofenceBeforeResponse() {
  const A = { id: 'A', has_geofence: true };
  const B = { id: 'B', has_geofence: false };

  const result = await runSelectionScenario({
    city: 'Tambaú',
    fetchById: (id) => new Promise((resolve) => {
      const delay = id === 'A' ? 60 : 10;
      setTimeout(() => resolve({ data: { coordinates: polygonAround('Tambaú') } }), delay);
    }),
    selections: [
      (select) => select(A),
      (select) => new Promise((resolve) => setTimeout(() => resolve(select(B)), 5))
    ]
  });

  assert.equal(result.geofence, 'NO_GEOMETRY');
  assert.deepEqual(result.calls, ['A']);
  assert.equal(result.geofenceLoading, false);
}

async function testOutOfOrderAThenB() {
  const A = { id: 'A', has_geofence: true };
  const B = { id: 'B', has_geofence: true };

  const result = await runSelectionScenario({
    city: 'Tambaú',
    fetchById: (id) => new Promise((resolve) => {
      const delay = id === 'A' ? 70 : 10;
      const city = id === 'A' ? 'Rio de Janeiro' : 'Tambaú';
      setTimeout(() => resolve({ data: { coordinates: polygonAround(city) } }), delay);
    }),
    selections: [
      (select) => select(A),
      (select) => new Promise((resolve) => setTimeout(() => resolve(select(B)), 5))
    ]
  });

  assert.equal(result.geofence?.type, 'Polygon');
  const tambau = polygonAround('Tambaú')[0][0][0];
  assert.equal(result.geofence.coordinates[0][0][0], tambau);
  assert.deepEqual(result.calls, ['A', 'B']);
  assert.equal(result.geofenceLoading, false);
}

async function testNoGeofenceSkipsApi() {
  const C = { id: 'C', has_geofence: false };
  const result = await runSelectionScenario({
    city: 'Tambaú',
    fetchById: async () => ({ data: { coordinates: polygonAround('Tambaú') } }),
    selections: [(select) => select(C)]
  });

  assert.equal(result.geofence, 'NO_GEOMETRY');
  assert.equal(result.calls.length, 0);
}

function testLayerRemoval() {
  const removed = [];
  const map = {
    removeLayer(layer) {
      removed.push(layer.id);
    }
  };
  const layerRef = { current: { id: 'old-layer' } };

  const didRemove = clearActiveLayer(map, layerRef);
  assert.equal(didRemove, true);
  assert.deepEqual(removed, ['old-layer']);
  assert.equal(layerRef.current, null);
}

async function main() {
  await testAThenNoGeofenceBeforeResponse();
  await testOutOfOrderAThenB();
  await testNoGeofenceSkipsApi();
  testLayerRemoval();
  console.log('Focused neighborhoods geofence tests: OK');
}

main().catch((err) => {
  console.error('Focused neighborhoods geofence tests: FAIL');
  console.error(err);
  process.exit(1);
});
