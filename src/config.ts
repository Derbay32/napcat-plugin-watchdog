/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

/** 默认配置 */
export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    debug: false,
    watchedAdapters: [],
};

/**
 * 构建 WebUI 配置 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: #FB7299; border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">网络连接监控</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.85;">为 NapCat 网络适配器提供独立健康检查端点，方便 Uptime Kuma 监控</p>
            </div>
        `),
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用网络连接监控与健康检查接口'),
        ctx.NapCatConfig.boolean('debug', '调试模式', false, '启用后将输出详细的调试日志'),
        ctx.NapCatConfig.text(
            'watchedAdapters',
            '监控适配器',
            '',
            '填写要监控的适配器名称，多个名称请用英文逗号分隔；留空表示监控全部适配器'
        )
    );
}
