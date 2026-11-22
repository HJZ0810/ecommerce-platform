/**
 * 搜索控制器 / Search Controller
 * @description 处理 Elasticsearch 全文搜索、自动补全、搜索建议 API
 * @module controllers/search
 */

import { Request, Response, NextFunction } from 'express';
import { elasticsearchClient, PRODUCT_INDEX_CONFIG } from '@/config/elasticsearch.js';
import { cacheService } from '@/config/redis.js';
import { query } from '@/config/database.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';

/**
 * 全文搜索商品 / Full-text search products
 * @route GET /api/v1/search
 * @access Public
 */
export const searchProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q, category_id, brand_id, min_price, max_price, page = '1', limit = '24' } = req.query as any;
  const from = (parseInt(page) - 1) * parseInt(limit);

  const mustClauses: any[] = [
    {
      multi_match: {
        query: q,
        fields: ['name^3', 'name.autocomplete^2', 'short_description', 'category_name^2', 'brand_name', 'tags'],
        fuzziness: 'AUTO',
        operator: 'and',
      },
    },
  ];

  const filterClauses: any[] = [{ term: { status: 'active' } }];

  if (category_id) filterClauses.push({ term: { category_id } });
  if (brand_id) filterClauses.push({ term: { brand_id } });
  if (min_price) filterClauses.push({ range: { price: { gte: parseFloat(min_price) } } });
  if (max_price) filterClauses.push({ range: { price: { lte: parseFloat(max_price) } } });

  try {
    const { body } = await elasticsearchClient.search({
      index: PRODUCT_INDEX_CONFIG.index,
      body: {
        from, size: parseInt(limit),
        query: { bool: { must: mustClauses, filter: filterClauses } },
        sort: [{ _score: { order: 'desc' } }, { sold_count: { order: 'desc' } }],
        highlight: {
          fields: {
            name: { fragment_size: 100 },
            short_description: { fragment_size: 100 },
          },
        },
      },
    });

    const hits = (body.hits as any).hits;
    const total = (body.hits as any).total.value;

    if (req.user?.id) {
      await query('INSERT INTO search_history (user_id, query, result_count) VALUES ($1, $2, $3)', [req.user.id, q, total]);
    }

    res.json({
      success: true,
      data: {
        products: hits.map((hit: any) => ({ ...hit._source, _score: hit._score, highlight: hit.highlight })),
        total, page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.warn('Elasticsearch search failed, falling back to database:', error);

    const dbResult = await query(
      `SELECT p.id, p.name, p.slug, p.price, p.original_price,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
       FROM products p
       WHERE p.deleted_at IS NULL AND p.status = 'active'
       AND (p.name ILIKE $1 OR p.short_description ILIKE $1)
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, parseInt(limit), from]
    );

    res.json({
      success: true,
      data: { products: dbResult.rows, total: dbResult.rows.length, page: parseInt(page), total_pages: 1 },
    });
  }
});

/**
 * 搜索自动补全 / Search autocomplete
 * @route GET /api/v1/search/autocomplete
 * @access Public
 */
export const autocomplete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query as any;

  if (!q || q.length < 1) {
    res.json({ success: true, data: [] });
    return;
  }

  const cacheKey = `search:autocomplete:${q}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  try {
    const { body } = await elasticsearchClient.search({
      index: PRODUCT_INDEX_CONFIG.index,
      body: {
        size: 10,
        _source: ['name', 'slug', 'category_name', 'brand_name'],
        query: {
          bool: {
            must: [{ match_phrase_prefix: { 'name.autocomplete': { query: q, max_expansions: 10 } } }],
            filter: [{ term: { status: 'active' } }],
          },
        },
      },
    });

    const results = (body.hits as any).hits.map((hit: any) => ({
      name: hit._source.name,
      slug: hit._source.slug,
      category: hit._source.category_name,
      brand: hit._source.brand_name,
    }));

    await cacheService.set(cacheKey, results, 300);
    res.json({ success: true, data: results });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

/**
 * 获取热门搜索 / Get trending searches
 * @route GET /api/v1/search/trending
 * @access Public
 */
export const getTrendingSearches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT keyword, search_count FROM search_suggestions
     WHERE is_trending = TRUE ORDER BY search_count DESC LIMIT 10`
  );

  res.json({ success: true, data: result.rows.map((row: any) => row.keyword) });
});

/**
 * 获取用户搜索建议 / Get user search suggestions
 * @route GET /api/v1/search/suggestions
 * @access Private
 */
export const getSearchSuggestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const result = await query(
    `SELECT DISTINCT ON (query) query, created_at
     FROM search_history WHERE user_id = $1
     ORDER BY query, created_at DESC LIMIT 10`,
    [userId]
  );

  res.json({ success: true, data: result.rows.map((row: any) => row.query) });
});

export { searchProducts, autocomplete, getTrendingSearches, getSearchSuggestions };
