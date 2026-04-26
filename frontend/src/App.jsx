import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import ETASimulator from './pages/ETASimulator'
import PriceSimulator from './pages/PriceSimulator'
import NearbyPrice from './pages/NearbyPrice'
import CorridorDashboard from './pages/CorridorDashboard'
import ZoneHeatmap from './pages/ZoneHeatmap'
import Admin from './pages/Admin'
import LiveTraffic from './pages/LiveTraffic'
import Signup from './pages/Signup'
import SubmitTrip from './pages/SubmitTrip'

const NAV = [
  { path: '/',           label: 'Overview'   },
  { path: '/eta',        label: 'ETA Simulator'     },
  { path: '/price',      label: 'Price Simulator'  },
  { path: '/nearby',     label: 'Nearby Price'},
  { path: '/corridors',  label: 'Corridors'  },
  { path: '/heatmap',    label: 'Heatmap'    },
  { path: '/traffic',    label: 'Live Traffic' },
  { path: '/submit-trip',label: 'Submit Trip' },
  { path: '/admin',      label: 'Admin Panel' },
]

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-white selection:bg-yellow-200">
          <header className="sticky top-0 z-50 glass border-b border-slate-100 flex items-center justify-between px-10 py-5">
            <div className="flex items-center gap-4 group cursor-default">
              {/* Logo Part: Blue Pin + Yellow Taxi */}
              <div className="relative group-hover:scale-110 transition-transform duration-500">
                 {/* Outer Blue Pin Pin */}
                 <svg className="w-14 h-14 text-[#003580] drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13.5 8 13.5S20 13.25 20 8c0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                 </svg>
                 {/* Inner Yellow Taxi SVG Overlay */}
                 <div className="absolute top-[8px] left-[15px] scale-[0.6]">
                    <svg className="w-10 h-10 text-[#FFB800]" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                    </svg>
                 </div>
              </div>
              {/* Logo Text: NYC Taxi Dashboard Style */}
              <div className="brand-font leading-[1.1]">
                <div className="flex gap-1.5 text-2xl font-black">
                   <span className="text-[#001C44]">NYC</span>
                   <span className="text-[#FFB800]">Taxi</span>
                </div>
                <div className="text-[#FFB800] text-2xl font-black -mt-1 tracking-tight">Dashboard</div>
              </div>
            </div>
            <nav className="flex items-center gap-1.5">
              {NAV.map(n => (
                <NavLink
                  key={n.path}
                  to={n.path}
                  end={n.path === '/'}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <NavLink to="/signup" className="ml-4 px-4 py-2 bg-[#FFB800] text-[#001C44] rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95">Sign Up</NavLink>
            </nav>

            <div className="hidden lg:flex items-center gap-4 pl-6 border-l border-slate-100">
               <div className="flex flex-col items-end justify-center h-full">
                  <div className="flex items-center gap-3">
                     <div className="flex flex-col items-end">
                        <p className="text-[11px] font-black text-slate-800 leading-none">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                           {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                     <div className="h-6 w-px bg-slate-200"></div>
                     <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase">Live</p>
                     </div>
                  </div>
               </div>
            </div>
          </header>

          <main className="flex-1 max-w-screen-2xl mx-auto w-full p-8 transition-opacity duration-300">
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/eta"       element={<ETASimulator />} />
              <Route path="/price"     element={<PriceSimulator />} />
              <Route path="/nearby"    element={<NearbyPrice />} />
              <Route path="/corridors" element={<CorridorDashboard />} />
              <Route path="/heatmap"   element={<ZoneHeatmap />} />
              <Route path="/traffic"   element={<LiveTraffic />} />
              <Route path="/admin"     element={<Admin />} />
              <Route path="/signup"    element={<Signup />} />
              <Route path="/submit-trip" element={<SubmitTrip />} />
            </Routes>
          </main>
          
          <footer className="mt-auto border-t border-slate-200/60 px-8 py-6 bg-white flex justify-between items-center">
             <p className="text-sm text-slate-400 font-medium tracking-wide">© 2026 TaxiIQ Intelligent Systems • All Rights Reserved</p>
             <div className="flex gap-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest">Real-time Data Active</span>
             </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

