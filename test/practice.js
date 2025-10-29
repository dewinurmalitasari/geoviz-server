import {test} from 'node:test'
import assert from 'node:assert'
import {build} from '../server.js'
import Practice from '../model/Practice.js'
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

const TEST_PRACTICE = {
    code: 'algebra_basics_001',
    score: {
        correct: 8,
        total: 10
    },
    content: {
        topic: 'Algebra Basics',
        exercises: [
            {question: '2 + 3 = ?', answer: '5'},
            {question: '5 - 2 = ?', answer: '3'}
        ]
    }
}

const TEST_PRACTICE_2 = {
    code: 'geometry_fundamentals_001',
    score: {
        correct: 7,
        total: 12
    },
    content: {
        topic: 'Geometry Fundamentals',
        exercises: [
            {question: 'Area of circle with r=5', answer: '78.5'}
        ]
    }
}

const UPDATED_PRACTICE = {
    code: 'algebra_basics_002',
    score: {
        correct: 9,
        total: 10
    },
    content: {
        topic: 'Advanced Algebra',
        exercises: [
            {question: '3x + 5 = 20', answer: 'x=5'}
        ]
    }
}

let fastify
let adminToken
let teacherToken
let studentToken
let studentToken2
let studentId
let studentId2
let createdPracticeId
let secondPracticeId

