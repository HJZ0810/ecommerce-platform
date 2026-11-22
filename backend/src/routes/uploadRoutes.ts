/**
 * 文件上传路由 / Upload Routes
 * @description 定义图片上传相关的 API 端点
 * @module routes/uploadRoutes
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('只支持图片格式 (JPG, PNG, WebP, GIF) / Only image formats supported', 400, true, 'INVALID_FILE_TYPE'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

/**
 * @route POST /api/v1/upload/image
 * @summary 上传单张图片 / Upload single image
 * @access Private (Admin)
 */
router.post(
  '/image',
  authenticate,
  authorize('admin', 'super_admin'),
  upload.single('image'),
  errorAsyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('未上传文件 / No file uploaded', 400, true, 'NO_FILES');
    }

    res.status(201).json({
      success: true,
      data: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  })
);

/**
 * @route POST /api/v1/upload/images
 * @summary 批量上传图片 / Upload multiple images
 * @access Private (Admin)
 */
router.post(
  '/images',
  authenticate,
  authorize('admin', 'super_admin'),
  upload.array('images', 10),
  errorAsyncHandler(async (req: Request, res: Response) => {
    const files = (req as any).files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('未上传文件 / No files uploaded', 400, true, 'NO_FILES');
    }

    const results = files.map((file: Express.Multer.File) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(201).json({ success: true, data: results });
  })
);

export default router;
