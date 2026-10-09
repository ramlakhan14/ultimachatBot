import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Collection, Db, ObjectId, SortDirection } from 'mongodb';
import { MONGODB } from '../../common/mongo/mongo.module';
import { USER_COLLECTION, UserSparse } from '../../user/user.schema';
import { KnowledgebaseDbService } from '../knowledgebase-db.service';
import { NewOfflineMsgDTO } from './offline-msg.dto';
import {
  OfflineMessage,
  OFFLINE_MSG_COLLECTION,
  EmailStatus,
} from './offline-msg.schema';
import { EmailService } from '../../common/email/email.service';
import { UserService } from '../../user/user.service';
import { getLimitOffsetPaginatedResponse } from 'src/common/utils';
import { WebhookService } from '../../webhook/webhook.service';
import { WebhookEventType } from '../../webhook/webhook.types';
import { Role } from '../../auth/types/role.enum';
import { checkUserIsOwnerOfKb } from '../knowledgebase-utils';
import { AppConfigService } from '../../common/config/appConfig.service';
import { IsLeadType, Lead, LEADS_COLLECTION } from '../knowledgebase.schema';
import { SMTP_SETUP_COLLECTION } from '../../smtp/entities/smtp.entity';

@Injectable()
export class OfflineMsgService {
  private readonly offlineMsgCollection: Collection<OfflineMessage>;
  private readonly leadCollection: Collection<Lead>;
  constructor(
    @Inject(MONGODB) private db: Db,
    private kbDbService: KnowledgebaseDbService,
    private userService: UserService,
    private emailService: EmailService,
    private readonly webhookService: WebhookService,
    private readonly appConfig: AppConfigService,
  ) {
    this.leadCollection = this.db.collection(LEADS_COLLECTION);
    this.offlineMsgCollection = this.db.collection(OFFLINE_MSG_COLLECTION);
  }

  /*********************************************************
   * DB OPERATIONS
   *********************************************************/

  async insertOfflineMsg(data: NewOfflineMsgDTO): Promise<OfflineMessage> {
    const msg: OfflineMessage = {
      knowledgebaseId: new ObjectId(data.knowledgebaseId),
      chatSessionId: new ObjectId(data.sessionId),
      name: data.name,
      email: data.email,
      message: data.message,
      url: data.url,
      createdAt: new Date(),
      emailStatus: EmailStatus.NOTSENT,
    };

    const res = await this.offlineMsgCollection.insertOne(msg);

    return {
      _id: res.insertedId,
      ...msg,
    };
  }

  async getPaginatedOfflineMsgsForKnowledgebase(
    kbId: ObjectId,
    pageSize: number,
    page?: number,
    sort?: number,
    searchQuery?: string,
  ) {
    const itemsPerPage = Math.min(pageSize, 50);

    const projectionFields = {
      _id: 1,
      chatSessionId: 1,
      name: 1,
      email: 1,
      message: 1,
      createdAt: 1,
      emailStatus: 1,
    };

    const filter = {
      knowledgebaseId: kbId,
    };

    const response = await getLimitOffsetPaginatedResponse(
      this.offlineMsgCollection,
      filter,
      projectionFields,
      'createdAt',
      (sort as SortDirection) || -1,
      itemsPerPage,
      page,
      searchQuery,
    );

    return response;
  }

  /*********************************************************
   * APIS
   *********************************************************/

