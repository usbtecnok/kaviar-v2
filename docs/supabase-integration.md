# Supabase Integration - Kaviar WhatsApp

## 🗄️ Database Schema (Supabase)

### Tabelas Necessárias:

```sql
-- Mensagens WhatsApp
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid TEXT UNIQUE NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT,
  user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'unknown')),
  trip_id UUID REFERENCES trips(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Conversas ativas
CREATE TABLE active_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id),
  passenger_phone TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔌 Configuração Backend

```javascript
// package.json - adicionar
"@supabase/supabase-js": "^2.38.0"

// .env - adicionar
SUPABASE_URL=https://xcxxcexdsbaxgmmnxkgc.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## 📡 Real-time com Supabase

Vantagem: Supabase já tem WebSocket built-in!
- Frontend se conecta direto no Supabase
- Backend salva no Supabase  
- Frontend recebe updates automáticos
