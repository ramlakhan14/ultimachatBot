import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsObjectId } from '../common/custom-class-validators';
import { Transform, Type } from 'class-transformer';

export class CreateKnowledgebaseDTO {
  @IsNotEmpty()
  name: string;

  websiteUrl: string;

  @IsOptional()
  @IsArray()
  urls: string[];

  // Include paths (relative to website url)
  @IsOptional()
  @IsArray()
  include: string[];

  // Exclude paths (relative to website url)
  @IsOptional()
  @IsArray()
  exclude: string[];

  @IsBoolean()
  @IsOptional()
  useAlternateParser?: boolean;

  @IsOptional()
  @IsString()
  chatbotType: string;

  @IsOptional()
  @IsObject()
  chatWidgetData?: any;

  @IsOptional()
  @IsString()
  owner: string;

  @IsOptional()
  @IsBoolean()
  isChatbotEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isScrapedLeadProject?: boolean;
}

export class UpdateKnowledgebaseWebsiteDataDTO {
  @IsNotEmpty()
  websiteUrl: string;

  @IsNotEmpty()
  @IsArray()
  urls: string[];

  // Include paths (relative to website url)
  @IsNotEmpty()
  @IsArray()
  include: string[];

  // Exclude paths (relative to website url)
  @IsNotEmpty()
  @IsArray()
  exclude: string[];

  @IsBoolean()
  @IsOptional()
  useAlternateParser?: boolean;
}

export class SetKnowledgebaseDefaultAnswerDTO {
  @IsString()
  defaultAnswer?: string;
}

export class SetPromptDTO {
  @IsString()
  prompt: string;
}

export class AddCustomChunkDTO {
  @IsNotEmpty()
  q: string;

  @IsNotEmpty()
  a: string;
}

export class PromptDTO {
  @IsObjectId()
  _id?: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export class KbCustomKeysDTO {
  @IsBoolean()
  @IsNotEmpty()
  useOwnKey: boolean;

  @IsArray()
  @IsNotEmpty({ each: true })
  keys: string[];
}

export class SetAdminEmailDTO {
  @IsString()
  email: string;
}

export class SetCustomDomainDTO {
  @IsString()
  @IsNotEmpty()
  domain: string;
}

export class QuestionExampleDTO {
  @IsString() heading: string;
  @IsString() question: string;
  @IsString() label: string;
}

export class LauncherIconDTO {
  @IsString() id: string;
  @IsString() svgElement: string;
}

export class LeadCollectionItemDTO {
  @IsBoolean() phoneNumber: boolean;
  @IsBoolean() address: boolean;
}

export class WebsiteDataDTO {
  @IsString() websiteUrl: string;
  @IsArray() urls: string[];
  @IsArray() include: string[];
  @IsArray() exclude: string[];
}

export class CrawlStatsDTO {
  @IsNumber() crawledPages: number;
  @IsNumber() failedPages: number;
  @IsNumber() runTime: number;
}

export class CrawlDataDTO {
  @ValidateNested()
  @Type(() => CrawlStatsDTO)
  stats: CrawlStatsDTO;
}

export class MonthUsageDTO {
  @IsString() month: string;
  @IsNumber() count: number;
}

// export class CreateWebsiteProjectDTO {
//   @IsString() name: string;
//   @IsString() owner: string;
//   @IsString() status: string;

//   @ValidateNested()
//   @Type(() => WebsiteDataDTO)
//   websiteData: WebsiteDataDTO;

//   @ValidateNested()
//   @Type(() => CrawlDataDTO)
//   crawlData: CrawlDataDTO;

//   @ValidateNested()
//   @Type(() => ChatWidgetDataDTO)
//   chatWidgeData: ChatWidgetDataDTO;

//   @IsString() defaultAnswer: string;

//   @ValidateNested()
//   @Type(() => MonthUsageDTO)
//   monthUsage: MonthUsageDTO;

//   @IsString() adminEmail: string;
// }

// export class LauncherIconDTO {
//   @IsString() id: string;
//   @IsString() svgElement: string;
// }
export class ChatWidgetDataDTO {
  @IsString() @IsOptional() backgroundColor: string;
  @IsString() @IsOptional() fontColor: string;
  @IsString() @IsOptional() placement: string;
  @IsString() @IsOptional() borderRadius: string;
  @IsString() heading: string;
  @IsString() description: string;
  @IsBoolean() @IsOptional() offlineMessage: boolean;
  @IsBoolean() @IsOptional() showReadMore: boolean;
  @IsBoolean() @IsOptional() showAsPopup: boolean;
  @IsNumber() @IsOptional() popupDelay: number;

  @IsString() collectEmailText: string;
  @IsString() @IsOptional() adminEmail: string;
  @IsString() customCSS: string;

  @IsString() avatarFieldValue: string;
  @IsString() avatarFieldLabel: string;
  @IsString() emailLabel: string;

  @IsString() phoneFieldLabel: string;
  @IsString() whatsappFieldLabel: string;
  @IsString() videoFieldLabel: string;
  @IsString() appointmentFieldLabel: string;

  @IsString() contentEmail: string;
  @IsString() contentPhone: string;
  @IsString() contentWhatsapp: string;
  @IsString() contentVideo: string;
  @IsString() contentAppointment: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionExampleDTO)
  questionExamples: QuestionExampleDTO[];

  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return [];
    return value.filter(
     (msg) => typeof msg === 'string' && msg.trim() !== '',
  );
  })
  welcomeMessages: string[];

  @IsString() prompt: string;
  @IsString() defaultAnswer: string;

  @ValidateNested()
  @Type(() => LauncherIconDTO)
  launcherIcon: LauncherIconDTO;

  @IsString() chatInputPlaceholderText: string;
  @IsString() assistantTabHeader: string;
  @IsString() offlineMsgTabHeader: string;
  @IsString() readMoreText: string;
  @IsString() offlineMsgHeading: string;
  @IsString() offlineMsgDescription: string;

  @IsString() nameFieldLabel: string;
  @IsString() nameFieldPlaceholder: string;

  @IsString() emailFieldLabel: string;
  @IsString() emailFieldPlaceholder: string;

  @IsString() @IsOptional() privacypolicyLabel: string;
  @IsString() @IsOptional() privacypolicyValue: string;

  @IsString() @IsOptional() termsandconditionsLabel: string;
  @IsString() @IsOptional() termsandconditionsValue: string;

  @IsString() msgFieldLabel: string;
  @IsString() msgFieldPlaceholder: string;

  @IsString() @IsOptional() requiredFieldMsg: string;
  @IsString() @IsOptional() invalidEmailMsg: string;

  @IsString() formSubmitBtnLabel: string;
  @IsString() formSubmitBtnSubmittingText: string;
  @IsString() formSubmitSuccessMsg: string;
  @IsString() formSubmitErrorMsg: string;

  @IsString() formSendAgainBtnLabel: string;
  @IsString() formTryAgainBtnLabel: string;

  @IsString() model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadCollectionItemDTO)
  leadCollectionData: LeadCollectionItemDTO[];

  @IsString() thankyouEmailText: string;
  @IsBoolean() isThankYouEmailEnabled: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showIconPopup: boolean = true;
}

// export class QuestionExampleDTO {
//   @IsString() heading: string;
//   @IsString() question: string;
//   @IsString() label: string;
// }

// export class LeadCollectionItemDTO {
//   @IsBoolean() phoneNumber: boolean;
//   @IsBoolean() address: boolean;
// }
