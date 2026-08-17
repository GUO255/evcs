import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { chargingStations, type ChargingStation } from './station-data'

export type CreateStationInput = Omit<
  ChargingStation,
  'id' | 'devices' | 'facilities' | 'staff' | 'merchantBindings' | 'cameras'
>

interface StationStore {
  stations: readonly ChargingStation[]
  getStation: (stationId: string) => ChargingStation | undefined
  createStation: (input: CreateStationInput) => void
}

const StationContext = createContext<StationStore | null>(null)

export function StationProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<readonly ChargingStation[]>(() => [...chargingStations])

  const getStation = useCallback(
    (stationId: string) => stations.find((station) => station.id === stationId),
    [stations],
  )

  const createStation = useCallback((input: CreateStationInput) => {
    const station: ChargingStation = {
      ...input,
      id: crypto.randomUUID(),
      devices: [],
      facilities: [],
      staff: [],
      merchantBindings: [],
      cameras: [],
    }
    setStations((current) => [station, ...current])
  }, [])

  const value = useMemo<StationStore>(() => ({
    stations,
    getStation,
    createStation,
  }), [createStation, getStation, stations])

  return <StationContext value={value}>{children}</StationContext>
}

export function useStations(): StationStore {
  const store = useContext(StationContext)
  if (!store) throw new Error('useStations must be used within StationProvider')
  return store
}
