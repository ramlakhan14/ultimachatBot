import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import { RequestWithUser } from '../../common/@types/nest.types';
import { GoogleCalenderService } from './googleCalender.service';
import { CreateAppointmentDto } from './calender.dto';
import { Response } from 'express';
import { Public } from '../../auth/guards/public.guard';

@Controller('googleCalender')
export class GoogleCalenderController {
  constructor(private calenderService: GoogleCalenderService) {}

  @Post('/createDetails')
  async googleCalenderSettings(
    @Req() req: RequestWithUser,
    @Body() data: CreateAppointmentDto,
    @Res() res: Response,
  ) {
    const { user } = req;
    const result = await this.calenderService.saveSettings(user, data);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: result.message,
    });
  }

  // @Put('/:kbId/updateDetails/:id')
  // async googleCalenderUpdateSettings(
  //   @Req() req: RequestWithUser,
  //   @Body() data: CreateAppointmentDto,
  //   @Param('kbId') kbId: string,
  //   @Param('id') id: string,
  //   @Res() res: Response,
  // ) {
  //   const { user } = req;
  //   const updatedData = await this.calenderService.updateSettings(
  //     user,
  //     data,
  //     kbId,
  //     id,
  //   );
  //   return res.status(HttpStatus.OK).json({
  //     statusCode: HttpStatus.OK,
  //     message: 'Calender Settings Updated Successfully',
  //     data: updatedData,
  //   });
  // }

  @Get('/:kbId/getCalenderDetails')
  async getGoogleCalenderSettings(
    @Req() req: RequestWithUser,
    @Param('kbId') kbId: string,
    @Res() res: Response,
  ) {
    const { user } = req;
    const getSettingsData = await this.calenderService.getCalenderSettings(
      user,
      kbId,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Calender Settings Fetched Successfully',
      data: getSettingsData,
    });
  }

  @Delete('/:kbId/deleteCalenderDetails/:id')
  async deleteGoogleCalenderSettings(
    @Req() req: RequestWithUser,
    @Param('kbId') kbId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { user } = req;
    await this.calenderService.deleteCalenderData(user, kbId, id);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Calender Settings Deleted Successfully',
    });
  }

  @Public()
  @Get('auth')
  @Redirect()
  async redirectToGoogle() {
    const url = await this.calenderService.generateAuthUrl();
    return { url };
  }

  @Public()
  @Get('/oauth2callback')
  async handleAuthCallback(@Query('code') code: string, @Res() res: Response) {
    const data = await this.calenderService.handleCalenderCallback(code);
    res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'verification Completed',
      data,
    });
  }

  @Post('/revokeCalenderPermissions')
  async revokeCalenderSettings(@Body() data: any, @Res() res: Response) {
    const { kbId, token } = data;
    await this.calenderService.revokeCalenderPermissions(kbId, token);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Revoke Calender Setting Successfully',
    });
  }
}
