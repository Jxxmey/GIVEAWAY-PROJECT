import React from 'react'
import { Home, Ghost, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 selection:bg-pink-500/30 text-slate-800">
      
      {/* Background Ambience (เหมือนหน้าหลัก) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-400/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 text-center px-6 animate-fade-in">
        
        {/* Icon & 404 Text */}
        <div className="mb-6 relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-pink-400 blur-2xl opacity-30 rounded-full"></div>
          <h1 className="text-[8rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-sm">
            404
          </h1>
          <div className="absolute -top-4 -right-4 rotate-12 bg-white p-2 rounded-full shadow-lg border border-slate-100">
            <Ghost size={40} className="text-slate-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Oops! Page Not Found
        </h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">
          ดูเหมือนคุณจะหลงทางในงานคอนเสิร์ตซะแล้ว <br/>หน้านี้ไม่มีอยู่จริงครับ
        </p>

        {/* Back Button */}
        <a 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-700 transition-all hover:-translate-y-1 shadow-lg shadow-blue-200"
        >
          <Home size={18} />
          กลับไปหน้างาน
        </a>

      </div>

      {/* Footer Text */}
      <div className="absolute bottom-6 text-[10px] text-slate-400 font-mono">
        Error Code: 404_Riser_Lost
      </div>
    </div>
  )
}