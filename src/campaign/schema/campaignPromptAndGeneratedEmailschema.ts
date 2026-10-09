export const CAMPAIGN_PROMPT_AND_GENERATED_EMAIL_COLLECTION =
  'campaignPromptAndGeneratedEmail';

export interface CampaignPromptAndGeneratedEmail {
  campaignId: string;
  campaignPrompt: any;
  subject: string;
  gptGeneratedEmail: string;
  createdAt: Date;
  updatedAt: Date;
}
