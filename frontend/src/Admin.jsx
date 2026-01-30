import { useState, useEffect } from 'react'
import { Lock, Database, Clock, Image as ImageIcon, LogOut, Trash2, FileDown, ShieldCheck, Power, RefreshCw, ChevronLeft, ChevronRight, Inbox, Mail } from 'lucide-react'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [data, setData] = useState([]) // History Data
  const [messages, setMessages] = useState([]) // Inbox Data
  const [loading, setLoading] = useState(false)
  const [systemActive, setSystemActive] = useState(false)
  
  // View State (history | inbox)
  const [view, setView] = useState('history')

  // Pagination State
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  useEffect(() => {
    const savedKey = localStorage.getItem('admin_key')
    if (savedKey) {
      setSecretKey(savedKey)
      fetchAllData(savedKey, 1)
    }
  }, [])

  const fetchAllData = async (key, pageNum = 1) => {
    setLoading(true)
    try {
        // 1. Get History (Pagination)
        const resHistory = await fetch(`/api/admin/history?page=${pageNum}&limit=100`, { headers: { 'X-Admin-Key': key } })
        
        // 2. Get Messages
        const resMsgs = await fetch('/api/admin/messages', { headers: { 'X-Admin-Key': key } })
        
        // 3. Get Status
        const resStatus = await fetch('/api/admin/system_status', { headers: { 'X-Admin-Key': key } })
        
        if (resHistory.ok && resStatus.ok && resMsgs.ok) {
            const jsonHistory = await resHistory.json()
            const jsonMsgs = await resMsgs.json()
            const jsonStatus = await resStatus.json()
            
            setData(jsonHistory.data)
            setMessages(jsonMsgs.data)
            
            if (jsonHistory.pagination) {
                setPage(jsonHistory.pagination.page)
                setTotalPages(jsonHistory.pagination.total_pages)
                setTotalDocs(jsonHistory.pagination.total_docs)
            }
            
            setSystemActive(jsonStatus.is_active)
            setIsAuthenticated(true)
            localStorage.setItem('admin_key', key)
        } else {
            if (isAuthenticated) alert("Session Expired")
            localStorage.removeItem('admin_key')
            setIsAuthenticated(false)
        }
    } catch (err) {
        console.error(err)
        alert("Error connecting to server")
    } finally {
        setLoading(false)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    fetchAllData(secretKey, 1)
  }

  const handleRefresh = () => {
    fetchAllData(secretKey, page)
  }

  const handlePageChange = (newPage) => {
      if (newPage >= 1 && newPage <= totalPages) {
          fetchAllData(secretKey, newPage)
      }
  }

  const handleDeleteMsg = async (id) => {
      if (!window.confirm("ลบข้อความนี้?")) return;
      try {
          const res = await fetch(`/api/admin/messages/${id}`, {
              method: 'DELETE',
              headers: { 'X-Admin-Key': secretKey }
          })
          if (res.ok) {
              setMessages(messages.filter(m => m._id !== id))
          }
      } catch (e) {
          alert("Delete failed")
      }
  }

  const toggleSystem = async () => {
      const confirmMsg = systemActive 
          ? "🔴 ต้องการ 'ปิด' ระบบหรือไม่?\n(ผู้ใช้จะไม่สามารถเล่นเกมได้)" 
          : "🟢 ต้องการ 'เปิด' ระบบหรือไม่?\n(ผู้ใช้จะเริ่มเล่นเกมได้ทันที)";
      
      if (!window.confirm(confirmMsg)) return;

      try {
          const res = await fetch('/api/admin/toggle_system', {
              method: 'POST',
              headers: { 'X-Admin-Key': secretKey }
          })
          const data = await res.json()
          setSystemActive(data.is_active)
      } catch (err) {
          alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ")
      }
  }

  const handleDelete = async (ipHash) => {
    if (!window.confirm("⚠️ ยืนยันการลบข้อมูลนี้?\n(ผู้ใช้รายนี้จะสามารถเล่นใหม่ได้)")) return

    try {
        const res = await fetch(`/api/admin/delete/${ipHash}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Key': secretKey }
        })

        if (res.ok) {
            handleRefresh()
        } else {
            alert("ลบไม่สำเร็จ")
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_key')
    setIsAuthenticated(false)
    setSecretKey('')
    setData([])
    setPage(1)
  }

  const exportToCSV = async () => {
    if (!window.confirm("ต้องการดาวน์โหลดข้อมูลทั้งหมด (Export All)?")) return

    try {
        const res = await fetch('/api/admin/export', { headers: { 'X-Admin-Key': secretKey } })
        if (!res.ok) throw new Error("Export failed")
        
        const json = await res.json()
        const allData = json.data
        
        const headers = ["Timestamp", "Name", "Gender", "IP Address", "IP Hash (ID)", "Message", "Blessing", "Image File"];
        
        const rows = allData.map(row => [
            new Date(row.played_at).toLocaleString('en-US'),
            `"${row.name.replace(/"/g, '""')}"`,
            row.gender,
            row.ip_address || "N/A",
            row.ip_hash,
            `"${row.blessing.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            `"${row.blessing.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            row.image_file
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Riser_Gacha_Full_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        alert("Export Error: " + err.message)
    }
  }

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-200">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-slate-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Restricted Area</h1>
          <p className="text-sm text-slate-500 mb-6">สำหรับผู้ดูแลระบบ (@Jaiidees) เท่านั้น</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter Admin Secret..."
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-center text-white focus:border-blue-500 focus:outline-none transition-colors"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Unlock Dashboard'}
            </button>
          </form>
          
          <a href="/" className="block mt-6 text-xs text-slate-600 hover:text-slate-400">
            ← Back to Home
          </a>
        </div>
      </div>
    )
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 shadow-sm gap-4">
        
        {/* Left: View Switcher */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
             onClick={() => setView('history')}
             className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-bold ${view === 'history' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
             <Database size={18} /> History
          </button>
          <button 
             onClick={() => setView('messages')}
             className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-bold ${view === 'messages' ? 'bg-pink-100 text-pink-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
             <Inbox size={18} /> Inbox
             {messages.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{messages.length}</span>}
          </button>
        </div>

        {/* Center: System & Refresh */}
        <div className="flex items-center gap-2">
            <div 
                onClick={toggleSystem}
                className={`cursor-pointer flex items-center gap-3 px-4 py-2 rounded-full border transition-all select-none shadow-sm ${
                    systemActive 
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                    : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                }`}
            >
                <div className={`w-3 h-3 rounded-full ${systemActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-bold uppercase tracking-wide">
                    {systemActive ? 'ONLINE' : 'OFFLINE'}
                </span>
                <Power size={14} />
            </div>
            <button
                onClick={handleRefresh}
                className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200"
                title="Refresh Data"
            >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors border border-green-200"
            >
                <FileDown size={14} /> CSV All
            </button>
            <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-100"
            >
                <LogOut size={14} /> Logout
            </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        
        {/* VIEW 1: HISTORY LOG */}
        {view === 'history' && (
            <>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                        <th className="px-4 py-4 font-medium w-32">Timestamp</th>
                        <th className="px-4 py-4 font-medium w-48">User Info</th>
                        <th className="px-4 py-4 font-medium w-32">IP Address</th>
                        <th className="px-4 py-4 font-medium w-32">IP Hash (ID)</th>
                        <th className="px-4 py-4 font-medium">Message</th>
                        <th className="px-4 py-4 font-medium text-right w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-4 py-4 text-slate-400 text-xs flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(log.played_at).toLocaleDateString('th-TH')}
                            </div>
                            <span className="pl-4">{new Date(log.played_at).toLocaleTimeString('th-TH')}</span>
                            </td>
                            <td className="px-4 py-4">
                            <div className="font-bold text-slate-800">{log.name || 'Anonymous'}</div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                                log.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}>
                                {log.gender === 'male' ? 'BOY SIDE' : 'GIRL SIDE'}
                            </span>
                            </td>
                            <td className="px-4 py-4">
                                <div className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                                    {log.ip_address || "N/A"}
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400" title={log.ip_hash}>
                                    <ShieldCheck size={10} />
                                    {log.ip_hash.substring(0, 8)}...
                                </div>
                            </td>
                            <td className="px-4 py-4 text-slate-600 italic text-xs max-w-xs truncate">
                            "{log.blessing}"
                            </td>
                            <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <a 
                                    href={`/api/image/${log.gender}/${log.image_file}`} 
                                    target="_blank"
                                    rel="noreferrer" 
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="View Image"
                                >
                                    <ImageIcon size={16} />
                                </a>
                                <button
                                    onClick={() => handleDelete(log.ip_hash)}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    title="Delete Record"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                    {data.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            No history found.
                        </div>
                    )}
                </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">Total {totalDocs} records</p>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 px-2">
                            Page {page} of {totalPages}
                        </span>
                        <button 
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </>
        )}

        {/* VIEW 2: INBOX MESSAGES */}
        {view === 'messages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {messages.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400">
                        <Inbox size={48} className="mx-auto mb-4 opacity-50" />
                        No messages yet.
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className="bg-pink-100 p-2 rounded-full text-pink-600">
                                    <Mail size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">{msg.name}</h3>
                                    <p className="text-[10px] text-slate-500">{new Date(msg.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeleteMsg(msg._id)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed mb-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            "{msg.message}"
                        </p>
                        {msg.contact && (
                            <p className="text-xs text-slate-500 font-medium">
                                Contact: <span className="text-blue-600">{msg.contact}</span>
                            </p>
                        )}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                            <span>IP: {msg.ip_address || "N/A"}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}

      </main>
    </div>
  )
}