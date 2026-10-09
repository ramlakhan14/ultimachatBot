import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Logger,
} from '@nestjs/common';
import { Public } from '../auth/guards/public.guard';
import { Roles } from '../auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
import { RequestWithUser } from '../common/@types/nest.types';
import { DataStoreService } from './datastore.service';
import {
  AddCustomChunkDTO,
  ChatWidgetDataDTO,
  CreateKnowledgebaseDTO,
  KbCustomKeysDTO,
  SetAdminEmailDTO,
  SetCustomDomainDTO,
  SetKnowledgebaseDefaultAnswerDTO,
  SetPromptDTO,
  UpdateKnowledgebaseWebsiteDataDTO,
} from './knowledgebase.dto';
import { DataStoreType } from './knowledgebase.schema';
import { KnowledgebaseService } from './knowledgebase.service';
import { KnowledgebaseDbService } from './knowledgebase-db.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('knowledgebase')
export class KnowledgebaseController {
  private readonly logger = new Logger('KnowledgebaseController');

  constructor(
    private readonly kbService: KnowledgebaseService,
    private readonly dataStoreService: DataStoreService,
    private readonly knowledgebasedbService: KnowledgebaseDbService,
  ) {}

  /**
   * Set Custom Keys for Knowledgebase
   */
  @Put('/custom_keys')
  async setUserCustomKeys(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: KbCustomKeysDTO,
  ) {
    const { user } = req;
    return this.kbService.setUserCustomKeys(user, id, {
      useOwnKey: data.useOwnKey,
      keys: data.keys,
    });
  }

  @Public()
  @Get('/chat_widget_data_for_domain')
  async getChatWidgetDataForDomain(@Query('domain') domain: string) {
    return this.kbService.getChatWidgetDataForDomain(domain);
  }

