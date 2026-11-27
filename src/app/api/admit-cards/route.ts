import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'
import { generateClassRollNo } from '@/lib/admitCardHelpers'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const url = new URL(req.url)
        const courseId = url.searchParams.get('courseId')
        const batchId = url.searchParams.get('batchId')

        const where: any = { tenantId: user!.tenantId }
        if (courseId) where.courseId = courseId
        if (batchId) where.batchId = batchId

        const events = await prisma.admitCardEvent.findMany({
            where,
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                _count: { select: { admitCards: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: events })
    } catch (err) {
        console.error('Fetch admit card events error:', err)
        return NextResponse.json({ error: 'Failed to fetch admit card events' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { courseId, batchId, examName, startDate, endDate } = body

        if (!courseId || !examName || !startDate || !endDate) {
            return NextResponse.json({ error: 'Required fields missing: Class, Exam Name, Start Date, and End Date are mandatory' }, { status: 400 })
        }

        // Fetch course name for class-wise roll number generation
        const course = await prisma.course.findFirst({
            where: { id: courseId, tenantId: user!.tenantId },
            select: { name: true }
        })

        // Resolved optional batchId
        const resolvedBatchId = batchId && batchId !== 'all' ? batchId : null

        // Get active, non-TC students in this class/batch (blocked/inactive & TC generated students excluded)
        const studentWhere: any = {
            tenantId: user!.tenantId,
            courseId,
            status: 'ACTIVE',
            tcGenerated: false
        }
        if (batchId && batchId !== 'all') {
            const hasBatchStudents = await prisma.student.count({
                where: { tenantId: user!.tenantId, courseId, batchId, status: 'ACTIVE', tcGenerated: false }
            })
            if (hasBatchStudents > 0) {
                studentWhere.batchId = batchId
            }
        }

        const students = await prisma.student.findMany({
            where: studentWhere,
            select: { id: true },
            orderBy: { fullName: 'asc' }
        })

        if (students.length === 0) {
            return NextResponse.json({ error: 'No eligible active students found in this class (blocked & TC generated students are excluded).' }, { status: 400 })
        }

        const courseName = course?.name || ''
        const event = await prisma.admitCardEvent.create({
            data: {
                tenantId: user!.tenantId,
                courseId,
                batchId: resolvedBatchId,
                examName,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                createdBy: user!.userId,
                timeTable: body.timeTable || [],
                admitCards: {
                    create: students.map((s, idx) => ({
                        tenantId: user!.tenantId,
                        studentId: s.id,
                        rollNo: generateClassRollNo(courseName, idx)
                    }))
                }
            }
        })

        return NextResponse.json({ success: true, data: event }, { status: 201 })
    } catch (err) {
        console.error('Create admit card event error:', err)
        return NextResponse.json({ error: 'Failed to create admit card event' }, { status: 500 })
    }
}
