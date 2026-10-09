import { HttpException, HttpStatus, Inject, Injectable , Logger } from '@nestjs/common';
import {
  USER_ULTIMABOT_WEBHOOK_COLLECTION,
  UserUltimabotWebhook,
} from './schema/userUltmabotWebhookSchema';
import { MONGODB } from '../common/mongo/mongo.module';
import { Db, Collection, ObjectId } from 'mongodb';
import { UserZapierWebhook } from './schema/userZapierWebhook.schema';
import { USER_ZAPIER_WEBHOOK_COLLECTION } from './schema/userZapierWebhook.schema';
import { CreateUserUltimaWebhookDto } from './dto/createUserUltimaWebhook.dto';
import { UpdateUserUltimaWebhookDto } from './dto/updateUserUltimaWebhook.dto';
import { CreateZapierWebhookDto } from './dto/createUserZapierWebhook.dto';
import { UpdateUserZapierWebhookDto } from './dto/updateUserZapierWebhook.dto';
import { SyncStatus, WebhookRequestType } from './common/zapier-webhook.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  IsLeadType,
  KNOWLEDGEBASE_COLLECTION,
  Lead,
  LEADS_COLLECTION,
} from '../knowledgebase/knowledgebase.schema';
import { LeadSyncWithCrmDto } from './dto/leadSyncWithCrm.dto';
// import { InboundBotService } from '../voicebot/inbound-bot/inbound-bot.service';
@Injectable()
export class ZapierWebhookService {
  private readonly logger = new Logger('ZapierWebhookService');

  private userUltimabotWebhookCollection: Collection<UserUltimabotWebhook>;
  private userZapierWebhookCollection: Collection<UserZapierWebhook>;
  private leadCollection: Collection<Lead>;
  constructor(
    @Inject(MONGODB)
    private readonly db: Db,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.userUltimabotWebhookCollection =
      this.db.collection<UserUltimabotWebhook>(
        USER_ULTIMABOT_WEBHOOK_COLLECTION,
      );
    this.userZapierWebhookCollection = this.db.collection<UserZapierWebhook>(
      USER_ZAPIER_WEBHOOK_COLLECTION,
    );
    this.leadCollection = this.db.collection<Lead>(LEADS_COLLECTION);
  }

  /**
   * Creates a new user Ultimabot webhook
   * @developer - Ankur
   * @param userUltimabotWebhook The webhook data to create
   * @param userId The ID of the user
   * @returns The ID of the created webhook
   */
  async createUserUltimabotWebhook(
    userUltimabotWebhook: CreateUserUltimaWebhookDto,
    userId: string,
  ) {
    const result = await this.userUltimabotWebhookCollection.insertOne({
      ...userUltimabotWebhook,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId;
  }

  /**
   * Retrieves all user Ultimabot webhooks for a given user
   * @developer - Ankur
   * @param userId The ID of the user
   * @param page The page number
   * @param limit The number of items per page
   * @param searchString Optional search string
   * @returns Paginated array of user Ultimabot webhooks
   */
  async getUserUltimabotWebhook(
    userId: string,
    page = 1,
    limit = 10,
    searchString?: string,
  ) {
    let query: any = { userId };

    if (searchString && searchString.trim() !== '') {
      query = {
        ...query,
        $or: [
          { crmName: { $regex: searchString, $options: 'i' } },
          { webhookUrl: { $regex: searchString, $options: 'i' } },
        ],
      };
    }

    const skip = (page - 1) * limit;
    const total = await this.userUltimabotWebhookCollection.countDocuments(
      query,
    );

    const result = await this.userUltimabotWebhookCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      statusCode: HttpStatus.OK,
      message: 'webhook fetched successfully',
      data: result,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates a user Ultimabot webhook
   * @developer - Ankur
   * @param userId The ID of the user
   * @param userUltimabotWebhook The webhook data to update
   * @returns The ID of the updated webhook
   */
  async updateUserUltimabotWebhook(
    userId: string,
    webhookId: string,
    userUltimabotWebhook: UpdateUserUltimaWebhookDto,
  ) {
    delete userUltimabotWebhook.webhookId;
    const result = await this.userUltimabotWebhookCollection.updateOne(
      { _id: new ObjectId(webhookId), userId },
      { $set: { ...userUltimabotWebhook, updatedAt: new Date() } },
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'webhook updated successfully',
      data: {
        modifiedCount: result.modifiedCount,
      },
    };
  }

  /**
   * Deletes a user Ultimabot webhook
   * @developer - Ankur
   * @param userId The ID of the user
   */
  async deleteUserUltimabotWebhook(userId: string, data: any) {
    let result;
    if (Array.isArray(data)) {
      const objectIds = data.map((id) => new ObjectId(id));
      result = await this.userUltimabotWebhookCollection.deleteMany({
        userId,
        _id: { $in: objectIds },
      });
    } else {
      result = await this.userUltimabotWebhookCollection.deleteOne({
        userId,
        _id: new ObjectId(data),
      });
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'webhook deleted successfully',
      data: {
        deletedCount: result.deletedCount,
      },
    };
  }

  /**
   * Creates a new user Zapier webhook
   * @developer - Ankur
   * @param userZapierWebhook The webhook data to create
   * @param userId The ID of the user
   * @returns The ID of the created webhook
   */
  async createUserZapierWebhook(
    userZapierWebhook: CreateZapierWebhookDto,
    userId: string,
  ) {
    delete userZapierWebhook.webhookRequestType;
    const getWebhook = await this.userZapierWebhookCollection.findOne({
      userId,
      webhookUrl: userZapierWebhook.webhookUrl,
      crmName: userZapierWebhook.crmName,
    });
    if (getWebhook) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'webhook already exists',
        data: getWebhook,
      };
    }

    let response;
    try {
      response = await fetch(userZapierWebhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Lead Name',
          email: 'leademail@gmail.com',
          phone: '+919876543210',
          address: 'Lead Address If Exist',
          website: 'Lead Website If Exist',
        }),
      });

