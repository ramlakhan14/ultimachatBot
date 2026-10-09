import { NotificationType } from '../constant/emailAssitance.contant';

export const NOTIFICATION_COLLECTION = 'EmailAssistanceNotification';

export interface Notification {
  userId: string;
  audienceEmailId: string;
  notificationType: NotificationType;
  notificationData: any;
  isSeen?: boolean;
  seenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
