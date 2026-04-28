/**
 * API 服务模块
 * 注册 WebUI API 路由
 */

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';

export function registerApiRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    router.getNoAuth('/status', (_req, res) => {
        res.json({
            code: 0,
            data: {
                pluginName: ctx.pluginName,
                uptime: pluginState.getUptime(),
                uptimeFormatted: pluginState.getUptimeFormatted(),
                selfId: pluginState.selfId,
                botOnline: pluginState.botOnline,
                lastOnlineSource: pluginState.lastOnlineSource,
                lastBotCheckTime: pluginState.lastBotCheckTime,
                config: pluginState.config,
                stats: pluginState.stats,
            },
        });
    });

    router.getNoAuth('/config', (_req, res) => {
        res.json({ code: 0, data: pluginState.config });
    });

    router.postNoAuth('/config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            if (!body) {
                return res.status(400).json({ code: -1, message: '请求体为空' });
            }
            pluginState.updateConfig(body as Partial<import('../types').PluginConfig>);
            ctx.logger.info('配置已保存');
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('保存配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/health', (_req, res) => {
        const statuses = pluginState.getAdapterStatuses();
        const adaptersHealthy = [...statuses.values()].every((status) => status.active);
        const allHealthy = adaptersHealthy && pluginState.botOnline;
        const healthStatus = pluginState.botOnline ? (adaptersHealthy ? 'ok' : 'degraded') : 'bot_offline';

        res.status(allHealthy ? 200 : 503).json({
            status: healthStatus,
            timestamp: Date.now(),
            bot_online: pluginState.botOnline,
            self_id: pluginState.selfId || null,
            last_online_source: pluginState.lastOnlineSource,
            last_bot_check_time: pluginState.lastBotCheckTime || null,
            adapters: Object.fromEntries(statuses),
        });
    });

    router.getNoAuth('/health/:name', (req, res) => {
        const name = req.params?.name;
        if (!name) {
            return res.status(400).json({ status: 'bad_request', message: '缺少适配器名称' });
        }

        const status = pluginState.getAdapterStatus(name);
        if (!status) {
            return res.status(404).json({ status: 'not_found', message: `适配器 "${name}" 不存在` });
        }

        const healthy = status.active && pluginState.botOnline;
        const healthStatus = pluginState.botOnline ? (status.active ? 'ok' : 'unavailable') : 'bot_offline';

        res.status(healthy ? 200 : 503).json({
            status: healthStatus,
            adapter: name,
            bot_online: pluginState.botOnline,
            self_id: pluginState.selfId || null,
            last_online_source: pluginState.lastOnlineSource,
            last_bot_check_time: pluginState.lastBotCheckTime || null,
            timestamp: Date.now(),
        });
    });

    ctx.logger.debug('API 路由注册完成');
}
