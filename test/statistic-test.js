import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../server.js'
import Statistic from '../model/Statistic.js'
import User from '../model/User.js'
import mongoose from "mongoose"

// Test data
const TEST_ADMIN = {
    username: 'admin',
    password: 'thisIsAdmin123',
    role: 'admin'
}

const TEST_TEACHER = {
    username: 'teacher1',
    password: 'teacherPass123',
    role: 'teacher'
}

const TEST_STUDENT = {
    username: 'student1',
    password: 'studentPass123',
    role: 'student'
}

const TEST_STUDENT_2 = {
    username: 'student2',
    password: 'studentPass456',
    role: 'student'
}

// Test statistic data
const TEST_VISIT_STAT = {
    type: 'visit',
    data: {}
}

const TEST_MATERIAL_STAT = {
    type: 'material',
    data: {
        material: '507f1f77bcf86cd799439011' // Example material ID
    }
}

const TEST_PRACTICE_STAT = {
    type: 'practice',
    data: {
        code: 'algebra_basics_001'
    }
}

const TEST_PRACTICE_COMPLETED_STAT = {
    type: 'practice_completed',
    data: {
        code: 'algebra_basics_001',
        practice: '507f1f77bcf86cd799439012' // Example practice ID
    }
}

let fastify
let adminToken
let teacherToken
let studentToken
let studentToken2
let studentId
let studentId2
let createdStatisticId

