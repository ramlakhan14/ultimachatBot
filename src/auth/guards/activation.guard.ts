import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserState } from '../types/role.enum';

@Injectable()
export class ActivationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return true;
    }

    if (user.isActive === UserState.Deleted) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Your account has been deleted. Please contact support.',
        isActive: UserState.Deleted,
      });
    }

    if (user.isActive === UserState.Inactive) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Your account is deactivated. Please contact support.',
        isActive: UserState.Inactive,
      });
    }

    return true;
  }
}
