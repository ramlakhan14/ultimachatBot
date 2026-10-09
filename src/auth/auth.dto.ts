import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDTO {
  @IsNotEmpty()
  token: string;
}

export class AdminLoginDTO {
  @IsNotEmpty()
  id: string;
}

export class ForgotPasswordDTO {
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDTO {
  @IsNotEmpty()
  token: string;

  @IsNotEmpty()
  newPassword: string;

  @IsNotEmpty()
  confirmPassword: string;
}
