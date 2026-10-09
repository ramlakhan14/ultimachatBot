import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { MONGODB } from '../common/mongo/mongo.module';
import { EmailTemplate, EMAILTEMPLATE_COLLECTION } from './email.schema';
import { Collection, Db } from 'mongodb';
import { UserSparse } from '../user/user.schema';
import { isAdmin } from '../auth/guards/role.enum';

export class EmailTemplateService {
  private readonly emailtemplateCollection: Collection<EmailTemplate>;
  constructor(@Inject(MONGODB) private db: Db) {
    this.emailtemplateCollection = this.db.collection<EmailTemplate>(
      EMAILTEMPLATE_COLLECTION,
    );
  }

  async getAllEmailTemplates(user: UserSparse) {
    const adminStatus = isAdmin(user);
    if (adminStatus) {
      return await this.emailtemplateCollection.find({}).toArray();
    } else {
      throw new HttpException(
        'Failed to retrieve Email Templates',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async updateTemplateData(
    user: UserSparse,
    emailTemplateData: Record<string, string>,
  ) {
    const adminStatus = isAdmin(user);

    if (!adminStatus) {
      throw new HttpException(
        'Failed to update Email Templates',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      // Convert the payload object into an array of update operations
      const updateOperations = Object.entries(emailTemplateData).map(
        ([templateName, emailBody]) => {
          return this.emailtemplateCollection.updateOne(
            { name: templateName }, // Match template by name
            {
              $set: {
                emailBody,
                updatedAt: new Date(),
              },
            },
            { upsert: false },
          );
        },
      );

      // Execute all updates in parallel
      const results = await Promise.all(updateOperations);

      // Check if all updates were successful
      const allUpdatesSuccessful = results.every(
        (result) => result.matchedCount > 0,
      );

      if (!allUpdatesSuccessful) {
        throw new HttpException(
          'Some email templates were not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to update Email Templates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchEmailContent(name: string) {
    return await this.emailtemplateCollection.findOne(
      { name },
      { projection: { emailBody: 1 } },
    );
  }
}
