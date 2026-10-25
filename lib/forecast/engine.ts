import type { Forecast, ScenarioId } from './types'

/**
 * Integration seam for the Captidict forecast engine.
 *
 * No forecast engine exists in this repository yet. Until one is wired in here, this returns
 * `null` so the UI shows an explicit empty state rather than invented numbers.
 * When connecting the engine, map its output to the `Forecast` shape and flip `ENGINE_CONNECTED`.
 */
export const ENGINE_CONNECTED = false

export async function fetchEngineForecast(_scenario: ScenarioId): Promise<Forecast | null> {
  return null
}
