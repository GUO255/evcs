import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import {
  createInitialOperationsData,
  createUtcTimestamp,
  generateWorkOrderCode,
  type AcceptanceInput,
  type CompletionInput,
  type DeviceAlert,
  type DispatchInput,
  type RepairArchive,
  type WorkOrder,
} from './device-operations-data'

interface DeviceOperationsStore {
  alerts: readonly DeviceAlert[]
  workOrders: readonly WorkOrder[]
  archives: readonly RepairArchive[]
  dispatchAlert: (alertId: string, input: DispatchInput) => void
  completeWorkOrder: (workOrderId: string, input: CompletionInput) => void
  acceptWorkOrder: (workOrderId: string, input: AcceptanceInput) => void
}

const DeviceOperationsContext = createContext<DeviceOperationsStore | null>(null)

export function DeviceOperationsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(createInitialOperationsData)

  const dispatchAlert = useCallback((alertId: string, input: DispatchInput) => {
    const workOrderId = crypto.randomUUID()
    const dispatchedAt = createUtcTimestamp()
    setData((currentData) => {
      const alert = currentData.alerts.find((item) => item.id === alertId)
      if (!alert || alert.status !== 'pending') return currentData
      const workOrder: WorkOrder = {
        id: workOrderId,
        code: generateWorkOrderCode(currentData.workOrders),
        alertId: alert.id,
        alertTitle: alert.title,
        stationName: alert.stationName,
        deviceCode: alert.deviceCode,
        assignee: input.assignee,
        deadline: input.deadline,
        requirement: input.requirement,
        status: 'processing',
        dispatchedAt,
      }
      return {
        ...currentData,
        alerts: currentData.alerts.map((item) => item.id === alertId ? { ...item, status: 'dispatched' } : item),
        workOrders: [workOrder, ...currentData.workOrders],
      }
    })
  }, [])

  const completeWorkOrder = useCallback((workOrderId: string, input: CompletionInput) => {
    const completedAt = createUtcTimestamp()
    setData((currentData) => ({
      ...currentData,
      workOrders: currentData.workOrders.map((order) => (
        order.id === workOrderId && order.status === 'processing'
          ? { ...order, ...input, completedAt, status: 'pending-acceptance' }
          : order
      )),
    }))
  }, [])

  const acceptWorkOrder = useCallback((workOrderId: string, input: AcceptanceInput) => {
    const archiveId = crypto.randomUUID()
    const acceptedAt = createUtcTimestamp()
    setData((currentData) => {
      const order = currentData.workOrders.find((item) => item.id === workOrderId)
      if (!order || order.status !== 'pending-acceptance') return currentData
      if (input.result === 'rework') {
        return {
          ...currentData,
          workOrders: currentData.workOrders.map((item) => item.id === workOrderId ? { ...item, status: 'processing' } : item),
        }
      }

      const archive: RepairArchive = {
        id: archiveId,
        workOrderCode: order.code,
        stationName: order.stationName,
        deviceCode: order.deviceCode,
        fault: order.alertTitle,
        repairer: order.assignee,
        resolution: order.resolution ?? '',
        replacedParts: order.replacedParts || '无',
        cost: order.cost ?? 0,
        acceptedAt,
        acceptedBy: input.acceptedBy,
        acceptanceRemark: input.remark,
      }
      return {
        alerts: currentData.alerts.map((alert) => alert.id === order.alertId ? { ...alert, status: 'resolved' } : alert),
        workOrders: currentData.workOrders.map((item) => item.id === workOrderId ? { ...item, status: 'accepted' } : item),
        archives: [archive, ...currentData.archives],
      }
    })
  }, [])

  const value = useMemo<DeviceOperationsStore>(() => ({
    alerts: data.alerts,
    workOrders: data.workOrders,
    archives: data.archives,
    dispatchAlert,
    completeWorkOrder,
    acceptWorkOrder,
  }), [acceptWorkOrder, completeWorkOrder, data, dispatchAlert])

  return <DeviceOperationsContext value={value}>{children}</DeviceOperationsContext>
}

export function useDeviceOperations(): DeviceOperationsStore {
  const store = useContext(DeviceOperationsContext)
  if (!store) throw new Error('useDeviceOperations must be used within DeviceOperationsProvider')
  return store
}
