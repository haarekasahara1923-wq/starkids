import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth'

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50)
}

async function generateUniqueSchoolCode(): Promise<string> {
    const year = new Date().getFullYear()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    let exists = false
    do {
        const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        code = 'SCL-' + year + '-' + rand
        exists = !!(await prisma.tenant.findUnique({ where: { schoolCode: code } }))
    } while (exists)
    return code
}

// GET: Check if school signup is allowed (Single Tenant check)
export async function GET() {
    try {
        const totalSchools = await prisma.tenant.count()
        const isAllowed = totalSchools < 1
        return NextResponse.json({
            allowed: isAllowed,
            count: totalSchools,
            limit: 1,
            message: !isAllowed
                ? 'Sign Up Denied: Only one single school tenant is permitted on this platform. Second tenant registration is not permitted.'
                : 'Registration available'
        })
    } catch (error) {
        console.error('School signup check error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { schoolName, schoolAddress, schoolPhone, schoolEmail, directorName, directorPhone, directorEmail, email, password } = body

        if (!schoolName || !directorName || !email || !password) {
            return NextResponse.json({ error: 'School name, director name, email and password are required' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }

        const existingUser = await prisma.user.findFirst({ where: { email: email.toLowerCase() } })
        if (existingUser) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
        }

        // Single Tenant Restriction: Only 1 school tenant is allowed on this platform
        const totalSchools = await prisma.tenant.count()
        if (totalSchools >= 1) {
            return NextResponse.json({
                error: 'Sign Up Denied: Only one school (single-tenant) is permitted on this platform. Second tenant registration is not permitted.',
                limitReached: true,
                code: 'SINGLE_TENANT_LIMIT_REACHED',
            }, { status: 403 })
        }

        let baseSlug = generateSlug(schoolName)
        let slug = baseSlug
        let count = 1
        while (await prisma.tenant.findUnique({ where: { slug } })) {
            slug = baseSlug + '-' + (count++)
        }

        const schoolCode = await generateUniqueSchoolCode()
        const hashedPassword = await hashPassword(password)

        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: schoolName,
                    slug,
                    schoolCode,
                    address: schoolAddress || null,
                    phone: schoolPhone || null,
                    email: schoolEmail || null,
                    isActive: true,
                    directorName,
                    directorPhone: directorPhone || null,
                    directorEmail: directorEmail || email,
                }
            })

            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email: email.toLowerCase(),
                    phone: directorPhone || null,
                    password: hashedPassword,
                    plainPassword: password,
                    name: directorName,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                }
            })

            const trialEnd = new Date()
            trialEnd.setDate(trialEnd.getDate() + 30)

            await tx.subscription.create({
                data: {
                    tenantId: tenant.id,
                    plan: 'BASIC',
                    status: 'TRIAL',
                    trialEndsAt: trialEnd,
                }
            })

            return { tenant, user }
        })

        const payload = {
            userId: result.user.id,
            tenantId: result.tenant.id,
            role: 'SUPER_ADMIN',
            email: email.toLowerCase(),
        }

        const accessToken = signAccessToken(payload)
        const refreshToken = signRefreshToken(payload)

        return NextResponse.json({
            success: true,
            message: 'School registered successfully! Welcome to STAR KIDS Public School Management System.',
            accessToken,
            refreshToken,
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: 'SUPER_ADMIN',
                tenantId: result.tenant.id,
            },
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
                schoolCode: result.tenant.schoolCode,
                registrationCode: result.tenant.registrationCode,
                diseCode: result.tenant.diseCode,
                themeColor: result.tenant.themeColor,
            }
        }, { status: 201 })
    } catch (error) {
        console.error('School signup error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
