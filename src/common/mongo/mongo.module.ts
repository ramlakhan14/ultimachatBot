import { Module, Logger } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';
import { AppConfigService } from '../config/appConfig.service';

export const MONGODB = 'MONGODB';

@Module({
  providers: [
    {
      provide: MONGODB,
      inject: [AppConfigService],
      useFactory: async (appConfig: AppConfigService): Promise<Db> => {
        const logger = new Logger('MongoModule');
        const mongoUri = appConfig.get('mongoUri');
        const dbName = appConfig.get('mongoDbName');

        try {
          logger.log(`Attempting to connect to MongoDB at ${mongoUri}`);
          const client = new MongoClient(mongoUri);
          await client.connect();
          logger.log('Successfully connected to MongoDB');

          const db = client.db(dbName);
          logger.log(`Connected to database: ${dbName}`);

          /**
          //  * ===================================================READ THIS BEFORE ADDING ANY INDEX============================================================
           * MongoDB Index Operations Configuration
           * @developer : Ankur
           *
           * This array defines all the indexes that need to be created across collections.
           * Each object in the array represents a collection and its indexes.
           *
           * Structure for each index operation:
           * {
           *   collection: string, // Name of the collection
           *   indexes: [
           *     {
           *       key: object,     // Index key specification (e.g., { field: 1 } for ascending)
           *       name: string,    // Unique name for the index
           *       unique?: boolean, // Optional: true if index should be unique
           *       sparse?: boolean, // Optional: true if index should be sparse
           *       partialFilterExpression?: object // Optional: filter for partial indexes
           *     }
           *   ]
           * }
           *
           * Common Index Types:
           * 1. Single field index: { key: { fieldName: 1 } }
           * 2. Compound index: { key: { field1: 1, field2: -1 } }
           * 3. Unique index: Add unique: true
           * 4. Sparse index: Add sparse: true
           *
           * To add a new index:
           * 1. Find the appropriate collection object or create a new one
           * 2. Add a new index object to the indexes array
           * 3. Specify the key fields and sort order (1 for ascending, -1 for descending)
           * 4. Provide a unique, descriptive name for the index
           * 5. Add any additional options (unique, sparse, partialFilterExpression)
           *
           * Example:
           * {
           *   collection: 'myCollection',
           *   indexes: [
           *     {
           *       key: { email: 1, userId: 1 },
           *       name: 'email_user_compound_idx',
           *       unique: true
           *     }
           *   ]
           * }
           * 
          //  *  ===============================================================================================================
          */

          // Define all indexes in a single array
          const indexOperations = [
            {
              collection: 'users',
              indexes: [{ key: { email: 1 }, unique: true, name: 'email_1' }],
            },
            {
              collection: 'kbDataStore',
              indexes: [
                {
                  key: { knowledgebaseId: 1, type: 1 },
                  name: 'knowledgebaseId_1_type_1',
                },
              ],
            },
            {
              collection: 'chunks',
              indexes: [
                {
                  key: { knowledgebaseId: 1 },
                  name: 'kb_chunks_idx',
                },
                { key: { dataStoreId: 1 }, name: 'chunks_ds_idx' },
              ],
            },
            {
              collection: 'kbEmbeddings',
              indexes: [
                {
                  key: { knowledgebaseId: 1 },
                  name: 'kb_embeddings_idx',
                },
              ],
            },
            {
              collection: 'knowledgebase',
              indexes: [
                { key: { owner: 1 }, sparse: true, name: 'kb_owner_idx' },
                {
                  key: { customDomain: 1 },
                  sparse: true,
                  unique: true,
                  partialFilterExpression: {
                    customDomain: { $type: 'string' },
                  },
                  name: 'custom_domain_unique',
                },
              ],
            },
            {
              collection: 'offlineMessages',
              indexes: [
                {
                  key: { knowledgebaseId: 1 },
                  name: 'kb_offline_idx',
                },
              ],
            },
            {
              collection: 'chatSessions',
              indexes: [{ key: { knowledgebaseId: 1 }, name: 'kb_chat_idx' }],
            },
            {
              collection: 'task',
              indexes: [{ key: { name: 1 }, name: 'task_name_idx' }],
            },
            {
              collection: 'scrap',
              indexes: [
                { key: { email: 1 }, name: 'scrap_email_idx' },
                { key: { websiteUrl: 1 }, name: 'scrap_url_idx' },
              ],
            },
            {
              collection: 'leads',
              indexes: [
                {
                  key: { knowledgebaseId: 1 },
                  name: 'kb_leads_idx',
                },
                { key: { chatSessionId: 1 }, name: 'leads_session_idx' },
              ],
            },
            {
              collection: 'campaign',
              indexes: [
                { key: { userId: 1 }, name: 'campaign_user_idx' },
                { key: { campaignName: 1 }, name: 'campaign_name_idx' },
                { key: { status: 1 }, name: 'campaign_status_idx' },
                { key: { createdAt: -1 }, name: 'campaign_created_idx' },
                {
                  key: { campaignTrigger: 1, status: 1 },
                  name: 'campaign_trigger_status_idx',
                },
              ],
            },
            {
              collection: 'campaignAudience',
              indexes: [
                { key: { campaignId: 1 }, name: 'audience_campaign_idx' },
                { key: { email: 1 }, name: 'audience_email_idx' },
                { key: { userId: 1 }, name: 'audience_user_idx' },
                { key: { emailStatus: 1 }, name: 'audience_email_status_idx' },
                {
                  key: { processStatus: 1 },
                  name: 'audience_process_status_idx',
                },
                // {
                //   key: { campaignId: 1, email: 1, phone: 1 },
                //   unique: true,
                //   name: 'audience_campaign_email_unique',
                // },
              ],
            },
            {
              collection: 'campaignEmailConversation',
              indexes: [
                { key: { campaignId: 1 }, name: 'conv_campaign_idx' },
                { key: { userId: 1 }, name: 'conv_user_idx' },
                {
                  key: { audienceEmailId: 1 },
                  name: 'conv_audience_email_idx',
                },
                { key: { createdAt: -1 }, name: 'conv_created_idx' },
                {
                  key: { campaignId: 1, audienceEmailId: 1 },
                  name: 'conv_campaign_audience_idx',
                },
              ],
            },
            {
              collection: 'commonFolder',
              indexes: [
                { key: { folderName: 1 }, name: 'common_folder_name_idx' },
                {
                  key: { folderType: 1 },
                  name: 'common_folder_type_idx',
                },
                { key: { createdAt: -1 }, name: 'common_folder_created_idx' },
              ],
            },
            {
              collection: 'folder',
              indexes: [
                { key: { userId: 1 }, name: 'folder_user_idx' },
                { key: { folderName: 1 }, name: 'folder_name_idx' },
                { key: { folderType: 1 }, name: 'folder_type_idx' },
                { key: { commonFolderId: 1 }, name: 'folder_common_idx' },
                {
                  key: { emailAccountId: 1 },
                  name: 'folder_email_account_idx',
                },
                { key: { category: 1 }, name: 'folder_category_idx' },
                {
                  key: { userId: 1, folderName: 1 },
                  unique: true,
                  name: 'folder_user_name_unique',
                },
              ],
            },
            {
              collection: 'EmailAssistanceNotification',
              indexes: [
                { key: { userId: 1 }, name: 'notification_user_idx' },
                {
                  key: { audienceEmailId: 1 },
                  name: 'notification_audience_idx',
                },
                { key: { notificationType: 1 }, name: 'notification_type_idx' },
                { key: { isSeen: 1 }, name: 'notification_seen_idx' },
                { key: { createdAt: -1 }, name: 'notification_created_idx' },
                {
                  key: { userId: 1, audienceEmailId: 1, notificationType: 1 },
                  name: 'notification_composite_idx',
                },
              ],
            },
            {
              collection: 'emailAssistanceSetting',
              indexes: [
                { key: { userId: 1 }, name: 'setting_user_idx', unique: true },
                {
                  key: { 'autoReply.isAutoReply': 1 },
                  name: 'setting_auto_reply_idx',
                },
                {
                  key: { 'emailSetting.emailHost': 1 },
                  name: 'setting_email_host_idx',
                },
                { key: { createdAt: -1 }, name: 'setting_created_idx' },
              ],
            },
            {
              collection: 'campaignArchive',
              indexes: [
                { key: { campaignId: 1 }, name: 'archive_campaign_idx' },
                { key: { senderEmail: 1 }, name: 'archive_sender_idx' },
                { key: { receiverEmail: 1 }, name: 'archive_receiver_idx' },
                { key: { addedBy: 1 }, name: 'archive_user_idx' },
              ],
            },
            {
              collection: 'campaignDraft',
              indexes: [
                { key: { campaignId: 1 }, name: 'draft_campaign_idx' },
                { key: { senderEmail: 1 }, name: 'draft_sender_idx' },
                { key: { receiverEmail: 1 }, name: 'draft_receiver_idx' },
              ],
            },
            {
              collection: 'campaignDuplicateAudience',
              indexes: [
                {
                  key: { email: 1, campaignId: 1 },
                  unique: true,
                  name: 'duplicate_audience_unique',
                },
                { key: { duplicateLeadId: 1 }, name: 'duplicate_lead_idx' },
              ],
            },
            {
              collection: 'campaignDuplicateLead',
              indexes: [
                {
                  key: { currentCampaignId: 1 },
                  name: 'duplicate_current_campaign_idx',
                },
                { key: { status: 1 }, name: 'duplicate_status_idx' },
              ],
            },
            {
              collection: 'campaignEmailLead',
              indexes: [
                { key: { campaignId: 1 }, name: 'lead_campaign_idx' },
                { key: { email: 1 }, name: 'lead_email_idx' },
              ],
            },
            {
              collection: 'campaignEmailPasskey',
              indexes: [
                { key: { userId: 1 }, name: 'passkey_user_idx' },
                { key: { email: 1 }, name: 'passkey_email_idx' },
                { key: { status: 1 }, name: 'passkey_status_idx' },
              ],
            },
            {
              collection: 'campaignEmailServerConfig',
              indexes: [
                {
                  key: { userId: 1 },
                  unique: true,
                  name: 'server_config_user_unique',
                },
                { key: { status: 1 }, name: 'server_config_status_idx' },
              ],
            },
            {
              collection: 'campaignEmailWarmupCount',
              indexes: [
                {
                  key: { userId: 1, email: 1 },
                  unique: true,
                  name: 'warmup_user_email_unique',
                },
                { key: { status: 1 }, name: 'warmup_status_idx' },
              ],
            },
            {
              collection: 'campaignFollowUpEmails',
              indexes: [
                { key: { campaignId: 1 }, name: 'followup_campaign_idx' },
                { key: { senderEmail: 1 }, name: 'followup_sender_idx' },
                { key: { receiverEmail: 1 }, name: 'followup_receiver_idx' },
              ],
            },
            {
              collection: 'campaignFollowUpsSchedule',
              indexes: [
                { key: { campaignId: 1 }, name: 'schedule_campaign_idx' },
                { key: { scheduleDate: 1 }, name: 'schedule_date_idx' },
                { key: { status: 1 }, name: 'schedule_status_idx' },
              ],
            },
            {
              collection: 'campaignPromptAndGeneratedEmail',
              indexes: [
                { key: { campaignId: 1 }, name: 'prompt_campaign_idx' },
                { key: { createdAt: -1 }, name: 'prompt_created_idx' },
              ],
            },
            {
              collection: 'campaignScheduled',
              indexes: [
                { key: { campaignId: 1 }, name: 'scheduled_campaign_idx' },
                {
                  key: { scheduledDateAndTime: 1 },
                  name: 'scheduled_datetime_idx',
                },
                { key: { status: 1 }, name: 'scheduled_status_idx' },
              ],
            },
            {
              collection: 'campaignUserEmailToken',
              indexes: [
                { key: { email: 1 }, name: 'token_email_idx' },
                { key: { tokenExpiryDate: 1 }, name: 'token_expiry_idx' },
              ],
            },
            {
              collection: 'gmbBusinessDirectory',
              indexes: [
                {
                  key: { email: 1 },
                  unique: true,
                  name: 'gmb_directory_email_unique',
                },
                {
                  key: { categoryKeys: 1, cityKey: 1, countryKey: 1 },
                  name: 'gmb_directory_category_city_country_idx',
                },
                {
                  key: { lastVerifiedAt: 1 },
                  name: 'gmb_directory_last_verified_idx',
                },
              ],
            },
          ];

          // Create collections and indexes
          for (const { collection, indexes } of indexOperations) {
            logger.debug(
              `Processing collection and indexes for: ${collection}`,
            );

            // Create collection if it doesn't exist
            try {
              await db.createCollection(collection);
              logger.debug(`Created collection: ${collection}`);
            } catch (err) {
              if (err.code !== 48) {
                // Skip if collection already exists
                throw err;
              }
            }

            // Create indexes with waitForIndexBuild option
            const existingIndexes = await db
              .collection(collection)
              .listIndexes()
              .toArray();

            for (const index of indexes) {
              const existingIndex = existingIndexes.find(
                (idx) =>
                  JSON.stringify(idx.key) === JSON.stringify(index.key) ||
                  idx.name === index.name,
              );

              if (!existingIndex) {
                logger.debug(
                  `Creating new index ${index.name} for collection ${collection}`,
                );
                await db.collection(collection).createIndex(index.key, {
                  name: index.name,
                  unique: 'unique' in index ? index.unique : false,
                  background: false, // Set to false to ensure index builds completely
                  ...('partialFilterExpression' in index
                    ? { partialFilterExpression: index.partialFilterExpression }
                    : {}),
                });
                logger.debug(`Index ${index.name} created successfully`);
              } else if (existingIndex.name !== index.name) {
                logger.debug(
                  `Recreating index ${index.name} for collection ${collection}`,
                );
                await db.collection(collection).dropIndex(existingIndex.name);
                await db.collection(collection).createIndex(index.key, {
                  name: index.name,
                  unique: 'unique' in index ? index.unique : false,
                  background: false, // Set to false to ensure index builds completely
                  ...('partialFilterExpression' in index
                    ? { partialFilterExpression: index.partialFilterExpression }
                    : {}),
                });
                logger.debug(`Index ${index.name} recreated successfully`);
              }
            }
          }

          return db;
        } catch (e) {
          logger.error('Failed to connect to MongoDB', e.stack);
          throw e;
        }
      },
    },
  ],
  exports: [MONGODB],
})
export class MongoModule {}
