# Bridge API Integration

Este proyecto incluye integración con la API de Bridge.xyz para mostrar tasas de cambio EUR/USD en tiempo real.

## Configuración

### 1. Obtener API Key

1. Regístrate en [Bridge Dashboard](https://dashboard.bridge.xyz/)
2. Crea una aplicación y obtén tu API key
3. Para desarrollo, usa la Sandbox API key
4. Para producción, usa la Production API key

### 2. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Bridge API Configuration
BRIDGE_API_KEY=your-bridge-production-api-key
BRIDGE_SANDBOX_API_KEY=your-bridge-sandbox-api-key
```

### 3. Endpoint

El endpoint `/api/exchange-rates/bridge` está disponible para obtener las tasas EUR/USD:

```bash
GET /api/exchange-rates/bridge
```

Respuesta:
```json
{
  "success": true,
  "rates": {
    "eur_usd": {
      "buy": "0.9389",
      "sell": "0.9296",
      "mid": "0.93425",
      "lastUpdate": "2024-01-08T20:39:28.692Z"
    }
  },
  "cached": false
}
```

## Funcionalidades

### Cache Inteligente
- Las tasas se actualizan cada 30 segundos (como recomienda Bridge)
- Cache en memoria durante 30 segundos para evitar llamadas excesivas
- Fallback a datos antiguos si la API falla

### Footer en Dashboard
- Muestra Buy Rate, Sell Rate y Mid Rate
- Actualización automática cada 30 segundos
- Indicador visual cuando los datos están en caché

## Testing

Para probar la integración:

```bash
npm run test-bridge
```

## Notas Técnicas

- La API de Bridge se actualiza cada 30 segundos
- Soporta EUR/USD, USD/MXN, USD/BRL, entre otros
- Rates incluyen fees de Bridge
- Buy rate: tasa para comprar la moneda destino
- Sell rate: tasa para vender la moneda destino
- Mid rate: tasa media del mercado

## Troubleshooting

### Error: "Bridge API key not configured"
- Verifica que las variables de entorno estén configuradas correctamente

### Error: "Bridge API error"
- Verifica que la API key sea válida
- Revisa los límites de rate de la API

### Datos no se actualizan
- Verifica la conexión a internet
- Revisa la consola del navegador por errores
- Los datos se mantienen en caché durante 5 minutos si la API falla