import { useState } from 'react'
import { Lock, Database, Clock, Image as ImageIcon, LogOut, Trash2 } from 'lucide-react' // เพิ่ม Trash2

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/admin/history', {
        headers: { 'X-Admin-Key': secretKey }
      })
      
      if (res.status === 200) {
        const json = await res.json()
        setData(json.data)
        setIsAuthenticated(true)
      } else {
        alert("❌ Access Denied: รหัสผ่านไม่ถูกต้อง")
      }
    } catch (err) {
      alert("Error connecting to server")
    } finally {
      setLoading(false)
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
            // ลบสำเร็จ -> เอาออกจากหน้าจอนี้ทันที
            setData(data.filter(item => item.ip_hash !== ipHash))
        } else {
            alert("ลบไม่สำเร็จ")
        }
    } catch (err) {
        console.error(err)
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setSecretKey('')
    setData([])
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
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-[10px] text-slate-500">History Log ({data.length})</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-100"
        >
          <LogOut size={14} /> Logout
        </button>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium w-40">Timestamp</th>
                  <th className="px-6 py-4 font-medium">User Info</th>
                  <th className="px-6 py-4 font-medium">Message</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 text-slate-400 text-xs flex items-center gap-2">
                      <Clock size={12} />
                      {new Date(log.played_at).toLocaleString('th-TH')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{log.name || 'Anonymous'}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                        log.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {log.gender === 'male' ? 'BOY SIDE' : 'GIRL SIDE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 italic text-xs max-w-xs truncate">
                      "{log.blessing}"
                    </td>
                    <td className="px-6 py-4 text-right">
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
      </main>
    </div>
  )
}