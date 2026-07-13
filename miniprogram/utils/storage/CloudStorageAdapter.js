"use strict";
// 云端存储适配器
// 基于 CloudBase 云数据库（wx.cloud.database()），按 openid 隔离。
// 设计：单一 collection `app_data`，每条文档 { _id, key, value, _openid }，按 key 查询。
// _openid 由 CloudBase 安全规则自动注入（用户态写入时后端自动附加），此处无需手动设置。
//
// 防御性检查：CloudBase SDK 需先调用 wx.cloud.init()（Task 22 实现）。
// 初始化前调用本 adapter 任何方法均抛出明确错误 "CloudBase 未初始化"，
// 通过模块级 cloudInitialized 标记控制；Task 22 在 wx.cloud.init() 后调用 setCloudInitialized(true)。
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudStorageAdapter = void 0;
exports.setCloudInitialized = setCloudInitialized;
exports.isCloudInitialized = isCloudInitialized;
const cloud_1 = require("../../config/cloud");
const COLLECTION = cloud_1.CLOUD_COLLECTION;
/** CloudBase 是否已初始化（Task 22 调用 wx.cloud.init() 后置为 true） */
let cloudInitialized = false;
/** 标记 CloudBase 已初始化，供 app.ts 在 wx.cloud.init() 成功后调用 */
function setCloudInitialized(value) {
    cloudInitialized = value;
}
/** 查询 CloudBase 初始化状态 */
function isCloudInitialized() {
    return cloudInitialized;
}
/** 获取 db 实例，未初始化时抛出明确错误 */
function getDb() {
    if (typeof wx === 'undefined' || typeof wx.cloud === 'undefined') {
        throw new Error('CloudBase 未初始化：当前小程序未支持云开发');
    }
    // 惰性初始化：第一次调用时 init（使用 config/cloud.ts 中配置的 env）
    // 注意：wx.cloud.init 的错误是异步抛出的，try-catch 抓不住，
    // 真正的失败会在后续 db.collection().get() 时抛出，由调用方 catch
    if (!cloudInitialized) {
        wx.cloud.init({ env: cloud_1.CLOUD_ENV, traceUser: true });
        cloudInitialized = true;
    }
    return wx.cloud.database();
}
/** 转义字符串中的正则元字符，用于前缀匹配的安全构造 */
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
class CloudStorageAdapter {
    async get(key) {
        try {
            const db = getDb();
            const res = await db.collection(COLLECTION).where({ key }).limit(1).get();
            const docs = res.data;
            if (!docs || docs.length === 0) {
                return null;
            }
            return docs[0].value;
        }
        catch (e) {
            // 未初始化时 getDb 直接抛 "CloudBase 未初始化..."，原样上抛
            if (e instanceof Error && e.message.startsWith('CloudBase 未初始化')) {
                throw e;
            }
            return null;
        }
    }
    async set(key, value) {
        const db = getDb();
        const collection = db.collection(COLLECTION);
        // upsert：存在则更新，不存在则插入
        const existing = await collection.where({ key }).limit(1).get();
        const docs = existing.data;
        if (docs && docs.length > 0) {
            await collection.doc(docs[0]._id).update({ data: { value } });
        }
        else {
            await collection.add({ data: { key, value } });
        }
    }
    async remove(key) {
        const db = getDb();
        const collection = db.collection(COLLECTION);
        const existing = await collection.where({ key }).get();
        const docs = existing.data;
        if (docs && docs.length > 0) {
            for (const doc of docs) {
                await collection.doc(doc._id).remove();
            }
        }
    }
    async list(prefix) {
        try {
            const db = getDb();
            const collection = db.collection(COLLECTION);
            const regExp = db.RegExp({ regexp: '^' + escapeRegExp(prefix), options: 'i' });
            const res = await collection.where({ key: regExp }).get();
            const docs = res.data;
            return (docs || []).map((d) => d.key);
        }
        catch (e) {
            if (e instanceof Error && e.message.startsWith('CloudBase 未初始化')) {
                throw e;
            }
            return [];
        }
    }
    async clear(prefix) {
        const db = getDb();
        const collection = db.collection(COLLECTION);
        let docs;
        if (prefix) {
            const regExp = db.RegExp({ regexp: '^' + escapeRegExp(prefix), options: 'i' });
            const res = await collection.where({ key: regExp }).get();
            docs = res.data;
        }
        else {
            const res = await collection.get();
            docs = res.data;
        }
        for (const doc of docs || []) {
            await collection.doc(doc._id).remove();
        }
    }
}
exports.CloudStorageAdapter = CloudStorageAdapter;
