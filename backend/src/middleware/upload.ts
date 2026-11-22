/**
 * 文件上传中间件
 * File Upload Middleware
 *
 * @description 处理图片上传、文件验证、缩略图生成
 *              Handles image upload, file validation, thumbnail generation
 * @module middleware/upload
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { AppError } from './errorHandler.js';

/**
 * 存储配置：按日期和 UUID 组织文件
 * Storage configuration: organize files by date and UUID
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    cb(null, `${uploadDir}/products`);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

/**
 * 文件过滤器 - 只允许图片
 * File filter - only allow images
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('只支持图片格式 (JPG, PNG, WebP, GIF) / Only image formats supported', 400, true, 'INVALID_FILE_TYPE'));
  }
};

/**
 * Multer 上传实例
 * Multer upload instance
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 单文件
    files: 10, // 最多10个文件
  },
});

/**
 * 生成多尺寸缩略图
 * Generate multi-size thumbnails
 *
 * @param {string} filePath - 原始文件路径
 * @returns {Promise<{ thumbnail: string; medium: string; large: string }>} 缩略图路径
 */
export async function generateThumbnails(filePath: string): Promise<{
  thumbnail: string;
  medium: string;
  large: string;
}> {
  const basePath = filePath.replace(path.extname(filePath), '');
  const ext = path.extname(filePath);

  const sizes = [
    { name: 'thumbnail', width: 150, height: 150 },
    { name: 'medium', width: 400, height: 400 },
    { name: 'large', width: 800, height: 800 },
  ];

  const results: Record<string, string> = {};

  await Promise.all(
    sizes.map(async (size) => {
      const outputPath = `${basePath}_${size.name}${ext}`;
      await sharp(filePath)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      results[size.name] = outputPath;
    })
  );

  return results as { thumbnail: string; medium: string; large: string };
}

/**
 * 压缩并转换图片为 WebP
 * Compress and convert image to WebP
 *
 * @param {string} filePath - 原始文件路径
 * @param {number} quality - 压缩质量 (1-100)
 * @returns {Promise<string>} 转换后的文件路径
 */
export async function compressToWebP(filePath: string, quality: number = 80): Promise<string> {
  const outputPath = filePath.replace(/\.[^.]+$/, '.webp');

  await sharp(filePath)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toFile(outputPath);

  return outputPath;
}

/**
 * 获取图片元数据
 * Get image metadata
 *
 * @param {string} filePath - 文件路径
 * @returns {Promise<{ width: number; height: number; size: number }>} 元数据
 */
export async function getImageMetadata(filePath: string): Promise<{
  width: number;
  height: number;
  size: number;
}> {
  const metadata = await sharp(filePath).metadata();
  const stats = await sharp(filePath).stats();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: stats.size || 0,
  };
}
