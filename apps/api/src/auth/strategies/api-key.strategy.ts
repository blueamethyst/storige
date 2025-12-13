import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import Strategy from 'passport-headerapikey';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private configService: ConfigService) {
    super(
      { header: 'X-API-Key', prefix: '' },
      true,
      (apiKey: string, done: (error: Error | null, data: any) => void) => {
        return this.validate(apiKey, done);
      },
    );
  }

  private validate(
    apiKey: string,
    done: (error: Error | null, data: any) => void,
  ) {
    const apiKeysConfig = this.configService.get<string>('API_KEYS', '');
    const validApiKeys = apiKeysConfig
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);

    if (validApiKeys.length === 0) {
      done(new UnauthorizedException('API Keys not configured'), null);
      return;
    }

    if (validApiKeys.includes(apiKey)) {
      done(null, { apiKey, source: 'shop' });
    } else {
      done(new UnauthorizedException('Invalid API Key'), null);
    }
  }
}
