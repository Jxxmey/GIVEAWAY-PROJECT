import { useState, useEffect } from 'react'
import { Lock, Database, Clock, Image as ImageIcon, LogOut, Trash2, FileDown, ShieldCheck, Power, RefreshCw, ChevronLeft, ChevronRight, Inbox, MessageCircle, Send, ArrowLeft } from 'lucide-react'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [data, setData] = useState([]) // History Data
  const [chats, setChats] = useState([]) // Chat Rooms List
  const [loading, setLoading] = useState(false)
  const [systemActive, setSystemActive] = useState(false)
  
  // View State
  const [view, setView] = useState('history') // 'history' | 'inbox'
  const [selectedChat, setSelectedChat] = useState(null) // ห้องแชทที่เปิดอยู่
  const [replyMsg, setReplyMsg] = useState('')

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

  // --- 2. Auto-Refresh Chat (Polling) ---
  useEffect(() => {
    // ถ้าเปิดห้องแชทค้างไว้ ให้ดึงข้อมูลใหม่ทุก 3 วินาที
    if (!selectedChat) return;
    const interval = setInterval(() => {
        fetchAllData(secretKey, page, true) // silent refresh
    }, 3000);
    return () => clearInterval(interval)
  }, [selectedChat])

  // --- 3. Fetch Data Logic ---
  const fetchAllData = async (key, pageNum = 1, silent=false) => {
    if (!silent) setLoading(true)
    try {
        // ดึง History (Pagination)
        const resHistory = await fetch(`/api/admin/history?page=${pageNum}&limit=100`, { headers: { 'X-Admin-Key': key } })
        // ดึง Chat Rooms
        const resChats = await fetch('/api/admin/chats', { headers: { 'X-Admin-Key': key } })
        // ดึง System Status
        const resStatus = await fetch('/api/admin/system_status', { headers: { 'X-Admin-Key': key } })
        
        if (resHistory.ok && resStatus.ok && resChats.ok) {
            const jsonHistory = await resHistory.json()
            const jsonChats = await resChats.json()
            const jsonStatus = await resStatus.json()
            
            setData(jsonHistory.data)
            setChats(jsonChats.data)
            
            // ถ้าเปิดแชทใครค้างไว้ ให้อัปเดตข้อความในห้องนั้นด้วย
            if (selectedChat) {
                const updatedChat = jsonChats.data.find(c => c.session_id === selectedChat.session_id)
                if (updatedChat) setSelectedChat(updatedChat)
            }

            if (jsonHistory.pagination) {
                setPage(jsonHistory.pagination.page)
                setTotalPages(jsonHistory.pagination.total_pages)
                setTotalDocs(jsonHistory.pagination.total_docs)
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

  // --- 4. Actions ---
  const handleLogin = (e) => { e.preventDefault(); fetchAllData(secretKey, 1) }
  const handleRefresh = () => fetchAllData(secretKey, page)
  const handleLogout = () => { localStorage.removeItem('admin_key'); setIsAuthenticated(false); setSecretKey('') }
  
  const handleReply = async () => {
      if (!replyMsg.trim() || !selectedChat) return;
      try {
          await fetch('/api/admin/reply', {
              method: 'POST',
              headers: { 'X-Admin-Key': secretKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: selectedChat.session_id, message: replyMsg })
          })
          setReplyMsg('')
          fetchAllData(secretKey, page, true) // Force refresh immediately
      } catch (e) {
          alert("Reply failed")
      }
  }

  const toggleSystem = async () => {
      if (!window.confirm("ยืนยันเปลี่ยนสถานะระบบ (เปิด/ปิด)?")) return;
      try {
          const res = await fetch('/api/admin/toggle_system', { method: 'POST', headers: { 'X-Admin-Key': secretKey } })
          const data = await res.json()
          setSystemActive(data.is_active)
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
            `"${r.blessing.replace(/"/g, '""').replace(/\n/g, ' ')}"`, `"${r.blessing.replace(/"/g, '""').replace(/\n/g, ' ')}"`, r.image_file
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csvContent));
        link.setAttribute("download", `Riser_Gacha_Export.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { alert("Export Error") }
  }

  // --- 5. Render Login ---
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

  // --- 6. Render Dashboard ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Database size={20} /></div>
          <div className="hidden md:block"><h1 className="text-sm font-bold text-slate-900">Admin Dashboard</h1><p className="text-[10px] text-slate-500">Records: {totalDocs}</p></div>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
          {/* Menu Switcher */}
          <button onClick={() => { setView('history'); setSelectedChat(null) }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${view === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}><Clock size={16} /> History</button>
          <button onClick={() => { setView('inbox'); setSelectedChat(null) }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${view === 'inbox' ? 'bg-pink-50 text-pink-600' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Inbox size={16} /> Inbox 
            {chats.filter(c => !c.is_read).length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full ml-1">{chats.filter(c => !c.is_read).length}</span>}
          </button>
        </div>
        <div className="flex items-center gap-2">
            <div onClick={toggleSystem} className={`cursor-pointer hidden md:flex items-center gap-3 px-4 py-2 rounded-full border transition-all select-none shadow-sm ${systemActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}><div className={`w-3 h-3 rounded-full ${systemActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div><span className="text-xs font-bold uppercase tracking-wide">{systemActive ? 'ONLINE' : 'OFFLINE'}</span><Power size={14} /></div>
            <button onClick={handleRefresh} className="p-2 rounded-full bg-slate-100 text-slate-600 hover:text-blue-600"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            <button onClick={exportToCSV} className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100"><FileDown size={14} /> CSV</button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-red-500 px-3 py-2 rounded-lg border border-red-100 hover:bg-red-50"><LogOut size={14} /> Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        
        {/* === VIEW: HISTORY === */}
        {view === 'history' && (
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
        )}

        {/* === VIEW: INBOX (CHAT SYSTEM) === */}
        {view === 'inbox' && (
            <div className="flex flex-col md:flex-row h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                
                {/* Left Side: Chat List */}
                <div className={`w-full md:w-1/3 border-r border-slate-200 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">Inbox ({chats.length})</div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {chats.map(c => (
                            <div key={c.session_id} onClick={() => setSelectedChat(c)} className={`p-3 rounded-xl cursor-pointer transition-colors ${!c.is_read ? 'bg-pink-50 border border-pink-200' : 'hover:bg-slate-100 border border-transparent'} ${selectedChat?.session_id === c.session_id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : ''}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`font-bold text-sm ${!c.is_read ? 'text-pink-600' : 'text-slate-700'}`}>{c.name}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(c.last_updated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className={`text-xs truncate ${!c.is_read ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{c.last_message}</p>
                            </div>
                        ))}
                        {chats.length === 0 && <div className="text-center text-slate-400 py-10 text-sm">No messages yet.</div>}
                    </div>
                </div>

                {/* Right Side: Chat Window */}
                <div className={`w-full md:w-2/3 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
                    {!selectedChat ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                            <MessageCircle size={48} className="mb-2" />
                            <p>Select a conversation</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="p-3 border-b border-slate-200 flex items-center gap-3 bg-white shadow-sm z-10">
                                <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={18} /></button>
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        {selectedChat.name}
                                        <span className="text-[10px] font-normal px-2 py-0.5 bg-slate-100 rounded text-slate-500">{selectedChat.session_id.substring(0,6)}...</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                                {selectedChat.messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${m.sender === 'admin' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}`}>
                                            {m.text}
                                            <div className={`text-[9px] mt-1 text-right ${m.sender==='admin'?'text-blue-200':'text-slate-400'}`}>{new Date(m.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Input */}
                            <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                                    placeholder="Type a reply..." 
                                    value={replyMsg} 
                                    onChange={e => setReplyMsg(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && handleReply()} 
                                />
                                <button onClick={handleReply} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2">
                                    <Send size={16} /> <span className="hidden sm:inline">Send</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}
      </main>
    </div>
  )
}