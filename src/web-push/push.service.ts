// push.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  NOTIFICATION_COLLECTION,
  NotificationSchema,
  NotificationStatus,
} from './notification.schema';
import * as admin from 'firebase-admin';
import { Collection, Db } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import { NotificationDto } from './notification.dto';

@Injectable()
export class NotificationService {
  private logger = new Logger(NotificationService.name);
  private notificationCollection: Collection<NotificationSchema>;

  constructor(
    @Inject(MONGODB) private db: Db,
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: admin.app.App,
  ) {
    this.notificationCollection = this.db.collection<NotificationSchema>(
      NOTIFICATION_COLLECTION,
    );
  }

  async sendNotification(body: NotificationDto, userId: string) {
    try {
      // try {
      //   await this.firebaseAdmin.messaging().send({
      //     token: body.userToken,
      //     notification: {
      //       title: 'Test',
      //       body: 'Hello World',
      //     },
      //   });
      // } catch (error) {
      //   console.log('Error', error);
      // }

      // Prepare the notification payload for our database

      // Send notification via Firebase Cloud Messaging
      await this.firebaseAdmin.messaging().send({
        token: body.userToken,
        notification: {
          title: body.title,
          body: body.body,
        },
        android: {
          notification: {
            icon: body.icon || 'default_icon',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        data: body.data || {},
      });

      const payloadWithNotificationDetails: NotificationSchema = {
        userId: userId,
        title: body.title,
        body: body.body,
        icon: body.icon,
        userToken: body.userToken,
        status: NotificationStatus.Initiated,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        subscribeStatus: body.subscribeStatus ?? true,
      };

      // If there's additional data, include it
      if (body.data) {
        payloadWithNotificationDetails.data = body.data;
      }
      // Save notification to DB
      const notification = await this.notificationCollection.insertOne(
        payloadWithNotificationDetails,
      );
      this.logger.log(
        `Notification sent and saved with ID: ${notification.insertedId}`,
      );

      return {
        success: true,
        notificationId: notification.insertedId,
      };
    } catch (err) {
      this.logger.error('Error sending notification', err.message);
      return {
        success: false,
        error: err.message || 'Failed to send notification',
      };
    }
  }

  async getNotifications(userId: string) {
    return this.notificationCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async markAsRead(notificationId: string) {
    try {
      const { value } = await this.notificationCollection.findOneAndUpdate(
        { _id: new (require('mongodb').ObjectId)(notificationId) },
        { $set: { read: true, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      return { success: true, notification: value };
    } catch (err) {
      this.logger.error(
        `Error marking notification ${notificationId} as read`,
        err,
      );
      return { success: false, error: err.message };
    }
  }

  async updateSubscriptionStatus(userId: string, subscribeStatus: boolean) {
    try {
      const result = await this.notificationCollection.updateMany(
        { userId },
        { $set: { subscribeStatus, updatedAt: new Date() } },
      );

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (err) {
      this.logger.error(
        `Error updating subscription status for user ${userId}`,
        err,
      );
      return { success: false, error: err.message };
    }
  }
}
