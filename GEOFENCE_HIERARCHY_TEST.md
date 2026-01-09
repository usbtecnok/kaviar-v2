# Geofence Hierarchy Test Results

## System Status: ✅ WORKING

### Hierarchical Resolution Test

**Current behavior:** BAIRRO priority (communities not imported yet)

```bash
# Test Copacabana (should return bairro until communities are imported)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9711&lon=-43.1822"
```

**Result:**
```json
{
  "match": true,
  "area": {
    "id": "bairro-copacabana",
    "name": "Copacabana", 
    "description": "Copacabana - Rio de Janeiro",
    "active": true
  }
}
```

### SABREN API Test

**Communities found in target bairros:**

```bash
curl "https://pgeo3.rio.rj.gov.br/arcgis/rest/services/SABREN/Limites_de_Favelas/FeatureServer/13/query?where=(bairro%20LIKE%20%27%25Copacabana%25%27%20OR%20bairro%20LIKE%20%27%25Leme%25%27%20OR%20bairro%20LIKE%20%27%25Ipanema%25%27)%20AND%20(nome%20LIKE%20%27%25Cantagalo%25%27%20OR%20nome%20LIKE%20%27%25Pavao%25%27%20OR%20nome%20LIKE%20%27%25Babil%25%27)&outFields=nome,bairro,complexo&f=json&returnGeometry=false"
```

**Found communities:**
- ✅ **Babilônia** (Leme) - Complexo: Babilônia
- ✅ **Morro do Cantagalo** (Ipanema) - Complexo: Cantagalo

### Next Steps

1. **Import communities:** Run the communities import script
2. **Test hierarchy:** After import, same coordinates should return `comunidade-*` when inside community boundaries
3. **Validate priority:** Points outside communities should still return `bairro-*`

### Implementation Summary

- ✅ **Hierarchical resolve:** COMUNIDADE > BAIRRO priority implemented
- ✅ **Import endpoint:** Already accepts `type="comunidade"` with proper ID prefixing
- ✅ **Communities script:** Ready to import from SABREN API
- ✅ **Documentation:** Complete with test coordinates and validation steps
- ✅ **Anti-Frankenstein:** No duplicated endpoints, minimal changes, no schema drift

**Status:** Ready for community import and production testing.
