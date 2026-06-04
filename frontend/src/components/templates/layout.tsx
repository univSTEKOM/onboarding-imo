import React from 'react'
import { SIDEBAR_EXPANDED_WIDTH, Sidebar, useSidebarWidth } from './sidebar'
import { Header } from './header'
import { BottomNav } from './bottom-nav'

interface LayoutProps {
  children: React.ReactNode
  withHeader?: boolean
}

export const Layout = ({ children, withHeader = true }: LayoutProps) => {
  const sidebarWidth = useSidebarWidth()

  return (
    <div
      className="min-h-screen"
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      {/* Sidebar - hidden on mobile, fixed on desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="min-h-screen transition-all duration-300 ease-out flex flex-col relative pb-32 lg:pb-6 lg:ml-[var(--sidebar-width)]">
        {withHeader && <Header />}
        <div className="p-4 sm:p-6 lg:pl-10 pb-4! flex-1 overflow-x-clip">
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  )
}

export { SIDEBAR_EXPANDED_WIDTH }
