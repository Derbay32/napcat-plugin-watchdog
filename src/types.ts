/**
 * 类型定义文件
 * 定义插件内部使用的接口和类型
 *
 * 注意：OneBot 相关类型（OB11Message, OB11PostSendMsg 等）
 * 以及插件框架类型（NapCatPluginContext, PluginModule 等）
 * 均来自 napcat-types 包，无需在此重复定义。
 */

// ==================== 插件配置 ====================

/**
 * 插件主配置接口
 */
export interface PluginConfig {
    /** 全局开关：是否启用插件功能 */
    enabled: boolean;
    /** 调试模式：启用后输出详细日志 */
    debug: boolean;
    /** 要监控的适配器名称列表，空数组表示监控全部 */
    watchedAdapters: string[];
    /** 机器人在线状态兜底轮询间隔（秒），0 表示禁用轮询 */
    healthCheckInterval: number;
}

/** 机器人在线状态最近一次变更来源 */
export type BotOnlineSource =
    | 'kernel_login'
    | 'kernel_kicked'
    | 'onebot_event'
    | 'onebot_heartbeat'
    | 'polling'
    | 'init';

// ==================== API 响应 ====================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
    /** 状态码，0 表示成功，-1 表示失败 */
    code: number;
    /** 错误信息（仅错误时返回） */
    message?: string;
    /** 响应数据（仅成功时返回） */
    data?: T;
}
