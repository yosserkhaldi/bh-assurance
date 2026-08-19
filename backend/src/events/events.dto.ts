export type RealtimeEventType =
  | 'ESTABLISHMENT_CREATED'
  | 'ESTABLISHMENT_UPDATED'
  | 'ESTABLISHMENT_DELETED'
  | 'CONTRACT_CREATED'
  | 'CONTRACT_UPDATED'
  | 'CONTRACT_DELETED'
  | 'CONTRACT_RENEWED'
  | 'VEHICLE_CREATED'
  | 'VEHICLE_UPDATED'
  | 'VEHICLE_DELETED'
  | 'VEHICLE_IMPORTED';

export type RealtimeEntity = 'establishment' | 'contract' | 'vehicle';

export interface RealtimeEvent {
  type: RealtimeEventType;
  entity: RealtimeEntity;
  id: string;
  establishmentId?: string;
  contractId?: string;
  userId: string;
  timestamp: string;
}
