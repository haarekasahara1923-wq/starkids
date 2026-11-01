'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ShieldAlert, Lock, ArrowRight, Home } from 'lucide-react'

export default function SchoolSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [step, setStep] = useState(1) // 1 = school info, 2 = admin info
  const [limitReached, setLimitReached] = useState(false)
  const [checkingLimit, setCheckingLimit] = useState(true)

  const [form, setForm] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    directorName: '',
    directorPhone: '',
    directorEmail: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Check on load if single tenant limit is reached
  useEffect(() => {
    fetch('/api/auth/school-signup')
      .then(res => res.json())
      .then(data => {
        if (data && data.allowed === false) {
          setLimitReached(true)
        }
      })
      .catch(err => {
        console.error('Failed to check tenant status:', err)
      })
      .finally(() => {
        setCheckingLimit(false)
      })
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.schoolName.trim()) { setError('School name is required'); return }
    if (!form.directorName.trim()) { setError('Director name is required'); return }
    if (!form.schoolAddress.trim()) { setError('School address is required'); return }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password) { setError('Email and password are required'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/school-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: form.schoolName,
          schoolAddress: form.schoolAddress,
          schoolPhone: form.schoolPhone,
          schoolEmail: form.schoolEmail,
          directorName: form.directorName,
          directorPhone: form.directorPhone,
          directorEmail: form.directorEmail || form.email,
          email: form.email,
          password: form.password,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.limitReached || res.status === 403) {
          setLimitReached(true)
          setLoading(false)
          return
        }
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      // Store in localStorage with starkids_ prefix
      localStorage.setItem('starkids_token', data.accessToken)
      localStorage.setItem('starkids_user', JSON.stringify(data.user))
      localStorage.setItem('starkids_tenant', JSON.stringify(data.tenant))
      localStorage.setItem('starkids_refresh', data.refreshToken)

      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '6px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080614', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" }}>

      {/* SIGN UP DENIED / SINGLE TENANT POPUP */}
      {limitReached && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            maxWidth: '500px', width: '100%',
            background: 'linear-gradient(145deg, #1f0808, #0e0303)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: '24px',
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 30px 90px rgba(239,68,68,0.35)',
            position: 'relative',
          }}>
            <div style={{
              width: '80px', height: '80px',
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid rgba(239,68,68,0.4)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#ef4444',
            }}>
              <ShieldAlert size={44} />
            </div>

            <div style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              color: '#f87171',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}>
              Sign Up Denied
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'white', marginBottom: '14px', lineHeight: 1.25 }}>
              Single Tenant Restriction
            </h2>

            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '26px',
              textAlign: 'left',
            }}>
              <p style={{ fontSize: '14px', color: '#fecaca', lineHeight: '1.7', margin: '0 0 10px 0', fontWeight: '500' }}>
                🚫 <strong>Is application par kewal ek hi school (STAR KIDS Public School) permitted hai.</strong>
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.7', margin: 0 }}>
                Doosra (second) tenant ya naya school sign up karne ki anumati nahi hai. Ye platform dedicated single-school configuration par active hai.
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6', margin: '10px 0 0 0' }}>
                Only a single tenant is allowed on this platform. Second tenant signup is permanently blocked.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/login" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                color: 'white', borderRadius: '12px', textDecoration: 'none',
                fontSize: '14px', fontWeight: '700',
                boxShadow: '0 8px 24px rgba(220,38,38,0.4)',
              }}>
                <Lock size={16} /> Sign In to Existing School
              </Link>

              <Link href="/" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 28px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', borderRadius: '12px', textDecoration: 'none',
                fontSize: '13px', fontWeight: '600',
              }}>
                <Home size={16} /> Return to Home
              </Link>
            </div>

            <p style={{ marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              STAR KIDS Public School — Dedicated School ERP
            </p>
          </div>
        </div>
      )}

      {/* Background gradients */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>
            🏫
          </div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>STAR KIDS PUBLIC SCHOOL</div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', lineHeight: 1.2, marginBottom: '8px' }}>
            School Portal Setup
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Apne school ka digital portal setup karein
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center', justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: step >= s ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${step >= s ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '700', color: step >= s ? 'white' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s',
              }}>
                {step > s ? '✓' : s}
              </div>
              <span style={{ fontSize: '12px', color: step >= s ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                {s === 1 ? 'School Info' : 'Login Setup'}
              </span>
              {s < 2 && <div style={{ width: '40px', height: '1px', background: step > s ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

          {step === 1 && (
            <form onSubmit={handleNext}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                  <strong style={{ color: '#c4b5fd' }}>Step 1:</strong> Tell us about your school
                </div>

                <label style={labelStyle}>School / Institution Name *</label>
                <input
                  type="text" required value={form.schoolName}
                  onChange={e => set('schoolName', e.target.value)}
                  placeholder="e.g., Sunrise International Academy"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Director / Principal Name *</label>
                <input
                  type="text" required value={form.directorName}
                  onChange={e => set('directorName', e.target.value)}
                  placeholder="Full name of school director"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Contact Number *</label>
                <input
                  type="tel" required value={form.directorPhone}
                  onChange={e => set('directorPhone', e.target.value)}
                  placeholder="Director's mobile number"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>School Address *</label>
                <textarea
                  required value={form.schoolAddress}
                  onChange={e => set('schoolAddress', e.target.value)}
                  placeholder="Full address of the school including city, state"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>School Phone (Optional)</label>
                  <input
                    type="tel" value={form.schoolPhone}
                    onChange={e => set('schoolPhone', e.target.value)}
                    placeholder="School landline"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>School Email (Optional)</label>
                  <input
                    type="email" value={form.schoolEmail}
                    onChange={e => set('schoolEmail', e.target.value)}
                    placeholder="school@example.com"
                    style={inputStyle}
                  />
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#fca5a5' }}>{error}</div>
              )}

              <button type="submit" style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}>
                Continue to Login Setup →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                <strong style={{ color: '#c4b5fd' }}>Step 2:</strong> Set up your login credentials. You will use these to access your school admin panel.
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Admin Email *</label>
                <input
                  type="email" required value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="your@email.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'} required value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Minimum 6 characters"
                    style={{ ...inputStyle, paddingRight: '48px' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '42px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    placeholder="Re-enter your password"
                    style={{ ...inputStyle, paddingRight: '48px' }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '42px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#fca5a5' }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setStep(1); setError('') }} style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}>
                  {loading ? 'Setting up...' : 'Complete Setup 🚀'}
                </button>
              </div>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Already registered your school?{' '}
            </span>
            <Link href="/login" style={{ fontSize: '13px', color: '#a78bfa', fontWeight: '600', textDecoration: 'none' }}>
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
