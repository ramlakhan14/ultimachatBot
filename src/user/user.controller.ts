import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { RequestWithUser } from '../common/@types/nest.types';
import { UserService } from './user.service';
import { OpenApiKeyDto } from './user.dto';
import { Response } from 'express';
import { Public } from '../auth/guards/public.guard';
import { ChangePasswordDTO } from '../user/user.dto';
import { error } from 'console';

@Controller('user')
export class UsersController {
  constructor(private userService: UserService) {}

  @Get('/profile')
  async getProfile(@Req() req: RequestWithUser) {
    const { user } = req;
    return this.userService.getUserProfile(user);
  }

  @Get('/paymentstatus')
  async userPaymentStatus(@Req() req: RequestWithUser) {
    const { user } = req;
    return this.userService.getUserPaymentStatus(user);
  }

  @Patch('/updateOpenAiKey')
  async updateOpenaiKey(
    @Req() req: RequestWithUser,
    @Body() data: OpenApiKeyDto,
    @Res() res: Response,
  ) {
    try {
      const { user } = req;
      await this.userService.updateUserOpenaiKey(user, data);
      let message = 'User Updated Successfully';
      if (data.apiKey && data.name) {
        message = 'User OpenAI Key Verified and Profile Updated Successfully';
      } else if (data.apiKey) {
        message = 'User OpenAI Key Verified and Added Successfully';
      } else if (data.name) {
        message = 'Profile Updated Successfully';
      }
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message,
      });
    } catch (err) {
      throw new HttpException(
        err.message || 'Failed to update OpenAI API key',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /* Apis for ADMIN */

  // @Roles(Role.Admin)
  // @Get('/allProfiles')
  // async getAllProfiles(
  //   @Req() req: RequestWithUser,
  //   @Query('page_size') pageSize?: number,
  //   @Query('page') page?: number,
  //   @Query('term') searchQuery?: string,
  // ) {
  //   const { user } = req;
  //   return this.userService.getAllUserProfiles(
  //     user,
  //     page,
  //     pageSize || 10,
  //     searchQuery,
  //   );
  // }

  // @Roles(Role.Admin)
  // @Get('/:id/profilePreview')
  // async getUserProfileForAdmin(@Param('id') id: string) {
  //   return this.userService.getUserDetails(id);
  // }

  // @Roles(Role.Admin)
  // @Delete('/:id/deleteUser')

  @Delete('/delete')
  async deleteUser(@Req() req: RequestWithUser, @Res() res: Response) {
    const email = req.user.email;
    const result = await this.userService.deleteUser(email);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'User Deleted Successfully',
      data: result,
    });
  }

  @Get('/recoveraccount')
  async recoverAccount(@Req() req: RequestWithUser, @Res() res: Response) {
    const email = req.user.email;
    const result = await this.userService.recoverAccount(email);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'User Account Recovered Successfully',
      data: result,
    });
  }

  @Get('/can-create-bot')
  async canCreateBot(@Req() req: RequestWithUser) {
    await this.userService.canCreateBot(req.user._id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Bot creation allowed',
      data: { allowed: true },
    };
  }

  @Patch('/changePassword')
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() data: ChangePasswordDTO,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user._id;
      const result = await this.userService.changePassword(userId, data);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: result.message,
      });
    } catch (err) {
      throw err;
    }
  }
}
