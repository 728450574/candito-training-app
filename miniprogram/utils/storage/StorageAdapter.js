"use strict";
// 存储抽象层接口
// 统一本地存储与云端存储的访问契约，所有方法异步 Promise 返回，支持泛型。
// 业务 stores 通过 storageManager.getActiveAdapter() 获取当前实现，不直接依赖具体后端。
Object.defineProperty(exports, "__esModule", { value: true });
