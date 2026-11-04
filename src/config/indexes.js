import { GET_DB } from '~/config/mongodb'
import { logger } from '~/utils/logger'

/**
 * Khai báo các index cho các collection
 * - createIndexes là idempotent (đã tồn tại thì bỏ qua) nên chạy an toàn mỗi lần khởi động
 * - Lỗi tạo index chỉ được log và KHÔNG làm sập server
 *
 * THÊM INDEX CHO DỰ ÁN CỦA BẠN TẠI ĐÂY, ví dụ:
 *   { collection: 'orders', indexes: [{ key: { userId: 1 }, name: 'idx_userId' }] }
 */

const INDEX_DEFINITIONS = [
  {
    collection: 'users',
    indexes: [
      { key: { email: 1 }, unique: true, name: 'uniq_email' }
    ]
  },
  {
    collection: 'refresh_tokens',
    indexes: [
      { key: { tokenHash: 1 }, unique: true, name: 'uniq_tokenHash' },
      { key: { userId: 1 }, name: 'idx_userId' },
      // TTL index: MongoDB tự động xóa document khi quá expiresAt
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_expiresAt' }
    ]
  }
]

export const CREATE_DB_INDEXES = async () => {
  const db = GET_DB()

  for (const { collection, indexes } of INDEX_DEFINITIONS) {
    try {
      const created = await db.collection(collection).createIndexes(indexes)
      logger.info(`[DB Indexes] ${collection}: ${created.numIndexesAfter ?? 'ok'} indexes ensured`)
    } catch (error) {
      logger.error(`[DB Indexes] FAILED on ${collection}:`, error?.message || error)
    }
  }
}
