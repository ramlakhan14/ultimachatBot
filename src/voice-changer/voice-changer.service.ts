import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CryptoService } from '../campaign/campaign-utils/crypto.service';
import { MONGODB } from '../common/mongo/mongo.module';
import { Db } from 'mongodb';
import axios from 'axios';
import { KeyDataDto } from './keydata.dto';
// import * as mm from 'music-metadata';

@Injectable()
export class VoiceChangerService {
  private logger = new Logger(VoiceChangerService.name);
  private readonly baseUrl = 'https://api.elevenlabs.io';
  constructor(@Inject(MONGODB) private db: Db) {}

  async elevenLabsKeyHandler(userId: string, data: KeyDataDto) {
    try {
      const { elevenLabsAPIKey } = data;
      this.logger.log('Elevenlabs key is ', elevenLabsAPIKey);

      // verify the key by making a test request
      await this.apiRequest('get', '/v1/voices', elevenLabsAPIKey);

      const encryptedElevenLabsApiKey =
        CryptoService.encryptPasskey(elevenLabsAPIKey);

      await this.db.collection('campaignVoiceServerConfig').updateOne(
        { userId },
        {
          $set: {
            elevenLabsAPIKey: encryptedElevenLabsApiKey,
          },
        },
      );

      return 'Key Added Successfully';
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async getelevenLabsAPIKey(userId: string) {
    try {
      const key = await this.getElevenLabsKey(userId);

      return key;
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  // async voiceChangingWithAIEffect(userId: string, data: any) {
  //   try {
  //     const key = await this.getElevenLabsKey(userId);
  //     const decryptedApiKey = key;

  //     const response = await axios.post(
  //       `${this.baseUrl}/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128`,
  //       data,
  //       {
  //         headers: {
  //           'xi-api-key': decryptedApiKey,
  //         },
  //         maxBodyLength: Infinity,
  //         responseType: 'arraybuffer',
  //       },
  //     );
  //   } catch (error) {
  //     throw new HttpException(error.message, error.status);
  //   }
  // }

  async getVoiceListing(userId: string) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);

      this.logger.debug(`Fetching voice listing for user ${userId}`);

      return await this.apiRequest('get', '/v1/voices', apiKey);
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async createProfessionalVoiceClone(userId: string, data: any) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);
      const res = await this.requestHandlerToCreatePVC(apiKey, data);
      const voiceId = res.voice_id;
      const addVoiceSampleData = await this.requestHandlerToAddVoiceSample(
        apiKey,
        voiceId,
        data.files,
      );
      return res;
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async getProfessionalVoiceListing(userId: string) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);
      this.logger.debug(`Fetching PVC listing for user ${userId}`);
      const response = await this.apiRequest('get', '/v2/voices', apiKey);
      // Assuming ElevenLabs returns something like { voices: [...] }
      const voices = response?.voices || [];

      // Extract only specific fields from each voice object
      const filteredVoices = voices.map((voice) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        samples: voice.samples,
        category: voice.category,
        description: voice.description,
      }));

      return filteredVoices;
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async requestHandlerToCreatePVC(decryptedApiKey: string, data: any) {
    try {
      return await this.apiRequest('post', '/v1/voices/pvc', decryptedApiKey, data);
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async requestHandlerToAddVoiceSample(
    decryptedApiKey: string,
    voiceId: string,
    file: any,
  ) {
    try {
      return await this.apiRequest(
        'post',
        `/v1/voices/${voiceId}/samples`,
        decryptedApiKey,
        file,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async getVoiceSettings(userId: string) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);

      this.logger.debug(`Fetching voice settings for user ${userId}`);

      return await this.apiRequest(
        'get',
        '/v1/voices/settings/default',
        apiKey,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  private async getElevenLabsKey(userId: string): Promise<string> {
    const userData = await this.db
      .collection('campaignVoiceServerConfig')
      .findOne({ userId: userId }, { projection: { elevenLabsAPIKey: 1 } });
    if (!userData || !userData.elevenLabsAPIKey) {
      throw new BadRequestException('ElevenLabs Key Is not there');
    }
    return CryptoService.decryptPasskey(userData.elevenLabsAPIKey);
  }

  // 🔹 Centralized API request helper
  private async apiRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    apiKey: string,
    data?: any,
    responseType?: any,
  ) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: { 'xi-api-key': apiKey },
        data,
        responseType,
        maxBodyLength: Infinity,
      });
      return response.data;
    } catch (error) {
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.detail?.message ||
        error.response?.data?.message ||
        error.message ||
        'API Request Failed';

      this.logger.error(
        `API Request failed: [${method.toUpperCase()}] ${endpoint} — ${message}`,
        error.stack,
      );
      throw new HttpException(message, status);
    }
  }

  // async uploadAudio(file) {
  //   try {
  //     if (!file) {
  //       throw new BadRequestException('File not provided');
  //     }

  //     // Check duration using music-metadata
  //     const metadata = await mm.parseFile(file.path);
  //     const durationInSeconds = metadata.format.duration ?? 0;

  //     // Convert seconds to minutes
  //     const durationInMinutes = durationInSeconds / 60;

  //     if (durationInMinutes < 30 || durationInMinutes > 120) {
  //       throw new BadRequestException(
  //         `Audio length must be between 30 minutes and 2 hours. Provided: ${Math.round(
  //           durationInMinutes,
  //         )} minutes.`,
  //       );
  //     }

  //     return {
  //       message: 'File uploaded successfully',
  //       fileName: file.filename,
  //       duration: `${Math.round(durationInMinutes)} minutes`,
  //     };
  //   } catch (error) {
  //     throw new BadGatewayException(error.message, error.status);
  //   }
  // }

  async requestManualPVCVerification(
    userId: string,
    voiceId: string,
    file: any,
  ) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);
      return await this.apiRequest(
        'post',
        `/v1/voices/pvc/${voiceId}/verification`,
        apiKey,
        { files: file },
      );
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async getPVCVeirificationCaptcha(userId: string, voiceId: string) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);
      return await this.apiRequest(
        'get',
        `/v1/voices/pvc/${voiceId}/captcha`,
        apiKey,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async verifyPVCVerificationCaptcha(userId: string, voiceId: string) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);
      return await this.apiRequest(
        'post',
        `/v1/voices/pvc/${voiceId}/captcha`,
        apiKey,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async getPVCVoiceSamplesAudio(
    userId: string,
    voiceId: string,
    sampleId: string,
    remove_background_noise: boolean,
  ) {
    try {
      const apiKey = await this.getElevenLabsKey(userId);
      return await this.apiRequest(
        'get',
        `/v1/voices/pvc/${voiceId}/samples/${sampleId}/audio?remove_background_noise=${remove_background_noise}`,
        apiKey,
      );
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }
}
