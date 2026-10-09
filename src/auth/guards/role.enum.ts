import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserSparse } from '../../user/user.schema';
import { Role } from '../types/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ADMINS = [process.env.SUPER_ADMIN_EMAIL];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    // if (requiredRoles.length === 0 && requiredRoles[0] === Role.User) {
    //   return true;
    // }
    // if (requiredRoles.includes(Role.Admin)) {
    //   const { user } = context.switchToHttp().getRequest();
    //   // return ADMINS.includes(user.email);
    // }
    // Get the user from the request
    const { user } = context.switchToHttp().getRequest();
    // Check if the user's role is one of the allowed roles
    return requiredRoles.some((role) => user.role === role);
  }
}

export function isAdmin(user: UserSparse) {
  return ADMINS.includes(user.email);
}
