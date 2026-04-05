-- Referência manual (opcional). O histórico oficial do schema fica em /migrations (npm run db:migrate).
-- Alinhado a src/models/computador.model.js
CREATE TABLE IF NOT EXISTS computadores (
  id SERIAL PRIMARY KEY,
  hostname TEXT NOT NULL,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'em_uso',
  pa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Headsets — ver migrations/1775270661955_headsets.js e src/models/headset.model.js
CREATE TABLE IF NOT EXISTS headsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula TEXT NOT NULL,
  lacre TEXT NOT NULL,
  marca TEXT NOT NULL DEFAULT '',
  numero_serie TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'em_uso',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
