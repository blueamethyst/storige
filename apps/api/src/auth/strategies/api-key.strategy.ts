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
      // done(error)는 passport에서 uncaught exception → done(null, false) 사용
      done(null, false);
      return;
    }

    if (validApiKeys.includes(apiKey)) {
      done(null, { apiKey, source: 'shop' });
    } else {
      done(null, false);
    }
  }
}
