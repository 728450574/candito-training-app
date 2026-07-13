// 云开发环境配置
// 集中管理 CloudBase 云环境 ID，便于统一修改和多环境切换
//
// 使用方式：
//   import { CLOUD_ENV } from '../config/cloud'
//   wx.cloud.init({ env: CLOUD_ENV, traceUser: true })

/** CloudBase 云环境 ID（在云开发控制台 → 环境信息 中获取） */
export const CLOUD_ENV = 'tnt-lxo777jrw'

/** 数据集合名称：单一 collection 存储 app 所有数据，按 key 字段区分 */
export const CLOUD_COLLECTION = 'app_data'
