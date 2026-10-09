//create dynamic tools and their functionality

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class ToolCallHanlder {
  constructor() {}

  async checkBookingAppoitment(params) {
    try {
      const { orderId } = params;

      if (orderId) {
        return { status: 'Shipped', estimatedDelivery: '2025-03-10' };
      } else {
        return { status: 'Pending', estimatedDelivery: 'TBD' };
      }
    } catch (error) {
      throw new HttpException(
        'Tool call parameter error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