test('Statistic API Tests', async (t) => {
    // Setup: Create Fastify instance and ensure test users exist
    await t.test('Setup - Initialize server and ensure test users exist', async (t) => {
        fastify = await build()

        // Clean up any existing test data
        await Statistic.deleteMany({})
        await User.deleteMany({
            username: { $in: ['teacher1', 'student1', 'student2', 'admin'] }
        })

        // Create test users
        let adminUser = new User(TEST_ADMIN)
        await adminUser.save()

        let teacherUser = new User(TEST_TEACHER)
        await teacherUser.save()

        let studentUser = new User(TEST_STUDENT)
        await studentUser.save()
        studentId = studentUser._id.toString()

        let studentUser2 = new User(TEST_STUDENT_2)
        await studentUser2.save()
        studentId2 = studentUser2._id.toString()
    })

    // Test 1: Admin login
    await t.test('Admin login', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/login',
            payload: {
                username: TEST_ADMIN.username,
                password: TEST_ADMIN.password
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        adminToken = data.token
    })

    // Test 2: Teacher login
    await t.test('Teacher login', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/login',
            payload: {
                username: TEST_TEACHER.username,
                password: TEST_TEACHER.password
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        teacherToken = data.token
    })

    // Test 3: Student login
    await t.test('Student login', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/login',
            payload: {
                username: TEST_STUDENT.username,
                password: TEST_STUDENT.password
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        studentToken = data.token
    })

    // Test 4: Student 2 login
    await t.test('Student 2 login', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/login',
            payload: {
                username: TEST_STUDENT_2.username,
                password: TEST_STUDENT_2.password
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        studentToken2 = data.token
    })

    // Test 5: Track visit statistic as student (success)
    await t.test('Track visit statistic as student - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: TEST_VISIT_STAT
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.ok(data.statistic)
        assert.strictEqual(data.statistic.type, TEST_VISIT_STAT.type)
        assert.deepStrictEqual(data.statistic.data, TEST_VISIT_STAT.data)
        assert.strictEqual(data.statistic.user, studentId)
        assert.ok(data.statistic._id)
        assert.ok(data.statistic.createdAt)

        createdStatisticId = data.statistic._id
    })

    // Test 6: Track material statistic as student (success)
    await t.test('Track material statistic as student - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: TEST_MATERIAL_STAT
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.statistic.type, TEST_MATERIAL_STAT.type)
        assert.strictEqual(data.statistic.data.material, TEST_MATERIAL_STAT.data.material)
    })

    // Test 7: Track practice statistic as student (success)
    await t.test('Track practice statistic as student - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: TEST_PRACTICE_STAT
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.statistic.type, TEST_PRACTICE_STAT.type)
        assert.strictEqual(data.statistic.data.code, TEST_PRACTICE_STAT.data.code)
    })

    // Test 8: Track statistic without authentication (should fail)
    await t.test('Track statistic without authentication - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            payload: TEST_VISIT_STAT
        })

        assert.strictEqual(response.statusCode, 401)
    })

    // Test 9: Track statistic as teacher (should fail - unauthorized)
    await t.test('Track statistic as teacher - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: TEST_VISIT_STAT
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 10: Track statistic as admin (should fail - unauthorized)
    await t.test('Track statistic as admin - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_VISIT_STAT
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 11: Track statistic with missing required fields
    await t.test('Track statistic with missing required fields', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                // Missing type and data
            }
        })

        assert.strictEqual(response.statusCode, 400)
    })

    // Test 12: Track statistic with invalid type
    await t.test('Track statistic with invalid type', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                type: 'invalid_type',
                data: {}
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'body/type must be equal to one of the allowed values')
    })

    // Test 13: Track visit statistic with non-empty data (should fail)
    await t.test('Track visit statistic with non-empty data - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                type: 'visit',
                data: { extra: 'data' } // Should be empty for visit type
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'Visit data must be empty')
    })

    // Test 14: Track material statistic without material ID (should fail)
    await t.test('Track material statistic without material ID - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                type: 'material',
                data: {} // Missing material ID
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'Material ID is required')
    })

    // Test 15: Track practice statistic without code (should fail)
    await t.test('Track practice statistic without code - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                type: 'practice',
                data: {} // Missing code
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'Practice code is required')
    })

    // Test 16: Track practice_completed statistic manually (should fail based on current schema)
    await t.test('Track practice_completed statistic manually - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: TEST_PRACTICE_COMPLETED_STAT
        })

        // This should fail because 'practice_completed' is not in the allowed enum for manual tracking
        assert.strictEqual(response.statusCode, 400)
    })

    // Test 17: Get statistics by user ID as admin (success)
    await t.test('Get statistics by user ID as admin - success', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.statistics)
        assert.strictEqual(data.statistics.length, 3) // From previous tests

        // Check all fields are present
        data.statistics.forEach(statistic => {
            assert.ok(statistic._id)
            assert.ok(statistic.type)
            assert.ok(statistic.data)
            assert.ok(statistic.user)
            assert.ok(statistic.createdAt)
            assert.ok(statistic.updatedAt)
        })
    })

    // Test 18: Get statistics by user ID as teacher (success)
    await t.test('Get statistics by user ID as teacher - success', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId}`,
            headers: {
                authorization: `Bearer ${teacherToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.statistics)
        assert.strictEqual(data.statistics.length, 3)
    })

    // Test 19: Get statistics by user ID as student (should fail - unauthorized for other users)
    await t.test('Get statistics by user ID as student - should fail for other users', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId2}`, // Trying to access another student's stats
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 20: Get statistics without authentication (should fail)
    await t.test('Get statistics without authentication - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId}`
        })

        assert.strictEqual(response.statusCode, 401)
    })

    // Test 21: Verify statistics are properly attributed to users
    await t.test('Verify statistics are properly attributed to users', async (t) => {
        // Track a statistic as student 2
        await fastify.inject({
            method: 'POST',
            url: '/statistics',
            headers: {
                authorization: `Bearer ${studentToken2}`
            },
            payload: TEST_VISIT_STAT
        })

        // Get student 1 statistics as admin
        const response1 = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        // Get student 2 statistics as admin
        const response2 = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId2}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response1.statusCode, 200)
        assert.strictEqual(response2.statusCode, 200)

        const data1 = response1.json()
        const data2 = response2.json()

        // Should have correct statistics for each student
        assert.strictEqual(data1.statistics.length, 3) // student1 has 3 stats
        assert.strictEqual(data2.statistics.length, 1) // student2 has 1 stat

        // Verify all stats belong to the correct user
        data1.statistics.forEach(stat => {
            assert.strictEqual(stat.user, studentId)
        })
        data2.statistics.forEach(stat => {
            assert.strictEqual(stat.user, studentId2)
        })
    })

    // Test 22: Verify statistic types are correctly stored
    await t.test('Verify statistic types are correctly stored', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()

        const visitStats = data.statistics.filter(stat => stat.type === 'visit')
        const materialStats = data.statistics.filter(stat => stat.type === 'material')
        const practiceStats = data.statistics.filter(stat => stat.type === 'practice')

        assert.strictEqual(visitStats.length, 1)
        assert.strictEqual(materialStats.length, 1)
        assert.strictEqual(practiceStats.length, 1)
    })

    // Test 23: Check statistic data structure for different types
    await t.test('Check statistic data structure for different types', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()

        data.statistics.forEach(statistic => {
            switch (statistic.type) {
                case 'visit':
                    assert.deepStrictEqual(statistic.data, TEST_VISIT_STAT.data)
                    break
                case 'material':
                    assert.ok(statistic.data.material)
                    break
                case 'practice':
                    assert.ok(statistic.data.code)
                    assert.strictEqual(typeof statistic.data.code, 'string')
                    break
            }
        })
    })

    // Test 24: Track multiple statistics and verify ordering (newest first)
    await t.test('Track multiple statistics and verify ordering', async (t) => {
        // Track additional statistics
        for (let i = 0; i < 3; i++) {
            await fastify.inject({
                method: 'POST',
                url: '/statistics',
                headers: {
                    authorization: `Bearer ${studentToken}`
                },
                payload: {
                    type: 'visit',
                    data: {}
                }
            })
        }

        const response = await fastify.inject({
            method: 'GET',
            url: `/statistics/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()

        // Verify statistics are ordered by creation date (newest first)
        for (let i = 1; i < data.statistics.length; i++) {
            const current = new Date(data.statistics[i].createdAt)
            const previous = new Date(data.statistics[i - 1].createdAt)
            assert.ok(previous >= current, 'Statistics should be ordered newest first')
        }
    })

    // Test 25: Clean up - remove all test data
    await t.test('Clean up test data', async (t) => {
        await Statistic.deleteMany({})
        await User.deleteMany({
            username: { $in: ['teacher1', 'student1', 'student2', 'admin'] }
        })

        const remainingStatistics = await Statistic.find({})
        const remainingTestUsers = await User.find({
            username: { $in: ['teacher1', 'student1', 'student2', 'admin'] }
        })

        assert.strictEqual(remainingStatistics.length, 0)
        assert.strictEqual(remainingTestUsers.length, 0)
        console.log('Statistic test data cleaned up successfully')
    })

    // Teardown
    await t.test('Teardown - close server and database connections', async (t) => {
        await fastify.close()
        await mongoose.connection.close()

        // Force exit after a short delay to allow connections to close
        setTimeout(() => {
            process.exit(0)
        }, 1000)
    })
})

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    process.exit(1)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
    process.exit(1)
})