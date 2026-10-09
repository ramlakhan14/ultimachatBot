import { IsEnum, IsNumber, IsNotEmpty, IsString } from 'class-validator';

export class EditThresholdEmailDto {
  @IsString({ message: '_id must be a string' })
  @IsNotEmpty({ message: '_id is required' })
  _id: string;

  @IsEnum(['Value', 'Percentage'], {
    message: 'limitType must be either "Value" or "Percentage"',
  })
  @IsNotEmpty({ message: 'limitType is required' })
  limitType: 'Value' | 'Percentage';

  @IsNumber({}, { message: 'limitValue must be a number' })
  @IsNotEmpty({ message: 'limitValue is required' })
  limitValue: number;
}
