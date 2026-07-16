export function clearActiveLayer(map, layerRef) {
  if (!map || !layerRef?.current) return false;
  map.removeLayer(layerRef.current);
  layerRef.current = null;
  return true;
}
