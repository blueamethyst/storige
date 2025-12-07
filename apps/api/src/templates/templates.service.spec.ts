import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { Template } from './entities/template.entity';
import { TemplateSet } from './entities/template-set.entity';
import { TemplateType } from '@storige/types';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let templateRepository: jest.Mocked<Repository<Template>>;
  let templateSetRepository: jest.Mocked<Repository<TemplateSet>>;

  const mockTemplate: Partial<Template> = {
    id: 'test-template-id',
    name: 'Test Template',
    templateCode: 'TMPL-ABCD1234',
    editCode: 'EDIT-EFGH5678',
    type: TemplateType.PAGE,
    width: 210,
    height: 297,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([mockTemplate]),
    getOne: jest.fn().mockResolvedValue(mockTemplate),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getRepositoryToken(Template),
          useValue: {
            create: jest.fn().mockReturnValue(mockTemplate),
            save: jest.fn().mockResolvedValue(mockTemplate),
            findOne: jest.fn().mockResolvedValue(mockTemplate),
            find: jest.fn().mockResolvedValue([mockTemplate]),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: getRepositoryToken(TemplateSet),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    templateRepository = module.get(getRepositoryToken(Template));
    templateSetRepository = module.get(getRepositoryToken(TemplateSet));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new template with auto-generated codes', async () => {
      const createDto = {
        name: 'New Template',
        type: TemplateType.PAGE,
        width: 210,
        height: 297,
        canvasData: '{}',
      };

      templateRepository.findOne.mockResolvedValueOnce(null); // templateCode not exists
      templateRepository.findOne.mockResolvedValueOnce(null); // editCode not exists

      const result = await service.create(createDto as any, 'user-id');

      expect(templateRepository.create).toHaveBeenCalled();
      expect(templateRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockTemplate);
    });

    it('should retry code generation if duplicate found', async () => {
      const createDto = {
        name: 'New Template',
        type: TemplateType.PAGE,
        width: 210,
        height: 297,
        canvasData: '{}',
      };

      // First templateCode check returns duplicate, second returns null
      templateRepository.findOne
        .mockResolvedValueOnce(mockTemplate as Template) // duplicate
        .mockResolvedValueOnce(null) // unique
        .mockResolvedValueOnce(null); // editCode unique

      const result = await service.create(createDto as any, 'user-id');

      expect(templateRepository.findOne).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('findAll', () => {
    it('should return all templates without filters', async () => {
      const result = await service.findAll();

      expect(templateRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual([mockTemplate]);
    });

    it('should filter by categoryId when provided', async () => {
      await service.findAll('category-id');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'template.categoryId = :categoryId',
        { categoryId: 'category-id' }
      );
    });

    it('should filter by isActive when provided', async () => {
      await service.findAll(undefined, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'template.isActive = :isActive',
        { isActive: true }
      );
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      templateRepository.findOne.mockResolvedValueOnce(mockTemplate as Template);

      const result = await service.findOne('test-template-id');

      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkEditCodeExists', () => {
    it('should return true when editCode exists', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(1);

      const result = await service.checkEditCodeExists('EDIT-EXISTING');

      expect(result).toBe(true);
    });

    it('should return false when editCode does not exist', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(0);

      const result = await service.checkEditCodeExists('EDIT-NEW');

      expect(result).toBe(false);
    });

    it('should exclude specific id when checking', async () => {
      await service.checkEditCodeExists('EDIT-CODE', 'exclude-id');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'template.id != :excludeId',
        { excludeId: 'exclude-id' }
      );
    });
  });
});
