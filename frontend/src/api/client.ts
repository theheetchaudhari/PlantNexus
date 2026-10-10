import type { TelemetryRecord, AnalyticsResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchHealth(signal?: AbortSignal): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE}/health`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchTelemetry(machineId?: string, limit: number = 100, signal?: AbortSignal): Promise<TelemetryRecord[]> {
  let url = `${API_BASE}/telemetry?limit=${limit}`;
  if (machineId) {
    url += `&machineId=${encodeURIComponent(machineId)}`;
  }
  
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errText}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch telemetry');
  }

  // Map backend snake_case to frontend camelCase
  return result.data.map((item: any) => ({
    id: String(item.id),
    timestamp: item.timestamp,
    machineId: item.machine_id,
    energyKw: item.energy_kw,
    productionRate: item.production_rate,
    wasteKg: item.waste_kg,
    temperature: item.temperature,
  }));
}

export async function fetchAnalytics(machineId?: string, limit: number = 1000, signal?: AbortSignal): Promise<AnalyticsResponse> {
  let url = `${API_BASE}/telemetry/analytics?limit=${limit}`;
  if (machineId) {
    url += `&machineId=${encodeURIComponent(machineId)}`;
  }
  
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errText}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch analytics');
  }

  return result.data;
}
