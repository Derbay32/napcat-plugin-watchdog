/** WebUI 前端类型定义 */

export interface PluginStatus {
    pluginName: string
    uptime: number
    uptimeFormatted: string
    selfId: string
    botOnline: boolean
    lastOnlineSource: string | null
    lastBotCheckTime: number
    config: PluginConfig
    stats: {
        processed: number
        todayProcessed: number
        lastUpdateDay: string
    }
}

export interface PluginConfig {
    enabled: boolean
    debug: boolean
    watchedAdapters: string[]
    healthCheckInterval: number
}

export interface ApiResponse<T = unknown> {
    code: number
    data?: T
    message?: string
}
