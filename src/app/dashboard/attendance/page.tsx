'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Course { id: string; name: string }
interface Batch { id: string; name: string; courseId: string; courseName: string }
interface Student { id: string; fullName: string; courseId: string; batchId?: string | null; scholarNo?: string }

const statusOptions = [
    { value: 'PRESENT', label: '✅ Present', color: '#10b981' },
    { value: 'ABSENT', label: '❌ Absent', color: '#ef4444' },
    { value: 'LATE', label: '⏰ Late', color: '#f59e0b' },
    { value: 'HALF_DAY', label: '🌓 Half Day', color: '#06b6d4' },
    { value: 'LEAVE', label: '🏖️ Leave', color: '#8b5cf6' },
]

export default function AttendancePage() {
    const { token } = useAuth()
    const [courses, setCourses] = useState<Course[]>([])
    const [batches, setBatches] = useState<Batch[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [selectedCourse, setSelectedCourse] = useState('')
    const [selectedBatch, setSelectedBatch] = useState('')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [attendance, setAttendance] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState({ show: false, success: true, msg: '' })

    useEffect(() => {
        if (!token) return
        Promise.all([
            fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/batches', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]).then(([c, b, s]) => {
            if (c.success) setCourses(c.data || [])
            if (b.success) setBatches(b.data || [])
            if (s.success) setStudents(s.data || [])
        })
    }, [token])

    const filteredBatches = batches.filter(b => !selectedCourse || b.courseId === selectedCourse)

    const classStudents = students.filter(s => {
        if (!selectedCourse) return false
        if (s.courseId !== selectedCourse) return false
        if (selectedBatch && selectedBatch !== 'all') return s.batchId === selectedBatch
        return true
    })

    // Initialize and load existing attendance
    useEffect(() => {
        if (classStudents.length > 0 && selectedCourse) {
            const query = selectedBatch && selectedBatch !== 'all' 
                ? `batchId=${selectedBatch}&date=${selectedDate}` 
                : `courseId=${selectedCourse}&date=${selectedDate}`

            fetch(`/api/attendance?${query}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                const init: Record<string, string> = {}
                classStudents.forEach(s => { init[s.id] = 'PRESENT' }) // default
                if (d.success && d.data) {
                    d.data.forEach((a: any) => {
                        init[a.studentId] = a.status
                    })
                }
                setAttendance(init)
            })
        }
    }, [selectedCourse, selectedBatch, selectedDate, token])

    const markAll = (status: string) => {
        const all: Record<string, string> = {}
        classStudents.forEach(s => { all[s.id] = status })
        setAttendance(all)
    }

    const saveAttendance = async () => {
        if (!selectedCourse || classStudents.length === 0) return
        setSaving(true)
        const records = classStudents.map(s => ({
            studentId: s.id,
            batchId: s.batchId || (selectedBatch !== 'all' ? selectedBatch : null) || null,
            date: selectedDate,
            status: attendance[s.id] || 'PRESENT',
        }))
        const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ records }),
        })
        const data = await res.json()
        setSaving(false)
        if (data.success) {
            setToast({ show: true, success: true, msg: `Attendance saved for ${records.length} students!` })
            setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
        }
    }

    const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length
    const absentCount = Object.values(attendance).filter(s => s === 'ABSENT').length
    const totalInBatch = classStudents.length

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">✅ Attendance Management</h1>
                    <p className="page-subtitle">Mark daily attendance for classes & optional sections</p>
                </div>
            </div>

            {toast.show && (
                <div className={`toast ${toast.success ? 'toast-success' : 'toast-error'}`} style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>
                    {toast.success ? '✓' : '⚠️'} {toast.msg}
                </div>
            )}

            {/* Controls */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <label className="label">1. Select Class *</label>
                        <select className="input" value={selectedCourse} onChange={e => {
                            setSelectedCourse(e.target.value)
                            setSelectedBatch('')
                        }}>
                            <option value="">Choose a class...</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <label className="label">2. Section / Batch (Optional)</label>
                        <select 
                            className="input" 
                            value={selectedBatch} 
                            onChange={e => setSelectedBatch(e.target.value)}
                            disabled={!selectedCourse}
                        >
                            <option value="">{filteredBatches.length > 0 ? '-- All Sections / Whole Class --' : '-- Whole Class (No Sections) --'}</option>
                            {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">3. Date</label>
                        <input className="input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: '180px' }} />
                    </div>
                </div>
            </div>

            {selectedCourse && classStudents.length > 0 && (
                <>
                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Total', value: totalInBatch, color: '#6366f1' },
                            { label: 'Present', value: presentCount, color: '#10b981' },
                            { label: 'Absent', value: absentCount, color: '#ef4444' },
                            { label: 'Other', value: totalInBatch - presentCount - absentCount, color: '#f59e0b' },
                        ].map(st => (
                            <div key={st.label} className="card" style={{ flex: '1 1 120px', padding: '14px 18px', borderLeft: `4px solid ${st.color}` }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{st.label}</div>
                                <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: st.color }}>{st.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Quick Mark:</span>
                        {statusOptions.map(s => (
                            <button key={s.value} onClick={() => markAll(s.value)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Attendance List */}
                    <div className="card" style={{ padding: 0, marginBottom: '20px' }}>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Scholar No</th>
                                        <th>Student</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classStudents.map((student, i) => {
                                        const currentStatus = attendance[student.id] || 'PRESENT'
                                        return (
                                            <tr key={student.id}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{i + 1}</td>
                                                <td style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '13px' }}>
                                                    {student.scholarNo || '-'}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{student.fullName.charAt(0)}</div>
                                                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{student.fullName}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {statusOptions.map(s => (
                                                            <button key={s.value} onClick={() => setAttendance(prev => ({ ...prev, [student.id]: s.value }))}
                                                                style={{
                                                                    padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                                                                    cursor: 'pointer', border: `1px solid ${s.color}40`,
                                                                    background: currentStatus === s.value ? `${s.color}20` : 'transparent',
                                                                    color: currentStatus === s.value ? s.color : 'var(--text-muted)',
                                                                    transition: 'all 0.15s',
                                                                }}>
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={saveAttendance} className="btn btn-primary btn-lg" disabled={saving}>
                            {saving ? <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Saving...</> : '💾 Save Attendance'}
                        </button>
                    </div>
                </>
            )}

            {selectedCourse && classStudents.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👩‍🎓</div>
                    <p style={{ color: 'var(--text-secondary)' }}>No students found in this class{selectedBatch ? ' / section' : ''}</p>
                </div>
            )}

            {!selectedCourse && (
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Select a class above to mark attendance</p>
                </div>
            )}
        </div>
    )
}
