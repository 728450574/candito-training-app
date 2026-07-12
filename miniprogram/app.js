"use strict";
// app.ts — 小程序入口 App 实例
// 初始化 stores（settingsStore / cycleStore / recordStore / bodyMetricStore）
Object.defineProperty(exports, "__esModule", { value: true });
const settingsStore_1 = require("./stores/settingsStore");
const cycleStore_1 = require("./stores/cycleStore");
const recordStore_1 = require("./stores/recordStore");
const bodyMetricStore_1 = require("./stores/bodyMetricStore");
const storageManager_1 = require("./utils/storage/storageManager");
App({
    onLaunch() {
        // fire-and-forget：不阻塞 onLaunch，避免页面路由超时
        settingsStore_1.settingsStore.loadFromLocal().then(() => {
            storageManager_1.storageManager.setMode(settingsStore_1.settingsStore.getStorageMode());
            void cycleStore_1.cycleStore.load();
            void recordStore_1.recordStore.load();
            void bodyMetricStore_1.bodyMetricStore.load();
        }).catch(() => {
            void cycleStore_1.cycleStore.load();
            void recordStore_1.recordStore.load();
            void bodyMetricStore_1.bodyMetricStore.load();
        });
    },
    globalData: {}
});
