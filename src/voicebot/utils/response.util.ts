import { HttpException, HttpStatus } from '@nestjs/common';

export class ResponseUtil {
  static success<T>(data: T, message = 'Success', statusCode = HttpStatus.OK) {
    return { success: true, message, statusCode, data };
  }

  static error(
    message: string,
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    error?: any,
  ): never {
    throw new HttpException(
      {
        success: false,
        message,
        error: error?.message || message,
        statusCode,
      },
      statusCode,
    );
  }

  static handleAxiosError(error: any, customMessage = 'An error occurred') {
    const errorMessage =
      error?.response?.data?.message || error?.message || customMessage;
    const statusCode =
      error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;

    throw new HttpException(
      {
        success: false,
        message: errorMessage,
        statusCode,
        error: error?.response?.data || error,
      },
      statusCode,
    );
  }
}
