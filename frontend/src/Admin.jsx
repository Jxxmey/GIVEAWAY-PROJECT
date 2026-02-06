import { useState, useEffect } from 'react'
import { Lock, Database, Clock, LogOut, Trash2, FileDown, Power, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [data, setData] = useState([]) // History Data
  const [loading, setLoading] = useState(false)
  const [systemActive, setSystemActive] = useState(false)
  
  // Modal State
  const [showToggleModal, setShowToggleModal] = useState(false)

  // Pagination State
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // --- 1. Init & Auth ---
  useEffect(() => {
    const savedKey = localStorage.getItem('admin_key')
    if (savedKey) {
      setSecretKey(savedKey)
      fetchAllData(savedKey, 1)
    }
  }, [])

  // --- 2. Fetch Data Logic ---
  const fetchAllData = async (key, pageNum = 1, silent=false) => {
    if (!silent) setLoading(true)
    try {
        const resHistory = await fetch(`/api/admin/history?page=${pageNum}&limit=100`, { headers: { 'X-Admin-Key': key } })
        const resStatus = await fetch('/api/admin/system_status', { headers: { 'X-Admin-Key': key } })
        
        if (resHistory.ok && resStatus.ok) {
            const jsonHistory = await resHistory.json()
            const jsonStatus = await resStatus.json()
            
            setData(jsonHistory.data)

            if (jsonHistory.pagination) {
                setPage(jsonHistory.pagination.page)
                setTotalPages(jsonHistory.pagination.total_pages || 1)
                setTotalDocs(jsonHistory.pagination.total || 0)
            }
            
            setSystemActive(jsonStatus.is_active)
            setIsAuthenticated(true)
            localStorage.setItem('admin_key', key)
        } else {
            if (isAuthenticated && !silent) alert("Session Expired / Wrong Key")
            localStorage.removeItem('admin_key')
            setIsAuthenticated(false)
        }
    } catch (err) {
        console.error(err)
    } finally {
        if (!silent) setLoading(false)
    }
  }

  // --- 3. Actions ---
  const handleLogin = (e) => { e.preventDefault(); fetchAllData(secretKey, 1) }
  const handleRefresh = () => fetchAllData(secretKey, page)
  const handleLogout = () => { localStorage.removeItem('admin_key'); setIsAuthenticated(false); setSecretKey('') }
  
  const confirmToggleSystem = async () => {
      try {
          const res = await fetch('/api/admin/toggle_system', { method: 'POST', headers: { 'X-Admin-Key': secretKey } })
          const data = await res.json()
          setSystemActive(data.is_active)
          setShowToggleModal(false) // Close Modal
      } catch (err) { alert("Error") }
  }

  const handleDelete = async (ipHash) => {
    if (!window.confirm("ลบข้อมูลนี้?")) return
    try {
        const res = await fetch(`/api/admin/delete/${ipHash}`, { method: 'DELETE', headers: { 'X-Admin-Key': secretKey } })
        if (res.ok) handleRefresh()
    } catch (err) { alert("Error") }
  }

  const exportToCSV = async () => {
    if (!window.confirm("ดาวน์โหลด CSV?")) return
    try {
        const res = await fetch('/api/admin/export', { headers: { 'X-Admin-Key': secretKey } })
        const json = await res.json()
        const headers = ["Timestamp", "Name", "Gender", "IP Address", "IP Hash", "Message", "Blessing", "Image File"];
        const rows = json.data.map(r => [
            new Date(r.played_at).toLocaleString('en-US'), `"${r.name.replace(/"/g, '""')}"`, r.gender, r.ip_address || "N/A", r.ip_hash,
            `"${(r.blessing||"").replace(/"/g, '""').replace(/\n/g, ' ')}"`, r.image_file
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csvContent));
        link.setAttribute("download", `Riser_Gacha_Export.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { alert("Export Error") }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-200">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={32} className="text-slate-400" /></div>
          <h1 className="text-xl font-bold mb-2">Restricted Area</h1>
          <form onSubmit={handleLogin} className="space-y-4"><input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Enter Admin Secret..." className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-center text-white focus:border-blue-500 focus:outline-none" autoFocus /><button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">{loading ? 'Verifying...' : 'Unlock Dashboard'}</button></form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative pb-20">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Database size={20} /></div>
          <div className="hidden md:block"><h1 className="text-sm font-bold text-slate-900">Admin Dashboard</h1><p className="text-[10px] text-slate-500">Records: {totalDocs}</p></div>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-blue-50 text-blue-600"><Clock size={16} /> History</button>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className="p-2 rounded-full bg-slate-100 text-slate-600 hover:text-blue-600"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            <button onClick={exportToCSV} className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100"><FileDown size={14} /> CSV</button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-red-500 px-3 py-2 rounded-lg border border-red-100 hover:bg-red-50"><LogOut size={14} /> Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500"><tr><th className="px-4 py-4 w-32">Time</th><th className="px-4 py-4 w-48">User</th><th className="px-4 py-4 w-32">IP</th><th className="px-4 py-4">Message</th><th className="px-4 py-4 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((log, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-4 text-xs text-slate-400">{new Date(log.played_at).toLocaleString()}</td>
                                <td className="px-4 py-4 font-bold">{log.name} <span className="text-[10px] font-normal text-slate-400">({log.gender})</span></td>
                                <td className="px-4 py-4 text-xs font-mono">{log.ip_address}</td>
                                <td className="px-4 py-4 text-xs italic text-slate-600 truncate max-w-xs">{log.blessing}</td>
                                <td className="px-4 py-4 text-right">
                                    <a href={`/api/image/${log.gender}/${log.image_file}`} target="_blank" className="text-blue-500 hover:underline text-xs mr-2">View</a>
                                    <button onClick={() => handleDelete(log.ip_hash)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="p-1 rounded bg-white border disabled:opacity-50"><ChevronLeft size={16} /></button>
                <span className="text-xs text-slate-500">Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="p-1 rounded bg-white border disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
        </div>
      </main>

      {/* --- FLOATING TOGGLE BUTTON (BOTTOM RIGHT) --- */}
      <button 
        onClick={() => setShowToggleModal(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 font-bold text-white border-4 border-white ${systemActive ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}
      >
        <div className="relative">
            <Power size={24} />
            {systemActive && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>}
        </div>
        <span className="text-sm tracking-wide">{systemActive ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
      </button>

      {/* --- CONFIRMATION MODAL (POPUP) --- */}
      {showToggleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowToggleModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs relative z-10 overflow-hidden animate-zoom-in">
                <div className={`h-2 w-full ${systemActive ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <button onClick={() => setShowToggleModal(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors ${systemActive ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                        <Power size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">
                        {systemActive ? 'ยืนยันการปิดระบบ?' : 'ยืนยันการเปิดระบบ?'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        {systemActive 
                            ? 'เมื่อปิดระบบ ผู้ใช้งานจะไม่สามารถเล่นกิจกรรมได้ (สถานะ: Closed)' 
                            : 'เมื่อเปิดระบบ ผู้ใช้งานจะสามารถเริ่มสุ่มกาชาได้ทันที (สถานะ: Active)'}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowToggleModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">ยกเลิก</button>
                        <button onClick={confirmToggleSystem} className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition-all ${systemActive ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-green-500 hover:bg-green-600 shadow-green-200'}`}>
                            {systemActive ? 'ยืนยันปิดระบบ' : 'ยืนยันเปิดระบบ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}