test('Practice API Tests', async (t) => {
    // Setup: Create Fastify instance and ensure test users exist
    await t.test('Setup - Initialize server and ensure test users exist', async (t) => {
        fastify = await build()

        // Clean up any existing test data
        await Practice.deleteMany({})
        await User.deleteMany({
            username: {$in: ['teacher1', 'student1', 'student2', 'admin']}
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
        assert.strictEqual(data.user.username, TEST_ADMIN.username)
        assert.strictEqual(data.user.role, TEST_ADMIN.role)
        assert.ok(data.token)

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

    // Test 5: Submit practice as student (success)
    await t.test('Submit practice as student - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: TEST_PRACTICE
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.ok(data.practice)
        assert.strictEqual(data.practice.code, TEST_PRACTICE.code)
        assert.strictEqual(data.practice.score.correct, TEST_PRACTICE.score.correct)
        assert.strictEqual(data.practice.score.total, TEST_PRACTICE.score.total)
        assert.deepStrictEqual(data.practice.content, TEST_PRACTICE.content)
        assert.strictEqual(data.practice.user, studentId)
        assert.ok(data.practice._id)
        assert.ok(data.practice.createdAt)

        createdPracticeId = data.practice._id
    })

    // Test 6: Submit practice without authentication (should fail)
    await t.test('Submit practice without authentication - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            payload: TEST_PRACTICE
        })

        assert.strictEqual(response.statusCode, 401)
    })

    // Test 7: Submit practice as teacher (should fail - unauthorized)
    await t.test('Submit practice as teacher - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: TEST_PRACTICE_2
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 8: Submit practice as admin (should fail - unauthorized)
    await t.test('Submit practice as admin - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_PRACTICE_2
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 9: Submit practice with missing required fields
    await t.test('Submit practice with missing required fields', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                // Missing code and score
                content: {topic: 'Test'}
            }
        })

        assert.strictEqual(response.statusCode, 400)
    })

    // Test 10: Submit practice with incomplete score
    await t.test('Submit practice with incomplete score', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                code: 'test_code',
                score: {
                    correct: 5
                    // Missing total
                }
            }
        })

        assert.strictEqual(response.statusCode, 400)
    })

    // Test 11: Submit second practice as student
    await t.test('Submit second practice as student', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: TEST_PRACTICE_2
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.practice.code, TEST_PRACTICE_2.code)
        secondPracticeId = data.practice._id
    })

    // Test 12: Get practices by user ID as admin (success)
    await t.test('Get practices by user ID as admin', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.practices)
        assert.strictEqual(data.practices.length, 2)

        // Check practices are in correct order (newest first)
        assert.strictEqual(data.practices[0].code, TEST_PRACTICE_2.code)
        assert.strictEqual(data.practices[1].code, TEST_PRACTICE.code)

        // Check all fields are present
        data.practices.forEach(practice => {
            assert.ok(practice._id)
            assert.ok(practice.code)
            assert.ok(practice.score)
            assert.ok(practice.score.correct)
            assert.ok(practice.score.total)
            assert.ok(practice.user)
            assert.ok(practice.createdAt)
            assert.ok(practice.updatedAt)
        })
    })

    // Test 13: Get practices by user ID as teacher (success)
    await t.test('Get practices by user ID as teacher', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${studentId}`,
            headers: {
                authorization: `Bearer ${teacherToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.practices)
        assert.strictEqual(data.practices.length, 2)
    })

    // Test 14: Get practices by user ID as same student (success)
    await t.test('Get practices by own user ID as student', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${studentId}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.practices)
        assert.strictEqual(data.practices.length, 2)
    })

    // Test 15: Get practices by different user ID as student (should fail)
    await t.test('Get practices by different user ID as student - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${studentId2}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 403)
        const data = response.json()
        assert.strictEqual(data.message, 'Forbidden')
    })

    // Test 16: Get practices for non-existent user ID
    await t.test('Get practices for non-existent user ID', async (t) => {
        const fakeId = new mongoose.Types.ObjectId()
        const response = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${fakeId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.practices)
        assert.strictEqual(data.practices.length, 0)
    })

    // Test 17: Get practices with invalid user ID format
    await t.test('Get practices with invalid user ID format', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/practices/user/invalid-id-format',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 500)
        const data = response.json()
        assert.ok(data.message.includes('Cast to ObjectId failed'))
    })

    // Test 18: Submit practice as student 2
    await t.test('Submit practice as student 2', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${studentToken2}`
            },
            payload: {
                code: 'student2_practice',
                score: {
                    correct: 6,
                    total: 8
                },
                content: {
                    topic: 'Student 2 Practice'
                }
            }
        })

        assert.strictEqual(response.statusCode, 201)
    })

    // Test 19: Verify practices are properly separated by user
    await t.test('Verify practices are properly separated by user', async (t) => {
        // Check student 1 practices
        const response1 = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response1.statusCode, 200)
        const data1 = response1.json()
        assert.strictEqual(data1.practices.length, 2)
        data1.practices.forEach(practice => {
            assert.strictEqual(practice.user, studentId)
        })

        // Check student 2 practices
        const response2 = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${studentId2}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response2.statusCode, 200)
        const data2 = response2.json()
        assert.strictEqual(data2.practices.length, 1)
        assert.strictEqual(data2.practices[0].user, studentId2)
    })

    // Test 20: Get practices without authentication (should fail)
    await t.test('Get practices without authentication - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/practices/user/${studentId}`
        })

        assert.strictEqual(response.statusCode, 401)
    })

    // Test 21: Validation tests - Submit practice with invalid score values
    await t.test('Submit practice with invalid score values', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/practices',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                code: 'invalid_score',
                score: {
                    correct: -5, // Negative value
                    total: 10
                }
            }
        })

        // This might pass validation depending on your schema, adjust accordingly
        // If your schema has min: 0 for score values, this should fail
        assert.strictEqual(response.statusCode, 400)
    })

    // Test 22: Clean up - remove all test data
    await t.test('Clean up test data', async (t) => {
        await Practice.deleteMany({})
        await User.deleteMany({
            username: {$in: ['teacher1', 'student1', 'student2', 'admin']}
        })

        const remainingPractices = await Practice.find({})
        const remainingTestUsers = await User.find({
            username: {$in: ['teacher1', 'student1', 'student2', 'admin']}
        })

        assert.strictEqual(remainingPractices.length, 0)
        assert.strictEqual(remainingTestUsers.length, 0)
        console.log('Practice test data cleaned up successfully')
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