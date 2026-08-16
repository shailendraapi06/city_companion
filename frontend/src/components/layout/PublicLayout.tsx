import { Outlet } from 'react-router-dom'
import { PublicNav } from './PublicNav'

export function PublicLayout() {
  return (
    <div className="surface-landing app-shell">
      <PublicNav />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
