import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { EmailTemplateService } from './email.service';
import { Roles } from '../auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
import { RequestWithUser } from '../common/@types/nest.types';
import { Response } from 'express';

@Controller('emailTemplate')
export class EmailTemplateController {
  constructor(private emaiTemplateService: EmailTemplateService) {}

  @Roles(Role.Admin)
  @Get('/getTemplates')
  async getTemplates(@Req() req: RequestWithUser, @Res() res: Response) {
    const { user } = req;
    const getAllTemplates = await this.emaiTemplateService.getAllEmailTemplates(
      user,
    );

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Email Templates Fetched Successfully',
      getAllTemplates,
    });
  }

  @Roles(Role.Admin)
  @Put('/updateEmailTemplates')
  async updateTemplates(
    @Req() req: RequestWithUser,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const { user } = req;

    await this.emaiTemplateService.updateTemplateData(user, body);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Email Templates Updated Successfully',
    });
  }
}
