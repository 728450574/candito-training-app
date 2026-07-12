"use strict";
// uuid.ts — UUID v4 生成（无外部依赖，替代 uuid npm 包）
// 小程序环境不支持直接 require npm 模块，故内联实现
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidv4 = uuidv4;
/**
 * 生成 RFC 4122 v4 UUID
 * 优先使用小程序 crypto.getRandomValues，回退到 Math.random
 */
function uuidv4() {
    // 小程序基础库 2.x+ 支持 crypto.getRandomValues
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        // 版本位设为 4，变体位设为 10xx
        buf[6] = (buf[6] & 0x0f) | 0x40;
        buf[8] = (buf[8] & 0x3f) | 0x80;
        const hex = [];
        buf.forEach((b) => hex.push(b.toString(16).padStart(2, '0')));
        return (hex.slice(0, 4).join('') + '-' +
            hex.slice(4, 6).join('') + '-' +
            hex.slice(6, 8).join('') + '-' +
            hex.slice(8, 10).join('') + '-' +
            hex.slice(10, 16).join(''));
    }
    // 回退：Math.random
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
