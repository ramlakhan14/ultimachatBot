import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { VoiceChangerService } from './voice-changer.service';
import { ResponseUtil } from '../utils/response.util';
import { RequestWithUser } from '../common/@types/nest.types';
import { KeyDataDto } from './keydata.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
// import * as mm from 'music-metadata';

@Controller('voice-changer')
export class VoiceChangerController {
  constructor(private readonly voiceChangerService: VoiceChangerService) {}

  // @Post('keysave')
  // async keyDataSave(@Req() req: RequestWithUser, @Body() payload: KeyDataDto) {
  //   try {
  //     const userId = req.user._id.toString();
  //     const email = req.user.email;
  //     const result = await this.voiceChangerService.elevenLabsKeyHandler(
  //       userId,
  //       payload,
  //     );
  //     return ResponseUtil.success(result, 'Elevenlabs key added successfully');
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message || 'Internal Server Error',
  //       error.status || 500,
  //     );
  //   }
  // }

  // @Get('/key')
  // async getElebenLabsKey(@Req() req: RequestWithUser) {
  //   try {
  //     const userId = req.user._id.toHexString();
  //     const result = await this.voiceChangerService.getelevenLabsAPIKey(userId);
  //     return ResponseUtil.success(result, 'Key Fetched Successfully');
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message || 'Internal Server Errror',
  //       error.status || 500,
  //     );
  //   }
  // }

  // @Post('upload')
  // @UseInterceptors(
  //   FileInterceptor('file', {
  //     storage: diskStorage({
  //       destination: './uploads/audio',
  //       filename: (req, file, cb) => {
  //         const uniqueName = `${Date.now()}${extname(file.originalname)}`;
  //         cb(null, uniqueName);
  //       },
  //     }),
  //     fileFilter: (req, file, cb) => {
  //       if (!file.mimetype.startsWith('audio/')) {
  //         return cb(
  //           new BadRequestException('Only audio files allowed!'),
  //           false,
  //         );
  //       }
  //       cb(null, true);
  //     },
  //     limits: {
  //       fileSize: 1024 * 1024 * 1024, // 1 GB max size (adjust based on needs)
  //     },
  //   }),
  // )

  // async uploadAudio(@UploadedFile() file: Express.Multer.File) {
  //   try {
  //     const result = await this.voiceChangerService.uploadAudio(file);
  //     return ResponseUtil.success(result, 'File uploaded successfully');
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message || 'Internal Server Error',
  //       error.status || 500,
  //     );
  //   }
  // }
  // @Post('/cloning')
  // async voiceCloningFunction(
  //   @Req() req: RequestWithUser,
  //   @Body() payload: any,
  // ) {
  //   try {
  //     const userId = req.user._id.toString();
  //     const email = req.user.email;
  //     const result = await this.voiceChangerService.voiceChangingWithAIEffect(
  //       userId,
  //       payload,
  //     );
  //     return ResponseUtil.success(
  //       result,
  //       'Outbound settings updated successfully',
  //     );
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message || 'Internal Server Error',
  //       error.status || 500,
  //     );
  //   }
  // }
  // @Post('/voice-list')
  // async voiceListing(@Req() req: RequestWithUser, @Body() payload: any) {
  //   try {
  //     const userId = req.user._id.toString();
  //     const result = await this.voiceChangerService.getVoiceListing(userId);
  //     return ResponseUtil.success(result, 'Voice listing successful');
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message || 'Internal Server Error',
  //       error.status || 500,
  //     );
  //   }
  // }

  // @Post('/create-pvc')
  // async createPVC(@Req() req: RequestWithUser, @Body() payload: any) {
  //   try {
  //     const userId = req.user._id.toString();
  //     const result =
  //       await this.voiceChangerService.createProfessionalVoiceClone(
  //         userId,
  //         payload,
  //       );
  //     return ResponseUtil.success(result, 'PVC created successfully');
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message || 'Internal Server Error',
  //       error.status || 500,
  //     );
  //   }
  // }

  @Get('/pvc-list')
  async pvcListing(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toString();
      const result = await this.voiceChangerService.getProfessionalVoiceListing(
        userId,
      );
      return ResponseUtil.success(result, 'PVC listing successful');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Internal Server Error',
        error.status || 500,
      );
    }
  }

  // @Get('/voice-settings')
  // async getVoiceSettings(@Req() req: RequestWithUser) {
  //   try {
  //     const userId = req.user._id.toString();
  //     const result = await this.voiceChangerService.getVoiceSettings(userId);
  //     return ResponseUtil.success(
  //       result,
  //       'Voice settings fetched successfully',
  //     );
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message || 'Internal Server Error',
  //       error.status || 500,
  //     );
  //   }
  // }
}
