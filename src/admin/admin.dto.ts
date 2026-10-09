import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

export class GetPaginatedQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'page_size must be an integer' })
  @Min(1, { message: 'page_size must be at least 1' })
  page_size?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: any;

  @IsOptional()
  term?: string;
}
