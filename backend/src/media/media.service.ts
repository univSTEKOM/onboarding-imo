import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, ILike, FindOptionsWhere } from 'typeorm';
import { Media } from './entities/media.entity';
import { BaseService } from '../common/services/base.service';
import { S3Client } from 'bun';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaService extends BaseService<Media> {
  private s3Client: S3Client;

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly configService: ConfigService,
  ) {
    super(mediaRepository, 'Media', ['filename', 'mimetype']);

    this.s3Client = new S3Client({
      accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY'),
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      bucket: this.configService.get<string>('S3_BUCKET'),
      region: this.configService.get<string>('S3_REGION'),
    });
  }

  async uploadFile(file: Express.Multer.File, userId: number): Promise<Media> {
    const key = `uploads/${Date.now()}-${file.originalname}`;
    const s3File = this.s3Client.file(key);

    await s3File.write(file.buffer, {
      type: file.mimetype,
    });

    const media = this.mediaRepository.create({
      filename: file.originalname,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: key,
      userId,
    });

    const savedMedia = await this.mediaRepository.save(media);

    // Update with local view URL
    const baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    savedMedia.url = `${baseUrl}/api/media/${savedMedia.id}/view`;

    return this.mediaRepository.save(savedMedia);
  }

  async getFileStream(id: number) {
    const media = await this.findOne(id);
    return this.s3Client.file(media.path);
  }

  async findAllMediaPaginated(
    page: number,
    limit: number,
    search?: string,
    sort: string = 'createdAt',
    direction: string = 'DESC',
    userId?: number,
  ) {
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * limit;

    const findOptions: FindManyOptions<Media> = {
      skip,
      take: limit,
      order: {
        [sort]: direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      },
      relations: ['user'],
    };

    const where: FindOptionsWhere<Media> = {};
    if (userId) {
      where.userId = userId;
    }

    if (search) {
      findOptions.where = this.searchFields.map((field) => ({
        ...where,
        [field]: ILike(`%${search}%`),
      }));
    } else if (userId) {
      findOptions.where = where;
    }

    const [data, total] = await this.mediaRepository.findAndCount(findOptions);

    return {
      data,
      meta: {
        total,
        page: +currentPage,
        last_page: Math.ceil(total / limit),
      },
    };
  }

  async findAllMedia(userId?: number): Promise<Media[]> {
    if (userId) {
      return this.mediaRepository.find({
        where: { userId },
        relations: ['user'],
      });
    }
    return super.findAll(['user']);
  }

  override async findOne(id: number): Promise<Media> {
    return super.findOne(id, ['user']);
  }
}
