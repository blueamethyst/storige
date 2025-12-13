import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Cookie Guard
 * HttpOnly 쿠키에서 JWT를 추출하여 인증합니다.
 * @Public() 데코레이터가 적용된 엔드포인트는 인증을 건너뜁니다.
 */
@Injectable()
export class JwtCookieGuard extends AuthGuard('jwt-cookie') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // @Public() 데코레이터 확인
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