  /**
   * Add a new offline message
   * @param data
   * @returns
   */
  async createOfflineMessage(data: NewOfflineMsgDTO) {
    const kbId = new ObjectId(data.knowledgebaseId);
    const kb = await this.kbDbService.getKnowledgebaseById(kbId);
    if (!kb) {
      throw new HttpException('Invalid Knowledgebase', HttpStatus.NOT_FOUND);
    }

    // Choose email address to send this mail
    // If adminEmail field is set user that, else use owner email
    let email = '';
    if (kb.adminEmail) {
      email = kb.adminEmail;
    } else if (kb.chatbotType == 'vakmangids') {
      email = this.appConfig.get('vakmangidsAdminEmail');
    } else {
      // Get kb owner
      const kbOwner = await this.userService.findUserByIdSparse(
        kb.owner.toHexString(),
      );
      email = kbOwner.email;
    }

    // Insert offline msg
    const res = await this.insertOfflineMsg(data);

    // Added data in leads
    await this.leadCollection.insertOne({
      email: data.email,
      campaignId: null,
      firstName: data.name,
      lastName: null,
      name: data?.name || '',
      phone: '',
      address: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: kb.owner.toHexString(),
      knowledgebaseId: kbId,
      campaignDetails: {
        _id: kbId,
        campaignName: kb.name,
      },
      standAloneAssistant: false,
      emailConversationId: null,
      emailStatus: true,
      fieldStatus: 0,
      chatbotType: null,
      IsLeadType: IsLeadType.chatBot,
      isSyncedToCrm: false,
      isAppointmentBooked: false,
      calendarEventId: null,
      meetingDateAndTime: null,
      chatMessage: [{ query: data?.message }],
    });

    // Send email
    await this.emailService.sendOfflineMsgEmail(
      email,
      `New Offline Message Captured for the website ${kb.websiteData.websiteUrl} on UltimaBot`,
      {
        website_url: kb.websiteData.websiteUrl,
        msg_email: data.email,
        msg_name: data.name,
        msg_msg: data.message || 'NA',
        userId: kb.owner.toHexString(),
      },
    );

    // Call webhook with the offline msg
    this.webhookService.callWebhook(kb.owner, {
      event: WebhookEventType.OFFLINE_MSG,
      payload: {
        id: res._id.toHexString(),
        chatSessionId: res.chatSessionId.toHexString(),
        email: res.email,
        name: res.name,
        message: res.message,
        knowledgebaseId: res.knowledgebaseId.toHexString(),
        url: res.url,
        createdAt: res.createdAt,
      },
    });

    return res;
  }

  /**
   * Get paginated list of offline msgs
   * @param user
   * @param knowledgebaseId
   * @param pageSize
   * @param before
   * @param after
   * @returns
   */
  async getOfflineMsgsForKnowledgebase(
    user: UserSparse,
    knowledgebaseId: string,
    pageSize: number,
    page?: number,
    sort?: number,
    searchQuery?: string,
  ) {
    const kbId = new ObjectId(knowledgebaseId);

    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (user.role != Role.Admin) {
      if (!kb || !user._id.equals(kb.owner)) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    return this.getPaginatedOfflineMsgsForKnowledgebase(
      kbId,
      pageSize,
      page,
      sort,
      searchQuery,
    );
  }

  async offlineMsgResponseMail(
    user: UserSparse,
    data: any,
    knowledgebaseId: string,
    id: string,
  ) {
    const kbId = new ObjectId(knowledgebaseId);
    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    checkUserIsOwnerOfKb(user, kb);

    const userDetails = await this.db
      .collection(USER_COLLECTION)
      .findOne({ _id: new ObjectId(user._id) }, { projection: { role: 1 } });

    const isAdmin = userDetails?.role === 'admin';
    if (!isAdmin) {
      const smtpSettingResponse = await this.db
        .collection(SMTP_SETUP_COLLECTION)
        .find({ userId: user._id.toHexString() })
        .toArray();

      if (!smtpSettingResponse || smtpSettingResponse.length === 0) {
        throw new BadRequestException(
          'SMTP details not found for this user please to send email',
        );
      }
    }
    const offlineMsg = await this.offlineMsgCollection.findOne({
      _id: new ObjectId(id),
      knowledgebaseId: kbId,
    });

    const res = await this.emailService.sendofflineMsgResponseMail({
      ...data,
      name: offlineMsg.name,
      message: offlineMsg.message,
      userId: user._id.toHexString(),
    });
    if (res?.messageId || res.Message == 'OK') {
      await this.offlineMsgCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { emailStatus: EmailStatus.SENT } },
      );
    }
  }
}
