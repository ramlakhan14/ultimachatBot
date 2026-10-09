import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Res,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { EmailAssistanceService } from './email-assistance.service';
import { Response } from 'express';
import { CreateCommonFolderDto } from './dto/create-common-folder.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto, UpdateFolderDto_ } from './dto/update-folder.dto';
import { RequestWithUser } from '../common/@types/nest.types';

@Controller('emailAssistance')
export class EmailAssistanceController {
  constructor(
    private readonly emailAssistanceService: EmailAssistanceService,
  ) {}

  // Method to create a common folder
  @Post('commonFolder')
  async createCommonFolder(
    @Body() folderData: CreateCommonFolderDto,
    @Res() res: Response,
  ) {
    const folder = await this.emailAssistanceService.createCommonFolder(
      folderData,
    );
    return res.status(201).json(folder);
  }

  // Method to get all common folders
  @Get('commonFolders')
  async getAllCommonFolders(@Res() res: Response) {
    const folders = await this.emailAssistanceService.getAllCommonFolders();
    return res.status(200).json(folders);
  }

  //=====================================================================================================
  // // Method to get a common folder by ID
  // @Get('commonFolder')
  // async getCommonFolderById(@Query('id') id: string, @Res() res: Response) {
  //   const folder = await this.emailAssistanceService.getCommonFolderById(id);
  //   return res.status(200).json(folder);
  // }

  // Method to update a common folder
  // @Put('commonFolder')
  // async updateCommonFolder(
  //   @Body() updateData: UpdateCommonFolderDto,
  //   @Res() res: Response,
  // ) {
  //   const { _id } = updateData;
  //   const folder = await this.emailAssistanceService.updateCommonFolder(
  //     _id,
  //     updateData,
  //   );
  //   return res.status(200).json(folder);
  // }

  //========================================================================================================
  // Method to delete a common folder
  // @Delete('commonFolder')
  // async deleteCommonFolder(@Query('id') id: string, @Res() res: Response) {
  //   await this.emailAssistanceService.deleteCommonFolder(id);
  //   return res.status(204).send();
  // }

  //=====================================================================================================

  // Method to create a folder
  @Post('folder')
  async createFolder(
    @Body() folderData: CreateFolderDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const folder = await this.emailAssistanceService.createFolder(
      folderData,
      req.user._id.toHexString(),
    );
    return res.status(201).json(folder);
  }

  // Method to get all folders
  @Get('folders')
  async getAllFolders(
    @Res() res: Response,
    @Req() req: any,
    @Query() query: any,
  ) {
    const folders = await this.emailAssistanceService.getAllFolders(
      req.user._id.toHexString(),
      query,
    );
    return res.status(200).json(folders);
  }

  // Method to get a folder by ID
  @Get('folder')
  async getFolderById(@Res() res: Response, @Req() req: any) {
    const folder = await this.emailAssistanceService.getFolderById(
      req.user._id.toHexString(),
    );
    return res.status(200).json(folder);
  }

  // Method to update a folder
  @Put('folder')
  async updateFolder(
    @Body() updateData: UpdateFolderDto_,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const { folderId } = updateData;
    const folder = await this.emailAssistanceService.updateFolder(
      folderId,
      req.user._id.toHexString(),
      updateData,
    );
    return res.status(200).json(folder);
  }

  // Method to delete a folder
  @Delete('folder')
  async deleteFolder(
    @Query('id') id: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    await this.emailAssistanceService.deleteFolder(
      id,
      req.user._id.toHexString(),
    );
    return res.status(204).send();
  }
  // Method to create email assistance setting
  @Post('setting')
  async createEmailAssistanceSetting(
    @Req() req: any,
    @Body() data: any,
    @Res() res: Response,
  ) {
    const result =
      await this.emailAssistanceService.createEmailAssistanceSetting(
        req.user._id.toHexString(),
        data,
      );
    return res.status(HttpStatus.OK).json(result);
  }

  // Method to get email assistance setting
  @Get('setting')
  async getEmailAssistanceSetting(@Req() req: any, @Res() res: Response) {
    const setting = await this.emailAssistanceService.getEmailAssistanceSetting(
      req.user._id.toHexString(),
    );
    return res.status(HttpStatus.OK).json(setting);
  }

  // Method to update email setting
  @Put('setting/emailSetting')
  async updateEmailSetting(
    @Req() req: any,
    @Body() emailSetting: any,
    @Res() res: Response,
  ) {
    const setting = await this.emailAssistanceService.updateEmailSetting(
      req.user._id.toHexString(),
      emailSetting,
    );
    return res.status(HttpStatus.OK).json(setting);
  }

  // Method to update rule setup setting
  @Put('setting/ruleSetupSetting')
  async updateRuleSetupSetting(
    @Req() req: any,
    @Body() ruleSetup: any,
    @Res() res: Response,
  ) {
    const setting = await this.emailAssistanceService.updateRuleSetupSetting(
      req.user._id.toHexString(),
      ruleSetup,
    );
    return res.status(HttpStatus.OK).json(setting);
  }

