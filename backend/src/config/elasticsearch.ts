/**
 * Elasticsearch 配置和连接管理
 * Elasticsearch Configuration and Connection Management
 *
 * @description 管理 Elasticsearch 客户端连接和全文搜索相关操作
 *              Manages ES client connection and full-text search operations
 * @module config/elasticsearch
 */

import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Elasticsearch 客户端实例
 * 用于：全文搜索、商品搜索、自动补全、搜索建议
 */
export const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  maxRetries: 3,
  requestTimeout: 30000,
  sniffOnStart: false,
  sniffInterval: false,
});

/**
 * 连接 Elasticsearch
 * Connect to Elasticsearch
 */
export async function connectElasticsearch(): Promise<void> {
  try {
    const health = await elasticsearchClient.cluster.health();
    console.log(`✅ Elasticsearch connected / ES 已连接 (status: ${health.status})`);
  } catch (error) {
    console.error('❌ Elasticsearch connection failed / ES 连接失败:', error);
    throw error;
  }
}

/**
 * 断开 Elasticsearch 连接
 * Disconnect Elasticsearch
 */
export async function disconnectElasticsearch(): Promise<void> {
  try {
    await elasticsearchClient.close();
    console.log('Elasticsearch disconnected / ES 已断开');
  } catch (error) {
    console.error('Error disconnecting ES / 断开 ES 连接时出错:', error);
  }
}

// ============================================================
// Elasticsearch 索引配置
// ============================================================

/**
 * 商品索引映射配置 (Product Index Mapping)
 * 定义商品在 ES 中的字段类型和分析器
 */
export const PRODUCT_INDEX_CONFIG = {
  index: 'products',
  settings: {
    analysis: {
      analyzer: {
        // 中文+英文混合分析器 / Chinese-English mixed analyzer
        cjk_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'cjk_width', 'cjk_bigram'],
        },
        // 自动补全分析器 / Autocomplete analyzer
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'autocomplete_tokenizer',
          filter: ['lowercase'],
        },
      },
      tokenizer: {
        autocomplete_tokenizer: {
          type: 'edge_ngram',
          min_gram: 1,
          max_gram: 20,
          token_chars: ['letter', 'digit'],
        },
      },
    },
    number_of_shards: 3,
    number_of_replicas: 1,
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      sku: { type: 'keyword' },
      name: {
        type: 'text',
        analyzer: 'cjk_analyzer',
        fields: {
          keyword: { type: 'keyword' },
          autocomplete: {
            type: 'text',
            analyzer: 'autocomplete_analyzer',
            search_analyzer: 'standard',
          },
        },
      },
      short_description: { type: 'text', analyzer: 'cjk_analyzer' },
      category_id: { type: 'keyword' },
      category_name: {
        type: 'text',
        analyzer: 'cjk_analyzer',
        fields: { keyword: { type: 'keyword' } },
      },
      brand_id: { type: 'keyword' },
      brand_name: { type: 'keyword' },
      price: { type: 'double' },
      original_price: { type: 'double' },
      discount_percentage: { type: 'integer' },
      status: { type: 'keyword' },
      is_featured: { type: 'boolean' },
      is_new: { type: 'boolean' },
      is_bestseller: { type: 'boolean' },
      is_on_sale: { type: 'boolean' },
      rating_average: { type: 'double' },
      rating_count: { type: 'integer' },
      sold_count: { type: 'integer' },
      view_count: { type: 'integer' },
      available_stock: { type: 'integer' },
      tags: { type: 'keyword' },
      images: {
        type: 'nested',
        properties: {
          url: { type: 'keyword' },
          is_primary: { type: 'boolean' },
        },
      },
      created_at: { type: 'date' },
    },
  },
};

/**
 * 创建商品索引
 * Create product index
 */
export async function createProductIndex(): Promise<void> {
  const { index } = PRODUCT_INDEX_CONFIG;

  // 检查索引是否已存在
  const exists = await elasticsearchClient.indices.exists({ index });

  if (!exists) {
    await elasticsearchClient.indices.create({
      index,
      settings: PRODUCT_INDEX_CONFIG.settings,
      mappings: PRODUCT_INDEX_CONFIG.mappings,
    });
    console.log(`✅ Elasticsearch index "${index}" created / ES 索引已创建`);
  }
}

/**
 * 删除商品索引
 * Delete product index
 */
export async function deleteProductIndex(): Promise<void> {
  try {
    await elasticsearchClient.indices.delete({ index: PRODUCT_INDEX_CONFIG.index });
    console.log(`Elasticsearch index "${PRODUCT_INDEX_CONFIG.index}" deleted / ES 索引已删除`);
  } catch (error) {
    if ((error as any).statusCode !== 404) {
      throw error;
    }
  }
}

/**
 * 重建索引（删除后重建）
 * Rebuild index
 */
export async function rebuildProductIndex(): Promise<void> {
  await deleteProductIndex();
  await createProductIndex();
}

/**
 * 索引商品文档
 * Index a product document
 */
export async function indexProduct(product: any): Promise<void> {
  await elasticsearchClient.index({
    index: PRODUCT_INDEX_CONFIG.index,
    id: product.id,
    body: product,
    refresh: 'wait_for',
  });
}

/**
 * 批量索引商品
 * Bulk index products
 */
export async function bulkIndexProducts(products: any[]): Promise<void> {
  const body = products.flatMap((product) => [
    { index: { _index: PRODUCT_INDEX_CONFIG.index, _id: product.id } },
    product,
  ]);

  const { body: bulkBody } = await elasticsearchClient.bulk({
    refresh: 'wait_for',
    body,
  });

  if (bulkBody.errors) {
    console.warn('Some products failed to index / 部分商品索引失败');
  }
}

/**
 * 从 ES 删除商品
 * Delete product from ES
 */
export async function deleteProductFromIndex(productId: string): Promise<void> {
  try {
    await elasticsearchClient.delete({
      index: PRODUCT_INDEX_CONFIG.index,
      id: productId,
    });
  } catch (error) {
    if ((error as any).statusCode !== 404) {
      throw error;
    }
  }
}
