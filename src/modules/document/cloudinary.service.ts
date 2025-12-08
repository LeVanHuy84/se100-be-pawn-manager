import { Inject, Injectable } from '@nestjs/common';
import { v2, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import type { File as MulterFile } from 'multer';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private cloudinary: typeof v2
  ) 
  {}

  async uploadFile(
    file: MulterFile,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload returned empty result'));
          resolve(result);
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId);
  }
}
