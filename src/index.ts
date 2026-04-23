/**
 * NapCat 网络连接监控插件 - 主入口
 */

import type {
    PluginModule,
    PluginConfigSchema,
    NapCatPluginContext,
} from 'napcat-types/napcat-onebot/network/plugin/types';

import { buildConfigSchema } from './config';
import { pluginState } from './core/state';
import { registerApiRoutes } from './services/api-service';
import type { PluginConfig } from './types';

export let plugin_config_ui: PluginConfigSchema = [];

export const plugin_init: PluginModule['plugin_init'] = async (ctx) => {
    try {
        pluginState.init(ctx);

        ctx.logger.info('插件初始化中...');

        plugin_config_ui = buildConfigSchema(ctx);
        registerWebUI(ctx);
        registerApiRoutes(ctx);

        ctx.logger.info('插件初始化完成');
    } catch (error) {
        ctx.logger.error('插件初始化失败:', error);
    }
};

export const plugin_cleanup: PluginModule['plugin_cleanup'] = async (ctx) => {
    try {
        pluginState.cleanup();
        ctx.logger.info('插件已卸载');
    } catch (e) {
        ctx.logger.warn('插件卸载时出错:', e);
    }
};

export const plugin_get_config: PluginModule['plugin_get_config'] = async () => {
    return pluginState.config;
};

export const plugin_set_config: PluginModule['plugin_set_config'] = async (ctx, config) => {
    pluginState.replaceConfig(config as PluginConfig);
    ctx.logger.info('配置已通过 WebUI 更新');
};

export const plugin_on_config_change: PluginModule['plugin_on_config_change'] = async (
    ctx,
    ui,
    key,
    value,
    currentConfig
) => {
    try {
        void ui;
        void currentConfig;
        pluginState.updateConfig({ [key]: value } as Partial<PluginConfig>);
        ctx.logger.debug(`配置项 ${key} 已更新`);
    } catch (err) {
        ctx.logger.error(`更新配置项 ${key} 失败:`, err);
    }
};

function registerWebUI(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    router.static('/static', 'webui');
    router.page({
        path: 'dashboard',
        title: '网络连接监控',
        htmlFile: 'webui/index.html',
        description: '查看 NapCat 网络适配器健康状态',
    });

    ctx.logger.debug('WebUI 路由注册完成');
}
