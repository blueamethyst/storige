import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '@storige/types';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@storige.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';

    // 이미 관리자가 존재하는지 확인
    const existingAdmin = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      this.logger.log(`Admin user already exists: ${adminEmail}`);
      return;
    }

    // 관리자 계정 생성
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const admin = this.userRepository.create({
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
    });

    await this.userRepository.save(admin);
    this.logger.log(`Admin user created: ${adminEmail}`);
    this.logger.log(`Default password: ${adminPassword} (change in production!)`);
  }
}
