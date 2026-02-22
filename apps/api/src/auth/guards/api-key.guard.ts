import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API Key is required');
    }

    const apiKeysConfig = this.configService.get<string>('API_KEYS', '');
    const validApiKeys = apiKeysConfig
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);

    if (validApiKeys.length === 0) {
      throw new UnauthorizedException('API Keys not configured');
    }

    if (!validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid API Key');
    }

    request.user = { apiKey, source: 'shop' };
    return true;
  }
}
