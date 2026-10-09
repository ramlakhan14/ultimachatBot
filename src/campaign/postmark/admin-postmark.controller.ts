import { Body, Controller, Post } from '@nestjs/common';
import { AdminPostmarkService } from './admin-postmark.service';

@Controller('admin-postmark')
export class AdminPostmarkController {
  constructor(private readonly adminPostmarkService: AdminPostmarkService) {}

  @Post('send-email')
  async adminSendEmail(@Body() body: any) {
    const { sender, receiver, content, subject, emailText } = body;
    return this.adminPostmarkService.sendCampaignEmailToLeads(
      sender,
      receiver,
      content,
      subject,
      emailText,
    );
  }
}
