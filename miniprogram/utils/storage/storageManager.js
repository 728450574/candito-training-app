"use strict";
// 存储管理器
// 管理当前激活的存储后端（local / cloud），并提供模式切换的订阅通知。
// 默认 local 模式（避免循环依赖：storageMode 本身存本地，由 settingsStore 直接读写）。
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageManager = void 0;
const LocalStorageAdapter_1 = require("./LocalStorageAdapter");
const CloudStorageAdapter_1 = require("./CloudStorageAdapter");
class StorageManager {
    constructor() {
        this.adapter = new LocalStorageAdapter_1.LocalStorageAdapter();
        this.mode = 'local';
        this.listeners = [];
    }
    getActiveAdapter() {
        return this.adapter;
    }
    getMode() {
        return this.mode;
    }
    setMode(mode) {
        this.mode = mode;
        this.adapter = mode === 'cloud' ? new CloudStorageAdapter_1.CloudStorageAdapter() : new LocalStorageAdapter_1.LocalStorageAdapter();
        this.listeners.forEach((fn) => fn(mode));
    }
    onModeChange(fn) {
        this.listeners.push(fn);
        return () => {
            this.listeners = this.listeners.filter((f) => f !== fn);
        };
    }
}
exports.storageManager = new StorageManager();
