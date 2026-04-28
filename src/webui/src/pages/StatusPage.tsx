import { useState, useEffect } from 'react'
import type { PluginStatus } from '../types'
import { IconPower, IconClock, IconActivity, IconDownload, IconRefresh, IconTerminal, IconPlugin } from '../components/icons'

interface StatusPageProps {
    status: PluginStatus | null
    onRefresh: () => void
}

function formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000)
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (days > 0) return `${days}天 ${hours}小时 ${minutes}分 ${secs}秒`
    if (hours > 0) return `${hours}小时 ${minutes}分 ${secs}秒`
    if (minutes > 0) return `${minutes}分 ${secs}秒`
    return `${secs}秒`
}

export default function StatusPage({ status, onRefresh }: StatusPageProps) {
    const [displayUptime, setDisplayUptime] = useState<string>('-')
    const [syncInfo, setSyncInfo] = useState<{ baseUptime: number; syncTime: number } | null>(null)

    useEffect(() => {
        if (status?.uptime !== undefined && status.uptime > 0) {
            setSyncInfo({ baseUptime: status.uptime, syncTime: Date.now() })
        }
    }, [status?.uptime])

    useEffect(() => {
        if (!syncInfo) { setDisplayUptime('-'); return }
        const updateUptime = () => {
            const elapsed = Date.now() - syncInfo.syncTime
            setDisplayUptime(formatUptime(syncInfo.baseUptime + elapsed))
        }
        updateUptime()
        const interval = setInterval(updateUptime, 1000)
        return () => clearInterval(interval)
    }, [syncInfo])

    if (!status) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">正在获取插件状态...</div>
                </div>
            </div>
        )
    }

    const { config, stats } = status
    const lastCheckText = status.lastBotCheckTime > 0 ? new Date(status.lastBotCheckTime).toLocaleString() : '尚未轮询'

    const statCards = [
        {
            label: '插件状态',
            value: config.enabled ? '运行中' : '已停用',
            icon: <IconPower size={18} />,
            color: config.enabled ? 'text-emerald-500' : 'text-red-400',
            bg: config.enabled ? 'bg-emerald-500/10' : 'bg-red-500/10',
        },
        {
            label: '机器人状态',
            value: status.botOnline ? '在线' : '离线',
            icon: <IconPlugin size={18} />,
            color: status.botOnline ? 'text-emerald-500' : 'text-red-400',
            bg: status.botOnline ? 'bg-emerald-500/10' : 'bg-red-500/10',
        },
        {
            label: '运行时长',
            value: displayUptime,
            icon: <IconClock size={18} />,
            color: 'text-primary',
            bg: 'bg-primary/10',
        },
        {
            label: '今日处理',
            value: String(stats.todayProcessed),
            icon: <IconActivity size={18} />,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
        },
        {
            label: '累计处理',
            value: String(stats.processed),
            icon: <IconDownload size={18} />,
            color: 'text-violet-500',
            bg: 'bg-violet-500/10',
        },
    ]

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
                {statCards.map((card) => (
                    <div key={card.label} className="card p-4 hover-lift">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-400 font-medium">{card.label}</span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg} ${card.color} transition-transform duration-300 hover:scale-110`}>
                                {card.icon}
                            </div>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="card p-5 hover-lift animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <IconTerminal size={16} className="text-gray-400" />
                        基础信息
                    </h3>
                    <button onClick={onRefresh} className="btn-ghost btn text-xs px-2.5 py-1.5">
                        <IconRefresh size={13} />
                        刷新
                    </button>
                </div>
                <div className="space-y-3">
                    <InfoRow label="机器人 QQ" value={status.selfId || '未知'} />
                    <InfoRow label="机器人在线" value={status.botOnline ? '在线' : '离线'} />
                    <InfoRow label="最近状态来源" value={status.lastOnlineSource || '未知'} />
                    <InfoRow label="最近轮询时间" value={lastCheckText} />
                    <InfoRow label="轮询检测间隔" value={config.healthCheckInterval > 0 ? `${config.healthCheckInterval} 秒` : '已禁用'} />
                    <InfoRow
                        label="监控适配器"
                        value={config.watchedAdapters.length > 0 ? config.watchedAdapters.join(', ') : '全部适配器'}
                    />
                    <InfoRow label="调试模式" value={config.debug ? '开启' : '关闭'} />
                    <InfoRow label="健康检查总览" value="/plugin/napcat-plugin-watchdog/api/health" />
                </div>
            </div>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1 gap-4">
            <span className="text-xs text-gray-400">{label}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-right break-all">{value}</span>
        </div>
    )
}
