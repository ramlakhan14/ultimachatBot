import { ObjectId } from 'mongodb';

export const NOTIFICATION_COLLECTION = 'notifications';

export interface NotificationSchema {
  _id?: ObjectId;
  userId: string;
  title: string;
  body: string;
  icon?: string;
  userToken?: string;
  status: NotificationStatus;
  read: boolean;
  data?: Record<string, any>; // Optional payload data
  createdAt: Date;
  updatedAt?: Date;
  subscribeStatus: boolean; // Flag to check if user is subscribed to notifications
}

export enum NotificationStatus {
  Completed = 'Completed',
  Running = 'Running',
  Initiated = 'Initiated',
  Pending = 'Pending',
  Failed = 'Failed',
  Scheduled = 'Scheduled',
  Paused = 'Paused',
}

// For Mongoose Document typing (if needed)
export type NotificationDocument = NotificationSchema & Document;

// Schema for Mongoose (if needed)
// export const NotificationMongooseSchema = new Schema<Notification>({
//   userId: { type: String, required: true, index: true },
//   title: { type: String, required: true },
//   body: { type: String, required: true },
//   icon: String,
//   image: String,
//   userToken: String,
//   status: {
//     type: String,
//     enum: Object.values(NotificationStatus),
//     default: NotificationStatus.Pending
//   },
//   read: { type: Boolean, default: false },
//   data: { type: Schema.Types.Mixed },
//   subscribeStatus: { type: Boolean, default: true },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: Date
// });
