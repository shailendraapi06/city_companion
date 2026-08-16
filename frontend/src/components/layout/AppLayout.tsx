import { Outlet } from 'react-router-dom'
import { ChatProvider } from '../../context/ChatContext'
import { UIContextProvider, useUIContext } from '../../context/UIContext'
import { AppHeader } from './AppHeader'
import { MobileDrawer } from './MobileDrawer'
import { Sidebar } from './Sidebar'

function AppLayoutInner() {
  const { sidebarOpen, setSidebarOpen } = useUIContext()

  return (
    <ChatProvider>
      <div className="surface-subtle app-shell">
        <AppHeader onOpenDrawer={() => setSidebarOpen(true)} />
        <div className="flex flex-1 items-stretch">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
        <MobileDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
    </ChatProvider>
  )
}

export function AppLayout() {
  return (
    <UIContextProvider>
      <AppLayoutInner />
    </UIContextProvider>
  )
}
