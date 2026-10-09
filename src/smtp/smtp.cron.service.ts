// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { PostWarmupOption } from './dto/warmup.setting.dto';

// @Injectable()
// export class CronService {
//   private readonly logger = new Logger(CronService.name);
//   constructor(private voicebotService: VoicebotService) {}

//   @Cron(CronExpression.EVERY_DAY_AT_1AM)
//   async changeStatusOfGoogleMeeting() {
//     this.logger.log('Changing status of Google Meeting...');
//     await this.changeGoogleMeetingStatusOfAll();
//     this.logger.log('Changed status of Google Meeting...');
//   }

// async progressWarmupEmails() {
//   try {
//     Logger.log('Running daily warmup progression job');

//     const inProgress = await this.campaignWarmupCollection
//       .find({ status: WarmupStatus.IN_PROGRESS, isWarmUpEnabled: true })
//       .toArray();

//     Logger.log(`Found ${inProgress.length} emails in warmup`);

//     for (const warmup of inProgress) {
//       const nextDay = (warmup.currentDay ?? 1) + 1;
//       const nextVolume = Math.min(
//         (warmup.currentDailyLimit ?? warmup.startVolume) + warmup.rampUpIncrement,
//         warmup.maxVolume,
//       );
//       const isComplete = nextDay > warmup.durationDays;

//       if (isComplete) {
//         await this.completeWarmup(warmup);
//       } else {
//         // Advance one day
//         await this.campaignWarmupCollection.updateOne(
//           { _id: warmup._id },
//           {
//             $set: {
//               currentDay: nextDay,
//               currentDailyLimit: nextVolume,
//               maxLimit: nextVolume,
//               updatedMaxLimit: nextVolume,
//               updatedAt: new Date(),
//             },
//           },
//         );
//         Logger.log(
//           `[${warmup.email}] Warmup day ${nextDay}/${warmup.durationDays} — limit: ${nextVolume}/day`,
//         );
//       }
//     }
//   } catch (error) {
//     Logger.error(`Warmup progression job failed: ${error.message}`);
//   }
// }

//  async completeWarmup(warmup: any): Promise<void> {
//   Logger.log(`Warmup complete for: ${warmup.email}`);

//   // Option 1: Auto-rampup — the live daily limit starts where warmup left off
//   // and continues to grow by rampUpIncrement each day during live campaigns.
//   const postWarmupStartingLimit =
//     warmup.postWarmupOption === PostWarmupOption.AUTO_RAMPUP
//       ? warmup.maxVolume   // start live sends at the warmup ceiling
//       : null;              // Option 2: user will set manually — don't pre-fill

//   // Mark warmup collection complete
//   await this.campaignWarmupCollection.updateOne(
//     { _id: warmup._id },
//     {
//       $set: {
//         status: WarmupStatus.COMPLETED,
//         warmupCompletedAt: new Date(),
//         currentDay: warmup.durationDays,
//         // For Option 1: store the starting live limit so campaign sender can read it
//         ...(postWarmupStartingLimit !== null && {
//           postWarmupDailyLimit: postWarmupStartingLimit,
//           postWarmupRampUpIncrement: warmup.rampUpIncrement, // keep growing
//         }),
//         updatedAt: new Date(),
//       },
//     },
//   );

//   // Mark SMTP as active — email is now usable for campaigns
//   await this.smtpSettingsCollection.updateOne(
//     { userId: warmup.userId, email: warmup.email },
//     {
//       $set: {
//         isActive: true,
//         warmupStatus: WarmupStatus.COMPLETED,
//         warmupCompletedAt: new Date(),
//         // Option 1: seed the starting live limit on the SMTP doc too
//         ...(postWarmupStartingLimit !== null && {
//           postWarmupDailyLimit: postWarmupStartingLimit,
//           postWarmupRampUpIncrement: warmup.rampUpIncrement,
//         }),
//         updatedAt: new Date(),
//       },
//     },
//   );

//   // Add to warmup count tracking (same as non-warmup flow does at creation)
//   await this.addWarmupCount(warmup.userId);

//   // Notify user (fire-and-forget)
//   this.notifyWarmupComplete(warmup.userId, warmup.email, warmup.postWarmupOption).catch(
//     (err) => Logger.error(`Notify failed for ${warmup.email}: ${err.message}`),
//   );
// }

// private async notifyWarmupComplete(
//   userId: string,
//   email: string,
//   postWarmupOption: PostWarmupOption,
// ): Promise<void> {
//   // Wire up to your notification/email service
//   const message =
//     postWarmupOption === PostWarmupOption.AUTO_RAMPUP
//       ? `Warmup complete for ${email}. Live campaign sending has started automatically — your daily limit will continue to grow gradually.`
//       : `Warmup complete for ${email}. Please set your live campaign sending limit to start using this email.`;

//   Logger.log(`[Notify] userId=${userId} | ${message}`);
//   // e.g. await this.notificationService.send(userId, message);
// }
// }

// // Day 1  warmup starts  → sends 10 warmup emails/day  (SAFE preset)
// // Day 14 warmup ends    → isActive = true, postWarmupDailyLimit = 40
// // Day 15 first campaign → campaign sender reads postWarmupDailyLimit (40) + rampUpIncrement (5)
// // Day 16                → limit = 45, Day 17 = 50 ... naturally mimics warmup growth
// // User can edit/pause ramp-up at any time via a separate update endpoint