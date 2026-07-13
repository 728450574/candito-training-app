"use strict";
// 身体数据 Store — TS 单例模块
// 由原 H5 Pinia store `candito-v4-training-app/src/stores/bodyMetricStore.ts` 1:1 迁移。
// 业务逻辑（CRUD、按日期排序、范围查询）逐行等价，仅将 Vue ref 改为命令式状态 + 订阅通知，
// 并将 localStorage 同步 IO 改为通过 storageManager 抽象的异步 Promise IO。
//
// Storage key（与原 H5 一致）：
//   - candito_metrics — 全部身体数据（BodyMetric[]）
Object.defineProperty(exports, "__esModule", { value: true });
exports.bodyMetricStore = void 0;
const storageManager_1 = require("../utils/storage/storageManager");
const STORAGE_KEY = 'candito_metrics';
class BodyMetricStore {
    constructor() {
        this.metrics = [];
        this.listeners = [];
    }
    // ---------- 订阅模式 ----------
    subscribe(fn) {
        this.listeners.push(fn);
        return () => {
            this.listeners = this.listeners.filter((f) => f !== fn);
        };
    }
    notify() {
        this.listeners.forEach((fn) => fn());
    }
    // ---------- 状态访问（浅拷贝避免外部直接修改） ----------
    getMetrics() {
        return [...this.metrics];
    }
    // ---------- 持久化 ----------
    async load() {
        try {
            const metrics = await storageManager_1.storageManager.getActiveAdapter().get(STORAGE_KEY);
            this.metrics = metrics ? metrics : [];
        }
        catch (_a) {
            this.metrics = [];
        }
        this.notify();
    }
    async save() {
        try {
            await storageManager_1.storageManager.getActiveAdapter().set(STORAGE_KEY, this.metrics);
        }
        catch (_a) {
            // storage full or unavailable
        }
    }
    // ---------- actions（业务逻辑逐行等价） ----------
    /** 等价原 addMetric：按 date 查找，存在则替换，不存在则 push，save */
    addMetric(metric) {
        const existingIndex = this.metrics.findIndex((m) => m.date === metric.date);
        if (existingIndex >= 0) {
            this.metrics[existingIndex] = metric;
        }
        else {
            this.metrics.push(metric);
        }
        void this.save();
        this.notify();
    }
    /** 等价原 getLatestMetric：空数组返回 undefined；否则按 date 降序取首个（拷贝后排序，不改原数组） */
    getLatestMetric() {
        if (this.metrics.length === 0) {
            return undefined;
        }
        return [...this.metrics].sort((a, b) => b.date.localeCompare(a.date))[0];
    }
    /** 等价原 getMetricsInRange：过滤 date 在 [startDate, endDate] 内的记录 */
    getMetricsInRange(startDate, endDate) {
        return this.metrics.filter((m) => m.date >= startDate && m.date <= endDate);
    }
    /** 等价原 deleteMetric：按 id 过滤删除，save */
    deleteMetric(id) {
        this.metrics = this.metrics.filter((m) => m.id !== id);
        void this.save();
        this.notify();
    }
}
exports.bodyMetricStore = new BodyMetricStore();
