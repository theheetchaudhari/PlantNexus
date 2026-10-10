CREATE TABLE public.telemetry (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "timestamp" TIMESTAMPTZ NOT NULL,
    machine_id TEXT NOT NULL,
    energy_kw DOUBLE PRECISION NOT NULL,
    production_rate DOUBLE PRECISION NOT NULL,
    waste_kg DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telemetry_machine_timestamp
    ON public.telemetry (machine_id, "timestamp" DESC);

ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