  /**
   * Get Knowleldgebase Detail by ID
   */
  @Get('/:id')
  @SkipThrottle()
  async getKnowledgebaseData(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    try {
      const { user } = req;
      return this.kbService.getKnowledgeBaseDetail(user, id);
    } catch (error) {
      this.logger.error('Error fetching knowledgebase details:', error);
      throw new HttpException(
        'Unable to fetch project details at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   *  Delete knowledgebase
   */
  @Delete('/:id')
  @HttpCode(204)
  async deleteKnowledgebase(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const { user } = req;
    return this.kbService.deleteKnowledgebaseForUser(user, id);
  }

  /**
   * Get Chat widget data for KB (Public)
   */
  @Public()
  @Get('/:id/chat_widget_data')
  async getChatWidgetData(@Param('id') id: string) {
    return this.kbService.getKnowledgebaseChatWidgetData(id);
  }

  /**
   * Update chat widget data
   */
  @Put('/:id/chat_widget_data')
  async setChatWidgetData(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: ChatWidgetDataDTO,
  ) {
    try {
    const { user } = req;
    return this.kbService.setKnowledgebaseChatWidgeData(user, id, data);
    }catch(error){
 
      throw new HttpException('Unable to update chat widget data at the moment, please try again later', HttpStatus.INTERNAL_SERVER_ERROR);
    }

  }

  /**
   * Set Admin email for knowledgebase
   */
  @Put('/:id/admin_email')
  async setAdminEmail(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: SetAdminEmailDTO,
  ) {
    const { user } = req;
    return this.kbService.setKnowledgebaseAdminEmail(user, id, data.email);
  }

  /**
   * Update website data for KB
   */
  @Put('/:id/website_data')
  async updateWebsiteData(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: UpdateKnowledgebaseWebsiteDataDTO,
  ) {
    const { user } = req;
    return this.kbService.updateKnowledgebaseWebsiteData(user, id, data);
  }

  /**
   * Update website data for KB
   */
  @Put('/:id/default_answer')
  async setDefaultAnswer(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: SetKnowledgebaseDefaultAnswerDTO,
  ) {
    const { user } = req;
    return this.kbService.setKnowledgebaseDefaultAnswer(
      user,
      id,
      data.defaultAnswer,
    );
  }

  /**
   * Set custom domains for kb
   */
  @Put('/:id/custom_domain')
  async setCustomDomains(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: SetCustomDomainDTO,
  ) {
    const { user } = req;
    return this.kbService.setCustomDomain(user, id, data.domain);
  }

  /**
   * Update Prompt for knowledge base
   */
  @Put('/:id/prompt')
  async setPromptId(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: SetPromptDTO,
  ) {
    const { user } = req;
    return this.kbService.setKnowledgebasePrompt(user, id, data.prompt);
  }

  @Post('/:id/setDefaultPrompt')
  async setDefaultPromptData(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const { user } = req;
    return await this.kbService.setToDefaultPrompt(user, id);
  }
  /**
   * Set KB as demo
   */
  @Put('/:id/set_demo')
  @Roles(Role.Admin)
  async setKnowledgebaseAsDemo(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const { user } = req;
    return this.kbService.setKnowledgebaseAsDemo(user, id);
  }

  /*********************************************************
   * CUSTOM DATA APIS
   *********************************************************/

  /**
   * Update Custom Data
   */
  @Get('/:id/datastore/:dId')
  async getDataStoreItem(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('dId') dId: string,
  ) {
    const { user } = req;
    return this.dataStoreService.getDataStoreItemDetail(user, id, dId);
  }
  /**
   * Update Custom Data
   */
  @Put('/:id/datastore/:dId')
  async updateDataStoreItem(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('dId') dId: string,
    @Body() data: AddCustomChunkDTO,
  ) {
    const { user } = req;
    const result =
      await this.dataStoreService.updateDataStoreItemForKnowledgebase(
        user,
        id,
        dId,
        data,
      );
    return {
      message: 'Data store item updated successfully',
      result,
    };
  }

  /**
   * Delete custom data from data store
   */
  @Delete('/:id/datastore/:dId')
  async deleteDataStoreItem(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('dId') dId: string,
  ) {
    const { user } = req;
    return await this.dataStoreService.deleteDataStoreItemFromKnowledgebase(
      user,
      id,
      dId,
    );
  }

  /**
   * Add new custom data data store item
   */
  @Post('/:id/datastore/custom_data')
  async addCustomData(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: AddCustomChunkDTO,
  ) {
    const { user } = req;
    const result = await this.dataStoreService.addCustomDataToKnowledgebase(
      user,
      id,
      data,
    );
    return {
      message: 'Custom data added successfully',
      data: result,
    };
  }

  /**
   * Get custom data data store items
   */
  @Get('/:id/datastore')
  async listCustomData(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('page_size') pageSize?: number,
    @Query('page') page?: number,
    @Query('type') type?: DataStoreType,
  ) {
    const { user } = req;
    return this.dataStoreService.listDataStoreItemsInKnowledgebase(
      user,
      id,
      pageSize || 10,
      type,
      page,
    );
  }

  @Post('/:id/generate_embeddings')
  async generateEmbeddings(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const { user } = req;
    return this.kbService.generateEmbeddingsForKnowledgebase(user, id);
  }

  @Get('/')
  async getKnowledgebasesForUser(
    @Req() req: RequestWithUser,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
    @Query('isChatbotEnabled') isChatbotEnabled?: string,
    @Query('isScrapedLeadProject') isScrapedLeadProject?: string,
  ) {
    try {
      const { user } = req;
      return this.kbService.listKnowledgebasesForUser(
        user,
        limit,
        page,
        search,
        isChatbotEnabled,
        isScrapedLeadProject,
      );
    } catch (error) {
      this.logger.error('Error fetching knowledgebases:', error);
      throw new HttpException(
        'Unable to fetch projects at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/')
  async createKnowledgebase(
    @Req() req: RequestWithUser,
    @Body() data: CreateKnowledgebaseDTO,
  ) {
    const { user } = req;
    try {
      return this.kbService.createKnowledgebase(user, data);
    } catch (error) {
      this.logger.error('Error creating knowledgebase:', error);
      throw new HttpException(
        'Your website is currently not able to scrape successfully, Please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('/visitors')
  async createKnowledgebaseForVisitor(
    @Req() req: RequestWithUser,
    @Body() data: CreateKnowledgebaseDTO,
  ) {
    try {
      return this.kbService.createKnowledgebaseForVisitors(data);
    } catch (error) {
      this.logger.error('Error creating knowledgebase for visitor:', error);
      throw new HttpException(
        'Unable to create knowledgebase for visitor at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Public()
  @Get('/:id/visitors')
  async getKnowledgebaseDataForVisitors(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    try {
      return this.kbService.getKnowledgeBaseDetailForVisitors(id);
    } catch (error) {
      this.logger.error(
        'Error fetching knowledgebase details for visitors:',
        error,
      );
      throw new HttpException(
        'Unable to fetch project details for visitors at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('/:id/generate_embeddings/visitors')
  async generateEmbeddingsForKnowledgebaseVisitors(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    try {
      return this.kbService.generateEmbeddingsForKnowledgebaseVisitors(id);
    } catch (error) {
      this.logger.error('Error generating embeddings for visitors:', error);
      throw new HttpException(
        'Unable to generate embeddings for visitors at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('/:id/visitors/datastore')
  async listCustomDataForVisitors(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('page_size') pageSize?: number,
    @Query('page') page?: number,
    @Query('type') type?: DataStoreType,
  ) {
    try {
      return this.dataStoreService.listDataStoreItemsInKnowledgebaseForVisitors(
        id,
        pageSize || 10,
        type,
        page,
      );
    } catch (error) {
      this.logger.error('Error fetching custom data for visitors:', error);
      throw new HttpException(
        'Unable to fetch custom data for visitors at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/:id/leads')
  async getLeadsData(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('page_size') pageSize?: number,
    @Query('sortType') sort?: number,
    @Query('search') searchQuery?: string,
  ) {
    try {
      const { user } = req;
      return await this.kbService.getLeadGenerationData(
        user,
        id,
        pageSize || 10,
        page,
        sort || -1,
        searchQuery,
      );
    } catch (error) {
      this.logger.error('Error fetching leads data:', error);
      throw new HttpException(
        'Unable to fetch leads data at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('/chatbot-enabled/:id')
  async updateChatbotEnabled(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: { isChatbotEnabled: boolean },
  ) {
    const { user } = req;
    try {
      return this.knowledgebasedbService.updateKnowledgebaseChatbotEnabled(
        user,
        id,
        data.isChatbotEnabled,
      );
    } catch (error) {
      this.logger.error('Error updating chatbot enabled status:', error);
      throw new HttpException(
        'Unable to update chatbot status at the moment, please try again later',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
