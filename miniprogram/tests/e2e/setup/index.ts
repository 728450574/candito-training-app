// index.ts — setup 模块统一出口（barrel）
//
// 用例可从单一入口引入所需工具：
//   import { launchAutomator, initCloudBase, loadFixture, resetStorage } from '../setup'

export * from './automator'
export * from './cloudbase'
export * from './fixtures'
export * from './reset'
