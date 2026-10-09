import { HttpStatus, Injectable } from '@nestjs/common';
import * as postmark from 'postmark';
import * as Handlebars from 'handlebars';
import * as jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { GPTModels } from '../enum/enum';
import { OpenaiService } from '../../openai/openai.service';
import { EmailService } from '../../common/email/email.service';
@Injectable()
export class AdminPostmarkService {
  private client: postmark.ServerClient;
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly emailService: EmailService,
  ) {}

  async sendCampaignEmailToLeads(
    senderEmail: string,
    receiverEmail: string,
    data: any,
    subject: string,
    emailText: any,
    serverToken?: string,
    userId?: string,
  ) {
    const campaignUnsubscribeToken = jwt.sign(
      {
        email: receiverEmail,
        campaignId: data?.data?._id,
        addedBy: data?.data?.addedBy,
        isUnsubscriptionForSender: false,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: '90d',
      },
    );

    const senderUnsubscribeToken = jwt.sign(
      {
        email: receiverEmail,
        campaignId: data?.data?._id,
        addedBy: data?.data?.addedBy,
        isUnsubscriptionForSender: true,
      },
      process.env.SECRET_KEY,
      { expiresIn: '90d' },
    );

    const campaignDetails = {
      email: receiverEmail,
      campaignId: data?.data?._id,
      campaigName: data?.data?.campaignName,
      painPoints: data?.data?.painPoints,
      solutionOffer: data?.data?.solutionOffer,
      campaignLanguage: data?.data?.campaignLanguage,
      campaignProject: data?.data?.campaignProject,
      addedBy: data?.data?.addedBy,
    };


    const response = await this.greetGenerater(campaignDetails);

    const token = jwt.sign(
      {
        email: receiverEmail,
        greetMessage: response.data?.greet || response.data,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: '15d',
      },
    );
    const campaignUnsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe?_t=${campaignUnsubscribeToken}`;
    const senderUnsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe?_t=${senderUnsubscribeToken}`;

    // const unsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe?_t=${unsubscribeToken}`;
    const template = Handlebars.compile(emailText);
    let htmlContent = '';
    // if (
    //   data?.data?.callOfAction?.customLink &&
    //   data?.data?.callOfAction?.customLink !== ''
    // ) {
    //   htmlContent = template({ unsubscribeLink, token });
    // } else {
    //   htmlContent = template({ unsubscribeLink });
    // }
    if (
      data?.data?.callOfAction?.customLink &&
      data?.data?.callOfAction?.customLink !== ''
    ) {
      // When CTA exists → old behavior, but updated unsubscribe keys
      htmlContent = template({
        campaignUnsubscribeLink,
        senderUnsubscribeLink,
        token,
      });
    } else {
      // When NO CTA → MUST include BOTH unsubscribe links
      htmlContent = template({
        campaignUnsubscribeLink,
        senderUnsubscribeLink,
      });
    }

    // this.client = new postmark.ServerClient(serverToken);
    // const res = await this.client.sendEmail({
    //   From: senderEmail,
    //   To: receiverEmail,
    //   Subject: subject,
    //   HtmlBody: htmlContent,
    // });
    // return res;
    return this.emailService.sendEmailViaBothSMTPAndPostmarkSettings({
      userId: userId,
      to: receiverEmail,
      from: senderEmail,
      subject: subject,
      html: htmlContent,
    });
  }

  async greetGenerater(campaignDetails: any) {
    const {
      targetAudience,
      painPoints,
      solutionOffer,
      campaigName,
      campaignLanguage,
    } = campaignDetails || {};

    const prompt = [
      {
        role: 'system',
        content: `You are an expert marketing copywriter. Your task is to generate a short and polite greeting message in ${campaignDetails.campaignLanguage} language and return it STRICTLY in this JSON format: { "greet": "short greeting message" }. Do not include any other text or explanations - only return the JSON object.`,
      },
      {
        role: 'user',
        content: `Generate a greeting message in ${campaignLanguage} language in JSON format with the key "greet".
  
          Details:
          CampaignName: ${JSON.stringify(campaigName)}
          Target Audience: ${JSON.stringify(targetAudience)}
          Pain Points: ${JSON.stringify(painPoints)}
          Solution: ${JSON.stringify(solutionOffer)}
  
          Message requirements:
  
          1. Start with "Hi" followed by a brief and friendly note.
          2. Mention that you are aware the user received your campaign with campaignName mention in Details.
          3. Acknowledge their pain points.
          4. Briefly reference the solution offer.
          5. End with an open-ended invitation to assist further.
          6. Keep the tone professional, conversational, and short.
          7. Respond only with the JSON object in this format:
  
          { "greet": "short greeting message" }`,
      },
    ];


    if (campaignDetails?.addedBy) {
      const gptGreetResponse = await this.openaiService.getChatGptCompletion(
        {
          messages: prompt as any,
          temperature: 0.5,
          frequency_penalty: 0,
          presence_penalty: 0,
          top_p: 1,
          model: GPTModels.GPT_5_MINI,
        },
        [],
        new ObjectId(campaignDetails?.addedBy),
        'postmark-email-greeting',
      );

      const gptGreetResponseData = gptGreetResponse.response
        ? JSON.parse(gptGreetResponse.response)
        : {};

      return {
        statusCode: HttpStatus.OK,
        message: 'GPT Generated Greet Message',
        data: gptGreetResponseData,
      };
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'No Added By',
      data: {},
    };
  }
}
