export enum WebhookRequestType {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export enum SyncStatus {
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONTINUOUS_SYNCING = 'continuousSyncing',
}
