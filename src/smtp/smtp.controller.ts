import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Delete,
  Query,
  Res,
  Patch,
  Param,
} from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { CreateSmtpDto } from './dto/create-smtp.dto';
import { UpdateSmtpDto } from './dto/update-smtp.dto';

@Controller('smtp')
export class SmtpController {
  constructor(private readonly smtpService: SmtpService) {}

  @Post('createSetting')
  async createSmtpSetting(
    @Body() createSmtpDto: CreateSmtpDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const result = await this.smtpService.createSmtpSetting(
      createSmtpDto,
      req.user._id.toHexString(),
    );
    return res.status(result.statusCode).json({
      statusCode: result.statusCode,
      message:
        result?.message || 'Unable to Create SMTP Setting, Please try again',
      messageId: result.data?.messageId || null,
      data: result.data || null,
    });
  }

  @Patch('editSetting/:id')
  async editSmtpSetting(
    @Body() updateSmtpDto: UpdateSmtpDto,
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const result = await this.smtpService.editSmtpSetting(
      id,
      updateSmtpDto,
      req.user._id.toHexString(),
    );
    return res.status(result.statusCode).json({
      statusCode: result.statusCode,
      message:
        result?.message || 'Unable to Update SMTP Setting, Please try again',
      messageId: result.messageId || null,
      data: result.data || null,
    });
  }

  @Get('getSetting')
  async getSmtpSetting(@Req() req: any, @Res() res: any) {
    const result = await this.smtpService.getSmtpSetting(
      req.user._id.toHexString(),
    );
    return res.status(result.statusCode).json({
      statusCode: result.statusCode,
      message:
        result?.message || 'Unable to Fetch SMTP Setting, Please try again',
      data: result.data,
    });
  }

  @Delete('deleteSetting')
  async deleteSmtpSetting(
    @Req() req: any,
    @Query('id') id: string,
    @Res() res: any,
  ) {
    const result = await this.smtpService.deleteSmtpSetting(
      req.user._id.toHexString(),
      id,
    );
    return res.status(result.statusCode).json({
      statusCode: result.statusCode,
      message:
        result?.message || 'Unable to Update SMTP Setting, Please try again',
    });
  }

  @Get('getAllSetting')
  async getAllSmtpSetting(
    @Req() req: any,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Res() res: any,
  ) {
    const result = await this.smtpService.getAllSmtpSetting(
      req.user._id.toHexString(),
      Number(page),
      Number(limit),
    );
    return res.status(result.statusCode).json({
      statusCode: result.statusCode,
      message:
        result?.message ||
        'Unable to Fetch All SMTP Settings, Please try again',
      data: result.data || null,
      pagination: result.pagination || null,
    });
  }

  @Post('sendSmtpTestEmail')
  async sendSmtpTestEmail(
    @Body() createSmtpDto: CreateSmtpDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const result = await this.smtpService.sendTestEmailToVerifySmtpConfig(
      req.user._id.toHexString(),
      createSmtpDto,
      createSmtpDto.testEmail,
    );
    return res.status(result.statusCode).json({
      statusCode: result.statusCode,
      message: result?.message || 'Unable to Send Test Email, Please try again',
      messageId: result.messageId || null,
    });
  }
}