      if (!response.ok) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Failed to verify webhook URL',
          error: `HTTP error! status: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid webhook URL',
        error: error.message,
      };
    }
    const result = await this.userZapierWebhookCollection.insertOne({
      ...userZapierWebhook,
      webhookRequestType: WebhookRequestType.POST,
      userId,
      webhookType: 'syncNewCrmLead',
      syncStatus: SyncStatus.CONTINUOUS_SYNCING,
      leadType: ['zapierCrm'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return {
      statusCode: HttpStatus.OK,
      message: 'zapier webhook saved successfully',
      webhookUrlStatus: response.ok,
      data: {
        _id: result.insertedId,
        ...userZapierWebhook,
        webhookRequestType: WebhookRequestType.POST,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Retrieves all user Zapier webhooks for a given user with pagination
   * @developer - Ankur
   * @param userId The ID of the user
   * @param searchString Optional search string to filter webhooks
   * @param page The page number for pagination
   * @param limit The number of items per page
   * @returns An array of user Zapier webhooks with pagination metadata
   */
  async getUserZapierWebhook(
    userId: string,
    searchString?: string,
    page = 1,
    limit = 10,
  ) {
    let query: any = { userId, webhookType: { $ne: 'syncAllLeads' } };

    if (searchString && searchString.trim() !== '') {
      query = {
        ...query,
        $or: [
          { crmName: { $regex: searchString, $options: 'i' } },
          { webhookUrl: { $regex: searchString, $options: 'i' } },
        ],
      };
    }

    const skip = (page - 1) * limit;
    const total = await this.userZapierWebhookCollection.countDocuments(query);
    const result = await this.userZapierWebhookCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      statusCode: HttpStatus.OK,
      message: 'zapier webhook fetched successfully',
      data: result,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates a user Zapier webhook
   * @developer - Ankur
   * @param userId The ID of the user
   * @param userZapierWebhook The webhook data to update
   * @returns The ID of the updated webhook
   */
  async updateUserZapierWebhook(
    userId: string,
    zapierWebhookId: string,
    userZapierWebhook: UpdateUserZapierWebhookDto,
  ) {
    delete userZapierWebhook.zapierWebhookId;
    const result = await this.userZapierWebhookCollection.updateOne(
      { userId, _id: new ObjectId(zapierWebhookId) },
      { $set: userZapierWebhook },
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'zapier webhook updated successfully',
      data: {
        modifiedCount: result.modifiedCount,
      },
    };
  }

  /**
   * Deletes a user Zapier webhook
   * @developer - Ankur
   * @param userId The ID of the user
   */
  async deleteUserZapierWebhook(userId: string, data: any) {
    let result;

    if (Array.isArray(data)) {
      // Handle multiple webhook deletion
      const objectIds = data.map((id) => new ObjectId(id));
      result = await this.userZapierWebhookCollection.deleteMany({
        userId,
        _id: { $in: objectIds },
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'zapier webhooks deleted successfully',
        data: {
          deletedCount: result.deletedCount,
        },
      };
    } else {
      // Handle single webhook deletion
      const zapierWebhookId = data.zapierWebhookId;
      result = await this.userZapierWebhookCollection.deleteOne({
        userId,
        _id: new ObjectId(zapierWebhookId),
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'zapier webhook deleted successfully',
        data: {
          deletedCount: result.deletedCount,
        },
      };
    }
  }

  /**
   * Generates a unique webhook URL for a user and saves it to UserUltmabotWebhook schema
   * @developer - Ankur
   * @param userId The ID of the user
   * @param crmName The name of the CRM
   * @param requestType The type of webhook request
   * @returns The generated webhook data
   */
  async generateAndSaveUltimabotWebhook(userId: string, crmName: string) {
    const randomString = Math.random().toString(36).substring(2, 15);
    const webhookUrl = `${process.env.API_BASE_URLFORZAPIER}/hooks/ultimabot/${userId}/${randomString}`;
    const webhookSecret =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const webhookData = {
      userId,
      crmName: crmName.toLowerCase(),
      webhookUrl,
      webhookSecret,
      requestType: WebhookRequestType.POST,
      urlSecret: randomString,
    };

    const existingWebhook = await this.userUltimabotWebhookCollection.findOne({
      userId,
      crmName: crmName.toLowerCase(),
      requestType: WebhookRequestType.POST,
    });

    let result;
    if (existingWebhook) {
      // result = await this.updateUserUltimabotWebhook(userId, webhookData);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'this webhook already exists',
        data: existingWebhook,
      };
    } else {
      result = await this.createUserUltimabotWebhook(webhookData, userId);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'webhook created successfully',
        data: {
          _id: result,
          ...webhookData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }
  }

  /**
   * Processes incoming leads from Ultimabot webhook and syncs them with the CRM
   * @developer - Ankur
   * @param userId The ID of the user
   * @param secret The secret key for webhook verification
   * @param body The lead data to be processed (single lead or array of leads)
   * @returns Response with status and message
   */
  async processUserLeadsUltimabotWebhook(
    userId: string,
    secret: string,
    body: LeadSyncWithCrmDto | LeadSyncWithCrmDto[],
    headers?: any,
  ) {
    const webhookSecret = headers['x-ultimabot-secret'];
    const webhook = await this.userUltimabotWebhookCollection.findOne({
      userId,
      urlSecret: secret,
    });

    if (!webhook) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'this webhook url is not found',
      };
    }

    if (webhookSecret !== webhook.webhookSecret) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'invalid webhook secret',
      };
    }

    const leads = Array.isArray(body) ? body : [body];
    const results = [];

    for (const rawLeadData of leads) {
      // Extract lead data from any format
      const leadData: any = this.extractLeadObject(rawLeadData);

      // ✅ FIX: Use leadData instead of rawLeadData
      if (leadData.knowledgebaseId) {
        leadData.knowledgebaseId = new ObjectId(leadData.knowledgebaseId);
      }

      if (leadData.chatSessionId) {
        leadData.chatSessionId = new ObjectId(leadData.chatSessionId);
      }

      // Check if lead already exists
      const query: any = {
        email: leadData.email, // email always required
      };

      if (leadData.website) {
        query.website = leadData.website;
      }

      if (leadData.phone) {
        query.phone = leadData.phone;
      }

      const lead = await this.leadCollection.findOne(query);

      if (lead) {
        await this.leadCollection.updateOne(
          { _id: lead._id },
          {
            $set: {
              ...leadData,
              updatedAt: new Date(),
              IsLeadType: IsLeadType.zapierCrm,
              isSyncedToCrm: true,
              webhookCrmName: webhook.crmName,
              zapierWebhookId: webhook._id.toHexString(),
              chatMessage: rawLeadData?.message
                ? [...(lead.chatMessage || []), { query: rawLeadData.message }]
                : lead.chatMessage,
            },
          },
        );

        if (
          leadData.IsLeadType &&
          leadData.IsLeadType === IsLeadType.callbackRequest
        ) {
          await this.callToVoiceBot(leadData);
        }

        results.push({
          status: 'updated',
          _id: lead._id,
          ...leadData,
        });
      } else {
        let kb;
        if (leadData?.knowledgebaseId) {
          kb = await this.db
            .collection(KNOWLEDGEBASE_COLLECTION)
            .findOne({ _id: leadData.knowledgebaseId });
        }

        const inserted = await this.leadCollection.insertOne({
          ...leadData,
          webhookCrmName: webhook.crmName,
          knowledgebaseId: leadData.knowledgebaseId ?? null,
          campaignDetails: {
            _id: leadData.knowledgebaseId ?? null,
            campaignName: kb?.name || '',
          },
          chatSessionId: leadData.chatSessionId ?? null,
          emailStatus: true,
          fieldStatus: 0,
          chatbotType: null,
          userId,
          IsLeadType: IsLeadType.zapierCrm,
          isSyncedToCrm: true,
          zapierWebhookId: webhook._id.toHexString(),
          chatMessage: rawLeadData?.message
            ? [{ query: rawLeadData.message }]
            : [],
          standAloneAssistant: leadData.standAloneAssistant ?? null,
          createdAt: leadData.createdAt || new Date(),
          updatedAt: new Date(),
        });

        if (
          leadData.IsLeadType &&
          leadData.IsLeadType === IsLeadType.callbackRequest
        ) {
          await this.callToVoiceBot(leadData);
        }

        results.push({
          status: 'created',
          _id: inserted.insertedId,
          ...leadData,
        });
      }
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'leads processed successfully',
      data: results,
    };
  }

  // ---------------- HELPER ----------------
  private extractLeadObject = (payload: any) => {
    // -----------------------------
    // Helpers
    // -----------------------------
    const isInvalidValue = (value: any) => {
      if (value === undefined || value === null) return true;

      if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();

        return (
          trimmed === '' ||
          trimmed === 'na' ||
          trimmed === 'null' ||
          trimmed === 'undefined'
        );
      }

      return false;
    };

    const normalizePhone = (value: any) => {
      const raw = String(value).trim();
      const cleaned = raw.replace(/\D/g, '');

      if (cleaned.length < 7 || cleaned.length > 15) return null;

      return raw;
    };

    const normalizeDate = (value: any) => {
      if (!value) return null;

      const parsed = Date.parse(String(value));
      if (isNaN(parsed)) return null;

      return new Date(parsed);
    };

    const safeJsonParse = (input: string) => {
      try {
        let cleaned = input.trim();

        if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
          cleaned = cleaned.slice(1, -1);
        }

        cleaned = cleaned
          .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*)'/g, ': "$1"');

        return JSON.parse(cleaned);
      } catch {
        return {};
      }
    };

    const flattenObject = (
      obj: any,
      prefix = '',
      result: Record<string, any> = {},
    ) => {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) =>
          flattenObject(item, `${prefix}[${index}]`, result),
        );
        return result;
      }

      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;

          if (value && typeof value === 'object') {
            flattenObject(value, newKey, result);
          } else {
            result[newKey] = value;
          }
        }
      }

      return result;
    };

    // -----------------------------
    // Parse Payload
    // -----------------------------
    let data = payload;

    if (typeof payload === 'string') {
      data = safeJsonParse(payload);
    }

    // -----------------------------
    // Field Patterns
    // -----------------------------
    const fieldPatterns: { finalKey: string; regex: RegExp }[] = [
      { finalKey: 'email', regex: /\bemail\b|\be-?mail\b/i },

      {
        finalKey: 'phone',
        regex: /\b(phone|mobile|cell|telephone|home_phone|work_phone)\b/i,
      },

      {
        finalKey: 'firstName',
        regex: /\bfirst[_\-.\s]?name\b|\bfname\b|\bgiven_name\b/i,
      },

      {
        finalKey: 'lastName',
        regex: /\blast[_\-.\s]?name\b|\blname\b|\bsurname\b/i,
      },

      {
        finalKey: 'name',
        regex: /\bfull[_\-.\s]?name\b|(^|\.)(name)\b|\bdisplay_name\b/i,
      },

      {
        finalKey: 'website',
        regex: /\bwebsite\b|\bdomain\b|\burl\b/i,
      },

      {
        finalKey: 'leadSource',
        regex: /\blead[_\-.\s]?source\b|\bsource\b/i,
      },

      { finalKey: 'city', regex: /^city$|^town$/i },

      {
        finalKey: 'address',
        regex: /\baddress\b|\bstreet\b|\bfull_address\b/i,
      },

      {
        finalKey: 'postalCode',
        regex: /\b(zip|postal|pincode|postcode)\b/i,
      },

      {
        finalKey: 'countryCode',
        regex: /\bcountry[_\-.\s]?code\b|\bdial_code\b/i,
      },

      { finalKey: 'country', regex: /^country$/i },
      { finalKey: 'state', regex: /^state$/i },
      { finalKey: 'location', regex: /^location$/i },
      {
        finalKey: 'jobDescription',
        regex: /\bdescription\b|\bjob_description\b|\bnotes\b/i,
      },
    ];

    // -----------------------------
    // Extraction Logic
    // -----------------------------
    const flattened = flattenObject(data);
    const result: Record<string, any> = {};
    const mappedPaths = new Set<string>();

    const invalidSemanticValues = ['save', 'submit', 'update', 'edit'];

    for (const [path, value] of Object.entries(flattened)) {
      if (isInvalidValue(value)) continue;

      const segments = path.split('.');
      const key = segments[segments.length - 1] || path;

      // Skip system keys like $state, $location
      if (segments.some((segment) => segment.startsWith('$'))) continue;

      // Skip id-like fields
      if (/_id$|^id_|\.id$/i.test(path)) continue;

      // Skip junk values
      if (
        typeof value === 'string' &&
        invalidSemanticValues.includes(value.trim().toLowerCase())
      ) {
        continue;
      }

      for (const field of fieldPatterns) {
        if (field.regex.test(key)) {
          if (result[field.finalKey] !== undefined) break;

          mappedPaths.add(path);

          if (field.finalKey === 'phone') {
            const phone = normalizePhone(value);
            if (phone) result.phone = phone;
          } else if (
            field.finalKey === 'createdAt' ||
            field.finalKey === 'updatedAt'
          ) {
            const date = normalizeDate(value);
            if (date) result[field.finalKey] = date;
          } else {
            result[field.finalKey] = value;
          }

          break;
        }
      }
    }

    // -----------------------------
    // Post Processing
    // -----------------------------
    if (!result.name && (result.firstName || result.lastName)) {
      result.name = `${result.firstName || ''} ${result.lastName || ''}`.trim();
    }

    if (result.email && typeof result.email === 'string') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
        delete result.email;
      }
    }

    if (!result.createdAt) result.createdAt = new Date();
    if (!result.updatedAt) result.updatedAt = new Date();

    // -----------------------------
    // Collect Unmapped Data
    // -----------------------------
    const unmappedData: Record<string, any> = {};

    for (const [path, value] of Object.entries(flattened)) {
      const segments = path.split('.');

      if (segments.some((segment) => segment.startsWith('$'))) continue;

      if (!mappedPaths.has(path) && !isInvalidValue(value)) {
        unmappedData[path] = value;
      }
    }

    if (Object.keys(unmappedData).length > 0) {
      result.userData = JSON.stringify(unmappedData);
    }

    return result;
  };

  async callToVoiceBot(leadData: LeadSyncWithCrmDto) {
    try {
      this.eventEmitter.emit('lead.voicebot.trigger', leadData);
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }
  /**
   * Sends lead data to Zapier via webhook
   * @developer - Ankur
   * @param url - The webhook URL to send the payload to
   * @param method - The HTTP method to use (GET, POST, etc)
   * @param payload - The data payload to send. Can be single object or array
   * @returns Response object with status and results
   */
  async sendLeadViaWebhookPayloadToZapier(
    url: string,
    method: string,
    payload: any,
  ) {
    try {
      const payloads = Array.isArray(payload) ? payload : [payload];
      const responses = [];
      const isSinglePayload = !Array.isArray(payload);


      for (const singlePayload of payloads) {
        try {
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(singlePayload),
          });

          if (!response.ok) {
            const updateResult = await this.leadCollection.updateOne(
              { _id: singlePayload.syncId },
              { $set: { isSyncedToCrm: false } },
            );
            if (updateResult.matchedCount === 0) {
            } else if (updateResult.modifiedCount === 0) {
            }

            responses.push({
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Failed to send webhook payload',
              error: `HTTP error! status: ${response.status}`,
              payload: singlePayload,
            });
          } else {
            const updateResult = await this.leadCollection.updateOne(
              { _id: singlePayload.syncId },
              { $set: { isSyncedToCrm: true } },
            );
            if (updateResult.matchedCount === 0) {
            } else if (updateResult.modifiedCount === 0) {
            }

            responses.push({
              statusCode: HttpStatus.OK,
              message: 'Webhook payload sent successfully',
              data: await response.json(),
              payload: singlePayload,
            });
          }
        } catch (error) {
          const updateResult = await this.leadCollection.updateOne(
            { _id: singlePayload.syncId },
            { $set: { isSyncedToCrm: false } },
          );
          if (updateResult.matchedCount === 0) {
          } else if (updateResult.modifiedCount === 0) {
          }

          responses.push({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Error sending individual webhook payload',
            error: error.message,
            payload: singlePayload,
          });
        }
      }

      if (isSinglePayload) {
        return responses[0];
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Webhook payloads processed',
        data: responses,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Error sending webhook payload',
        error: error.message,
      };
    }
  }

  /**
   * Sends bulk leads to Zapier via webhook
   * @developer - Ankur
   * @param url - The webhook URL to send the payload to
   * @param method - The HTTP method to use (GET, POST, etc)
   * @param userId - The ID of the user
   * @returns Response object with status and results
   */
  async sendBulkLeadViaWebhookPayloadToZapier(
    url: string,
    leadType: any[],
    userId: string,
  ) {
    const BATCH_SIZE = 50;
    let skip = 0;
    const allResults = [];
    let hasMoreLeads = true;
    let checkWebhook;
    try {
      checkWebhook = await this.userZapierWebhookCollection.findOne({
        userId,
        webhookType: 'syncAllLeads',
        webhookRequestType: WebhookRequestType.POST,
        webhookUrl: url,
        syncStatus: { $in: [SyncStatus.SYNCING, SyncStatus.SYNCED] },
        leadType: { $exists: true, $in: leadType },
      });

      if (checkWebhook) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `data already in sync with this webhook url:- ${checkWebhook.webhookUrl}`,
        };
      }

      await this.userZapierWebhookCollection.insertOne({
        userId,
        webhookUrl: url,
        webhookRequestType: WebhookRequestType.POST,
        crmName: `sync ultimabot leads to crm`,
        webhookType: 'syncAllLeads',
        syncStatus: SyncStatus.SYNCING,
        leadType: leadType,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      while (hasMoreLeads) {
        const types = Array.isArray(leadType) ? leadType : [leadType];
        const leadTypeConditions =
          types.length > 0
            ? types.map((type) => {
                if (type === 'emailOutreach') {
                  return {
                    IsLeadType: IsLeadType.mailBot,
                    standAloneAssistant: { $ne: true },
                  };
                }
                if (type === 'emailAssistant') {
                  return {
                    IsLeadType: IsLeadType.mailBot,
                    standAloneAssistant: true,
                  };
                }
                return { IsLeadType: type };
              })
            : [{ IsLeadType: { $exists: true } }];

        const leads = await this.leadCollection
          .find({
            userId,
            $and: [
              { $or: leadTypeConditions },
              {
                $or: [
                  { isSyncedToCrm: false },
                  { isSyncedToCrm: { $exists: false } },
                ],
              },
            ],
          })
          .project({
            _id: 1,
            firstName: 1,
            lastName: 1,
            name: 1,
            email: 1,
            phone: 1,
            address: 1,
          })
          .skip(skip)
          .limit(BATCH_SIZE)
          .toArray();

        if (leads.length === 0) {
          hasMoreLeads = false;
          break;
        }

        const payloads = leads.map((lead) => ({
          syncId: lead._id,
          name: lead.name || lead.firstName + ' ' + lead.lastName,
          email: lead.email || '',
          phone: lead.phone || '',
          address: lead.address || '',
        }));

        const result = await this.sendLeadViaWebhookPayloadToZapier(
          url,
          WebhookRequestType.POST,
          payloads,
        );
        allResults.push(result);

        skip += BATCH_SIZE;
      }

      checkWebhook = await this.userZapierWebhookCollection.findOne({
        userId,
        webhookType: 'syncAllLeads',
        webhookRequestType: WebhookRequestType.POST,
        syncStatus: SyncStatus.SYNCING,
      });

      await this.userZapierWebhookCollection.updateOne(
        { _id: new ObjectId(checkWebhook._id) },
        { $set: { syncStatus: SyncStatus.SYNCED } },
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Bulk leads processed and sent to Zapier successfully',
        data: allResults,
      };
    } catch (error) {
      this.logger.error(`Error in bulk lead sync process:`, error);
      await this.userZapierWebhookCollection.updateOne(
        { _id: new ObjectId(checkWebhook._id) },
        { $set: { syncStatus: SyncStatus.FAILED } },
      );
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Error processing bulk leads',
        error: error.message,
      };
    }
  }
}
