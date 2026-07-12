"use strict";
// 周期 Store — TS 单例模块
// 由原 H5 Pinia store `candito-v4-training-app/src/stores/cycleStore.ts` 1:1 迁移。
// 业务逻辑（状态、计算属性等价方法、actions）逐行等价，仅将 Vue ref/computed 改为命令式状态 + 订阅通知，
// 并将 localStorage 同步 IO 改为通过 storageManager 抽象的异步 Promise IO。
//
// Storage key（与原 H5 一致，保证数据兼容）：
//   - candito_cycles       — 全部周期数据（Cycle[]）
//   - candito_active_cycle — 当前激活周期 ID（string）
Object.defineProperty(exports, "__esModule", { value: true });
exports.cycleStore = void 0;
const storageManager_1 = require("../utils/storage/storageManager");
const STORAGE_KEY = 'candito_cycles';
const ACTIVE_KEY = 'candito_active_cycle';
class CycleStore {
    constructor() {
        this.cycles = [];
        this.activeCycleId = null;
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
    getCycles() {
        return [...this.cycles];
    }
    getActiveCycleId() {
        return this.activeCycleId;
    }
    // ---------- 计算属性（与原 computed 逻辑等价） ----------
    /** 等价原 activeCycle computed：查找 activeCycleId 对应 cycle，若 status 为 terminated/completed 返回 null */
    getActiveCycle() {
        const cycle = this.cycles.find((c) => c.id === this.activeCycleId);
        if (!cycle)
            return null;
        if (cycle.status === 'terminated' || cycle.status === 'completed')
            return null;
        return cycle;
    }
    /** 等价原 hasActiveCycle computed */
    hasActiveCycle() {
        return this.getActiveCycle() !== null;
    }
    // ---------- 持久化 ----------
    async load() {
        try {
            const cycles = await storageManager_1.storageManager.getActiveAdapter().get(STORAGE_KEY);
            this.cycles = cycles ? cycles : [];
        }
        catch {
            this.cycles = [];
        }
        try {
            const id = await storageManager_1.storageManager.getActiveAdapter().get(ACTIVE_KEY);
            this.activeCycleId = id ? id : null;
        }
        catch {
            this.activeCycleId = null;
        }
        this.notify();
    }
    async save() {
        try {
            await storageManager_1.storageManager.getActiveAdapter().set(STORAGE_KEY, this.cycles);
        }
        catch {
            // storage full or unavailable
        }
        try {
            if (this.activeCycleId !== null) {
                await storageManager_1.storageManager.getActiveAdapter().set(ACTIVE_KEY, this.activeCycleId);
            }
            else {
                await storageManager_1.storageManager.getActiveAdapter().remove(ACTIVE_KEY);
            }
        }
        catch {
            // storage full or unavailable
        }
    }
    // ---------- actions（业务逻辑逐行等价） ----------
    /** 等价原 addCycle：push 到 cycles，设为 activeCycleId，save */
    addCycle(cycle) {
        this.cycles.push(cycle);
        this.activeCycleId = cycle.id;
        void this.save();
        this.notify();
    }
    /** 等价原 updateCycle：按 id 查找，合并 updates，save（找不到则不操作） */
    updateCycle(id, updates) {
        const index = this.cycles.findIndex((c) => c.id === id);
        if (index !== -1) {
            this.cycles[index] = { ...this.cycles[index], ...updates };
            void this.save();
            this.notify();
        }
    }
    /** 等价原 deleteCycle：过滤掉指定 id，若删除的是激活周期则清空 activeCycleId，save */
    deleteCycle(id) {
        this.cycles = this.cycles.filter((c) => c.id !== id);
        if (this.activeCycleId === id) {
            this.activeCycleId = null;
        }
        void this.save();
        this.notify();
    }
    /** 等价原 setActiveCycle：设置 activeCycleId（id 为空串时置 null），save */
    setActiveCycle(id) {
        this.activeCycleId = id || null;
        void this.save();
        this.notify();
    }
    /** 等价原 getCycleById */
    getCycleById(id) {
        return this.cycles.find((c) => c.id === id);
    }
    /** 等价原 getCompletedCycles：返回 status 为 completed 或 terminated 的周期 */
    getCompletedCycles() {
        return this.cycles.filter((c) => c.status === 'completed' || c.status === 'terminated');
    }
}
exports.cycleStore = new CycleStore();
