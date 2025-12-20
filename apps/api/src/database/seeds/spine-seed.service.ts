import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaperTypeEntity } from '../../products/entities/paper-type.entity';
import { BindingTypeEntity } from '../../products/entities/binding-type.entity';

@Injectable()
export class SpineSeedService implements OnModuleInit {
  private readonly logger = new Logger(SpineSeedService.name);

  constructor(
    @InjectRepository(PaperTypeEntity)
    private readonly paperTypeRepo: Repository<PaperTypeEntity>,
    @InjectRepository(BindingTypeEntity)
    private readonly bindingTypeRepo: Repository<BindingTypeEntity>,
  ) {}

  async onModuleInit() {
    await this.seedPaperTypes();
    await this.seedBindingTypes();
  }

  private async seedPaperTypes() {
    const paperTypes = [
      // 본문용 (body)
      { code: 'mojo_70g', name: '모조지 70g', thickness: 0.09, category: 'body', sortOrder: 1 },
      { code: 'mojo_80g', name: '모조지 80g', thickness: 0.10, category: 'body', sortOrder: 2 },
      { code: 'seokji_70g', name: '서적지 70g', thickness: 0.10, category: 'body', sortOrder: 3 },
      { code: 'newsprint_45g', name: '신문지 45g', thickness: 0.06, category: 'body', sortOrder: 4 },
      // 표지용 (cover)
      { code: 'art_200g', name: '아트지 200g', thickness: 0.18, category: 'cover', sortOrder: 10 },
      { code: 'matte_200g', name: '매트지 200g', thickness: 0.20, category: 'cover', sortOrder: 11 },
      { code: 'card_300g', name: '카드지 300g', thickness: 0.35, category: 'cover', sortOrder: 12 },
      { code: 'kraft_120g', name: '크라프트지 120g', thickness: 0.16, category: 'cover', sortOrder: 13 },
    ];

    for (const data of paperTypes) {
      const existing = await this.paperTypeRepo.findOne({
        where: { code: data.code },
      });

      if (!existing) {
        const entity = this.paperTypeRepo.create(data);
        await this.paperTypeRepo.save(entity);
        this.logger.log(`Paper type created: ${data.name} (${data.code})`);
      }
    }

    this.logger.log('Paper types seed completed');
  }

  private async seedBindingTypes() {
    const bindingTypes: Array<{
      code: string;
      name: string;
      margin: number;
      minPages?: number;
      maxPages?: number;
      pageMultiple?: number;
      sortOrder: number;
    }> = [
      {
        code: 'perfect',
        name: '무선제본',
        margin: 0.5,
        minPages: 32,
        sortOrder: 1,
      },
      {
        code: 'saddle',
        name: '중철제본',
        margin: 0.3,
        maxPages: 64,
        pageMultiple: 4,
        sortOrder: 2,
      },
      {
        code: 'spiral',
        name: '스프링제본',
        margin: 3.0,
        sortOrder: 3,
      },
      {
        code: 'hardcover',
        name: '양장제본',
        margin: 2.0,
        sortOrder: 4,
      },
    ];

    for (const data of bindingTypes) {
      const existing = await this.bindingTypeRepo.findOne({
        where: { code: data.code },
      });

      if (!existing) {
        const entity = this.bindingTypeRepo.create(data);
        await this.bindingTypeRepo.save(entity);
        this.logger.log(`Binding type created: ${data.name} (${data.code})`);
      }
    }

    this.logger.log('Binding types seed completed');
  }
}
