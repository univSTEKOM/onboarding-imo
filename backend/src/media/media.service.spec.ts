import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from 'bun:test';
import { MediaService } from './media.service';
import { Media } from './entities/media.entity';

// Bun's `S3Client` is constructed inside the MediaService constructor. ES module
// imports are hoisted, so `mock.module('bun', ...)` cannot reliably intercept it
// here — instead we let the (harmless, network-free) constructor run and then
// swap the private `s3Client` field for a fake before exercising any method.
const mockS3File = {
  write: jest.fn(),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
};
const mockS3Client = {
  file: jest.fn(() => mockS3File),
};

describe('MediaService', () => {
  let service: MediaService;
  let repository: Repository<Media>;

  beforeEach(async () => {
    mockS3Client.file.mockClear();
    mockS3File.write.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: getRepositoryToken(Media),
          useValue: {
            findAndCount: jest.fn().mockResolvedValue([[], 0]),
            create: jest.fn((dto: Partial<Media>) => ({ ...dto })),
            save: jest.fn((entity: Partial<Media>) =>
              Promise.resolve({ id: 1, ...entity }),
            ),
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            findOneBy: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'S3_BUCKET') return 'test-bucket';
              if (key === 'APP_URL') return 'http://localhost:3000';
              return null;
            }),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    repository = module.get<Repository<Media>>(getRepositoryToken(Media));
    (service as unknown as { s3Client: typeof mockS3Client }).s3Client =
      mockS3Client;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should write to S3, persist the row and set a local view URL', async () => {
      const file = {
        originalname: 'pic.png',
        mimetype: 'image/png',
        size: 123,
        buffer: Buffer.from('bytes'),
      } as Express.Multer.File;

      const result = await service.uploadFile(file, 7);

      expect(mockS3Client.file).toHaveBeenCalled();
      expect(mockS3File.write).toHaveBeenCalledWith(file.buffer, {
        type: 'image/png',
      });
      expect(repository.save).toHaveBeenCalledTimes(2);
      expect(result.url).toBe('http://localhost:3000/api/media/1/view');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when the media is missing', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFileStream', () => {
    it('should resolve the S3 file handle for an existing media row', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        path: 'uploads/pic.png',
      });

      await service.getFileStream(1);

      expect(mockS3Client.file).toHaveBeenCalledWith('uploads/pic.png');
    });
  });

  describe('findAllMedia', () => {
    it('should filter by userId when provided', async () => {
      await service.findAllMedia(7);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 7 },
        relations: ['user'],
      });
    });

    it('should list all media when no userId is provided', async () => {
      await service.findAllMedia();
      expect(repository.find).toHaveBeenCalledWith({ relations: ['user'] });
    });
  });

  describe('findAllMediaPaginated', () => {
    it('should use default sorting (createdAt DESC)', async () => {
      await service.findAllMediaPaginated(1, 10);
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });

    it('should scope the query to a user when a userId filter is given', async () => {
      await service.findAllMediaPaginated(
        1,
        10,
        undefined,
        'filename',
        'ASC',
        7,
      );
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7 } }),
      );
    });
  });
});