  // Method to delete email assistance setting
  @Delete('setting')
  async deleteEmailAssistanceSetting(@Req() req: any, @Res() res: Response) {
    await this.emailAssistanceService.deleteEmailAssistanceSetting(
      req.user._id.toHexString(),
    );
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  // Method to get conversations by folder type
  @Get('emailConversationListing')
  async emailConversationListingByFolderType(
    @Req() req: any,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const { searchString, page, limit, folderId, folderName } = query;
    const conversations =
      await this.emailAssistanceService.getConversationsByFolderType(
        searchString,
        page,
        limit,
        folderId,
        req,
        folderName,
        query,
      );
    return res.status(HttpStatus.OK).json(conversations);
  }

  @Get('notification')
  async getEmailAssistanceNotificationByUserId(
    @Req() req: any,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const { notificationType, page, limit } = query;
    const notifications =
      await this.emailAssistanceService.getEmailAssistanceNotificationByUserId(
        req.user._id.toHexString(),
        notificationType,
        Number(page),
        Number(limit),
      );
    return res.status(HttpStatus.OK).json(notifications);
  }

  @Put('notification/seen')
  async updateEmailAssistanceNotificationAsSeen(
    @Req() req: any,
    @Body() notification: any,
    @Res() res: Response,
  ) {
    const notifications =
      await this.emailAssistanceService.updateEmailAssistanceNotificationAsSeen(
        req.user._id.toHexString(),
        notification.notificationId,
      );
    return res.status(HttpStatus.OK).json(notifications);
  }

  @Delete('notification/delete')
  async deleteEmailAssistanceNotification(
    @Req() req: any,
    @Body() notification: any,
    @Res() res: Response,
  ) {
    const result =
      await this.emailAssistanceService.deleteEmailAssistanceNotification(
        req.user._id.toHexString(),
        notification.notificationId,
      );
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('projects')
  async getDropdownProjects(@Req() req: any, @Res() res: Response) {
    const result = await this.emailAssistanceService.getDropdownProjects(
      req.user._id.toHexString(),
    );
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('campaigns')
  async getDropdownCampaigns(
    @Req() req: any,
    @Query('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const result = await this.emailAssistanceService.getDropdownCampaigns(
      req.user._id.toHexString(),
      projectId,
    );
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('assistantEmails')
  async getDropdownAssistantEmails(@Req() req: any, @Res() res: Response) {
    const result = await this.emailAssistanceService.getDropdownAssistantEmails(
      req.user._id.toHexString(),
    );
    return res.status(HttpStatus.OK).json(result);
  }

  @Put('unsubscribe')
  async emailAssistanceUnsubscribeEmail(
    @Req() req: any,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const result =
      await this.emailAssistanceService.emailAssistanceUnsubscribeEmail(
        body.email,
        req,
      );
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('unsubscribe')
  async emailAssistanceListUnsubscribedEmails(
    @Req() req: any,
    @Res() res: Response,
  ) {
    const result =
      await this.emailAssistanceService.emailAssistanceListUnsubscribedEmails(
        req,
      );
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('dashboard')
  async emailAssistanceDashboard(@Req() req: any, @Res() res: Response) {
    const result = await this.emailAssistanceService.emailAssistanceDashboard(
      req,
    );
    return res.status(HttpStatus.OK).json(result);
  }

  @Delete('conversation/delete')
  async deleteConversationByFolderType(
    @Req() req: any,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const { ids, folderName } = body;
      const result =
        await this.emailAssistanceService.deleteConversationByFolderType(
          ids,
          folderName,
          req.user._id.toHexString(),
        );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Failed to delete conversation by folder type',
        error: error.message,
      });
    }
  }

  @Get('emailConversation/manualFolder')
  async manualFolderConversationListing(
    @Req() req: any,
    @Res() res: Response,
    @Query() query: any,
  ) {
    try {
      const result =
        await this.emailAssistanceService.manualFolderConversationListing(
          query.searchString || '',
          query.page || 1,
          query.limit || 10,
          query.folderId,
          query.emailId,
          query.categories,
          req,
          query,
        );
      return res.status(result.statusCode).json(result);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Failed to list conversations in manual folder',
        error: error.message,
      });
    }
  }

  @Delete('emailConversation/manualFolder/delete')
  async deleteEmailConvoFromManualFolder(
    @Req() req: RequestWithUser,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const { ids } = body;
      const result =
        await this.emailAssistanceService.deleteEmailConvoFromFolder(
          ids,
          req.user._id.toHexString(),
        );
      return res.status(result.statusCode).json(result);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Failed to delete email conversation from folder',
        error: error.message,
      });
    }
  }
}
