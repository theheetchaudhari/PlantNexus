-- Migration: 20261009194500_create_intelligence_tables.sql
-- Description: Create tables for PlantNexus intelligence pipeline analysis records and recovery verifications.

-- Table for machine condition analysis and diagnostic records
CREATE TABLE IF NOT EXISTS public.intelligence_analysis (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    telemetry_id BIGINT REFERENCES public.telemetry(id) ON DELETE SET NULL,
    machine_id TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('HEALTHY', 'DEGRADED', 'CRITICAL')),
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    summary TEXT NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_analysis_machine_created
    ON public.intelligence_analysis (machine_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intelligence_analysis_condition
    ON public.intelligence_analysis (condition);

ALTER TABLE public.intelligence_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all operations on intelligence_analysis"
    ON public.intelligence_analysis
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon read access on intelligence_analysis"
    ON public.intelligence_analysis
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Table for recovery verification audits
CREATE TABLE IF NOT EXISTS public.recovery_verifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    machine_id TEXT NOT NULL,
    verdict TEXT NOT NULL CHECK (verdict IN ('IMPROVED', 'PARTIALLY_IMPROVED', 'NO_IMPROVEMENT', 'DEGRADED')),
    summary TEXT NOT NULL,
    improvement_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    metrics_comparison JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_verifications_machine_created
    ON public.recovery_verifications (machine_id, created_at DESC);

ALTER TABLE public.recovery_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all operations on recovery_verifications"
    ON public.recovery_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon read access on recovery_verifications"
    ON public.recovery_verifications
    FOR SELECT
    TO anon, authenticated
    USING (true);
