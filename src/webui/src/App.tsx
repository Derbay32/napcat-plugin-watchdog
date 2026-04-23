import { useState, useEffect, type UIEvent } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ToastContainer from './components/ToastContainer'
import StatusPage from './pages/StatusPage'
import ConfigPage from './pages/ConfigPage'
import { useStatus } from './hooks/useStatus'
import { useTheme } from './hooks/useTheme'

export type PageId = 'status' | 'config'

const pageConfig: Record<PageId, { title: string; desc: string }> = {
    status: { title: '仪表盘', desc: '网络适配器状态与健康检查概览' },
    config: { title: '插件配置', desc: '设置需要监控的适配器列表' },
}

function App() {
    const [currentPage, setCurrentPage] = useState<PageId>('status')
    const [isScrolled, setIsScrolled] = useState(false)
    const { status, fetchStatus } = useStatus()

    useTheme()

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, 5000)
        return () => clearInterval(interval)
    }, [fetchStatus])

    const handleScroll = (e: UIEvent<HTMLElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 10)
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'status': return <StatusPage status={status} onRefresh={fetchStatus} />
            case 'config': return <ConfigPage />
            default: return <StatusPage status={status} onRefresh={fetchStatus} />
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8f9fa] dark:bg-[#18191C] text-gray-800 dark:text-gray-200 transition-colors duration-300">
            <ToastContainer />
            <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto" onScroll={handleScroll}>
                    <Header
                        title={pageConfig[currentPage].title}
                        description={pageConfig[currentPage].desc}
                        isScrolled={isScrolled}
                        status={status}
                        currentPage={currentPage}
                    />
                    <div className="px-4 md:px-8 pb-8">
                        <div key={currentPage} className="page-enter">
                            {renderPage()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default App
