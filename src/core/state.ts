/**
 * 全局状态管理模块（单例模式）
 */

import fs from 'fs';
import path from 'path';
import type { NapCatPluginContext, PluginLogger } from 'napcat-types/napcat-onebot/network/plugin/types';
import { DEFAULT_CONFIG } from '../config';
import type { PluginConfig } from '../types';

interface AdapterStatus {
    active: boolean;
}

interface NetworkAdapterLike {
    name?: string;
    isActive?: boolean;
}

function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeConfig(raw: unknown): PluginConfig {
    if (!isObject(raw)) return { ...DEFAULT_CONFIG };

    const out: PluginConfig = { ...DEFAULT_CONFIG };

    if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
    if (typeof raw.debug === 'boolean') out.debug = raw.debug;

    if (Array.isArray(raw.watchedAdapters)) {
        out.watchedAdapters = raw.watchedAdapters.filter((value): value is string => typeof value === 'string');
    } else if (typeof raw.watchedAdapters === 'string') {
        out.watchedAdapters = raw.watchedAdapters
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }

    return out;
}

class PluginState {
    private _ctx: NapCatPluginContext | null = null;

    config: PluginConfig = { ...DEFAULT_CONFIG };
    startTime = 0;
    selfId = '';
    timers: Map<string, ReturnType<typeof setInterval>> = new Map();
    stats = {
        processed: 0,
        todayProcessed: 0,
        lastUpdateDay: new Date().toDateString(),
    };

    get ctx(): NapCatPluginContext {
        if (!this._ctx) throw new Error('PluginState 尚未初始化，请先调用 init()');
        return this._ctx;
    }

    get logger(): PluginLogger {
        return this.ctx.logger;
    }

    init(ctx: NapCatPluginContext): void {
        this._ctx = ctx;
        this.startTime = Date.now();
        this.stats.lastUpdateDay = new Date().toDateString();
        this.loadConfig();
        this.ensureDataDir();
        this.fetchSelfId();
    }

    private async fetchSelfId(): Promise<void> {
        try {
            const res = await this.ctx.actions.call(
                'get_login_info',
                {},
                this.ctx.adapterName,
                this.ctx.pluginManager.config
            ) as { user_id?: number | string };
            if (res?.user_id) {
                this.selfId = String(res.user_id);
                this.logger.debug('(｡·ω·｡) 机器人 QQ: ' + this.selfId);
            }
        } catch (e) {
            this.logger.warn('(；′⌒`) 获取机器人 QQ 号失败:', e);
        }
    }

    cleanup(): void {
        for (const [jobId, timer] of this.timers) {
            clearInterval(timer);
            this.logger.debug(`(｡-ω-) 清理定时器: ${jobId}`);
        }
        this.timers.clear();
        this.saveConfig();
        this._ctx = null;
    }

    private ensureDataDir(): void {
        const dataPath = this.ctx.dataPath;
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
    }

    getDataFilePath(filename: string): string {
        return path.join(this.ctx.dataPath, filename);
    }

    loadDataFile<T>(filename: string, defaultValue: T): T {
        const filePath = this.getDataFilePath(filename);
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
            }
        } catch (e) {
            this.logger.warn('(；′⌒`) 读取数据文件 ' + filename + ' 失败:', e);
        }
        return defaultValue;
    }

    saveDataFile<T>(filename: string, data: T): void {
        const filePath = this.getDataFilePath(filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {
            this.logger.error('(╥﹏╥) 保存数据文件 ' + filename + ' 失败:', e);
        }
    }

    loadConfig(): void {
        const configPath = this.ctx.configPath;
        try {
            if (configPath && fs.existsSync(configPath)) {
                const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as unknown;
                this.config = sanitizeConfig(raw);
                if (isObject(raw) && isObject(raw.stats)) {
                    Object.assign(this.stats, raw.stats);
                }
                this.ctx.logger.debug('已加载本地配置');
            } else {
                this.config = { ...DEFAULT_CONFIG };
                this.saveConfig();
                this.ctx.logger.debug('配置文件不存在，已创建默认配置');
            }
        } catch (error) {
            this.ctx.logger.error('加载配置失败，使用默认配置:', error);
            this.config = { ...DEFAULT_CONFIG };
        }
    }

    saveConfig(): void {
        if (!this._ctx) return;
        const configPath = this._ctx.configPath;
        try {
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            const data = { ...this.config, stats: this.stats };
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            this._ctx.logger.error('保存配置失败:', error);
        }
    }

    updateConfig(partial: Partial<PluginConfig>): void {
        this.config = sanitizeConfig({ ...this.config, ...partial });
        this.saveConfig();
    }

    replaceConfig(config: PluginConfig): void {
        this.config = sanitizeConfig(config);
        this.saveConfig();
    }

    getAdapterStatuses(): Map<string, AdapterStatus> {
        const adapters = this.getNetworkAdapters();
        const watchedNames = this.getWatchedAdapterNames();
        const statuses = new Map<string, AdapterStatus>();

        for (const adapter of adapters) {
            const name = this.getAdapterName(adapter);
            if (!name) continue;
            if (watchedNames.size > 0 && !watchedNames.has(name)) continue;
            statuses.set(name, { active: Boolean(adapter.isActive) });
        }

        return statuses;
    }

    getAdapterStatus(name: string): AdapterStatus | null {
        const normalizedName = name.trim();
        if (!normalizedName) return null;

        const watchedNames = this.getWatchedAdapterNames();
        if (watchedNames.size > 0 && !watchedNames.has(normalizedName)) {
            return null;
        }

        for (const adapter of this.getNetworkAdapters()) {
            if (this.getAdapterName(adapter) === normalizedName) {
                return { active: Boolean(adapter.isActive) };
            }
        }

        return null;
    }

    incrementProcessed(): void {
        const today = new Date().toDateString();
        if (this.stats.lastUpdateDay !== today) {
            this.stats.todayProcessed = 0;
            this.stats.lastUpdateDay = today;
        }
        this.stats.todayProcessed++;
        this.stats.processed++;
    }

    getUptime(): number {
        return Date.now() - this.startTime;
    }

    getUptimeFormatted(): string {
        const ms = this.getUptime();
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);

        if (d > 0) return `${d}天${h % 24}小时`;
        if (h > 0) return `${h}小时${m % 60}分钟`;
        if (m > 0) return `${m}分钟${s % 60}秒`;
        return `${s}秒`;
    }

    private getWatchedAdapterNames(): Set<string> {
        return new Set(
            this.config.watchedAdapters
                .map((name) => name.trim())
                .filter(Boolean)
        );
    }

    private getNetworkAdapters(): NetworkAdapterLike[] {
        try {
            const ctxWithOneBot = this.ctx as NapCatPluginContext & {
                oneBot?: {
                    networkManager?: {
                        adapters?: Map<string, NetworkAdapterLike> | Iterable<NetworkAdapterLike>;
                    };
                };
            };
            const adapters = ctxWithOneBot.oneBot?.networkManager?.adapters;

            if (!adapters) return [];
            if (adapters instanceof Map) return Array.from(adapters.values());
            return Array.from(adapters);
        } catch (error) {
            this.logger.warn('读取网络适配器状态失败:', error);
            return [];
        }
    }

    private getAdapterName(adapter: NetworkAdapterLike): string | null {
        if (typeof adapter.name === 'string' && adapter.name.trim()) {
            return adapter.name.trim();
        }
        return null;
    }
}

export const pluginState = new PluginState();
