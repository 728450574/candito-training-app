"use strict";
// 用户设置 Store — TS 单例模块
// 由原 H5 Pinia store `candito-v4-training-app/src/stores/settingsStore.ts` 1:1 迁移。
// 业务逻辑（默认值合并、update 合并、save）逐行等价，仅将 Vue ref 改为命令式状态 + 订阅通知，
// 并将 localStorage 同步 IO 改为 LocalStorageAdapter 异步 Promise IO。
//
// Storage key（与原 H5 一致）：
//   - candito_settings — 用户设置（UserSettings）
//
// 重要：settingsStore 始终使用 LocalStorageAdapter 直接读写，不经过 storageManager。
// 原因：storageMode 字段决定 storageManager 的后端选择，存在先有鸡还是先有蛋的依赖——
//   必须先从本地读出 storageMode，才能初始化 storageManager。故 settingsStore 直接依赖
//   LocalStorageAdapter（不 import storageManager），打破循环依赖。storageMode 始终落本地。
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsStore = void 0;
const LocalStorageAdapter_1 = require("../utils/storage/LocalStorageAdapter");
const STORAGE_KEY = 'candito_settings';
const DEFAULT_SETTINGS = {
    defaultUnit: 'kg',
    defaultRestSeconds: 90,
    weightRounding: 2.5,
    reminderEnabled: false,
    reminderTime: '08:00',
    storageMode: 'local',
};
class SettingsStore {
    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.listeners = [];
        // 直接持有 LocalStorageAdapter 实例，不经过 storageManager（避免循环依赖）
        this.localAdapter = new LocalStorageAdapter_1.LocalStorageAdapter();
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
    getSettings() {
        return { ...this.settings };
    }
    /** 返回当前存储后端模式（始终从本地读取，供 app.ts 引导 storageManager） */
    getStorageMode() {
        return this.settings.storageMode;
    }
    // ---------- 持久化（始终走 LocalStorageAdapter） ----------
    /**
     * 从本地加载设置（含 storageMode）。
     * 等价原 load：raw 存在时 { ...DEFAULT_SETTINGS, ...parsed } 合并；失败回退默认值。
     * app.ts 在 storageManager.setMode() 之前调用本方法引导存储后端。
     */
    async loadFromLocal() {
        try {
            const parsed = await this.localAdapter.get(STORAGE_KEY);
            if (parsed) {
                this.settings = { ...DEFAULT_SETTINGS, ...parsed };
            }
        }
        catch {
            this.settings = { ...DEFAULT_SETTINGS };
        }
        this.notify();
    }
    /** 等价原 load：与 loadFromLocal 等价（settingsStore 始终走本地） */
    async load() {
        await this.loadFromLocal();
    }
    /** 等价原 save：写入本地（静默忽略错误） */
    async save() {
        try {
            await this.localAdapter.set(STORAGE_KEY, this.settings);
        }
        catch {
            // storage full or unavailable — silently ignore
        }
    }
    // ---------- actions（业务逻辑逐行等价） ----------
    /** 等价原 update：合并 partial 后 save */
    update(partial) {
        this.settings = { ...this.settings, ...partial };
        void this.save();
        this.notify();
    }
}
exports.settingsStore = new SettingsStore();
