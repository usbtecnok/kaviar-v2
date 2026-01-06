# Testes de Validação de Geofence - Ride Request

## Endpoint: POST /api/governance/ride/request

### Exemplo 1: Pickup DENTRO do polígono (deve funcionar)
```bash
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "PASSENGER_ID_AQUI",
    "origin": "Rua A, 123",
    "destination": "Rua B, 456", 
    "type": "comunidade",
    "price": 15.50,
    "passengerLat": -22.9068,
    "passengerLng": -43.1729
  }'
```
**Resultado esperado**: 201 Created (corrida criada)

### Exemplo 2: Pickup FORA do polígono (deve bloquear)
```bash
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "PASSENGER_ID_AQUI",
    "origin": "Rua Distante, 999",
    "destination": "Rua B, 456",
    "type": "comunidade", 
    "price": 15.50,
    "passengerLat": -22.8000,
    "passengerLng": -43.0000
  }'
```
**Resultado esperado**: 400 Bad Request
```json
{
  "success": false,
  "error": "Fora da área atendida do bairro Furnas"
}
```

### Exemplo 3: Corrida normal (não valida geofence)
```bash
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "PASSENGER_ID_AQUI",
    "origin": "Qualquer lugar",
    "destination": "Qualquer destino",
    "type": "normal",
    "price": 12.00,
    "passengerLat": -22.8000,
    "passengerLng": -43.0000
  }'
```
**Resultado esperado**: 201 Created (não valida geofence para tipo "normal")

## Notas:
- Substitua `PASSENGER_ID_AQUI` por um ID real de passageiro do banco
- As coordenadas de exemplo são baseadas nos polígonos de teste (Furnas, Agrícola, Mata Machado)
- A validação só ocorre para `type: "comunidade"` e quando `passengerLat/passengerLng` são fornecidos
