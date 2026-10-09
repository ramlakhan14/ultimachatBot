export enum FallbackMechanism {
  FALLBACK_MECHANISM_1 = "Don't answer but add mail in a specific map/folder",
  FALLBACK_MECHANISM_2 = 'Answer but reply that someone will reach out',
  FALLBACK_MECHANISM_3 = 'Forward mail to specific mail Id',
  // FALLBACK_MECHANISM_4 = 'Create a potential answer and save this concept in a chosen folder or map in the mailbox', removed this options
}

export enum NotificationType {
  MANUAL_APPROVAL = 'manual_approval',
  FOLLOW_UP = 'follow_up',
}
