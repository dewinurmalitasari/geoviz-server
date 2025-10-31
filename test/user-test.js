import {test} from 'node:test'
import assert from 'node:assert'
import {build} from '../server.js'
import User from '../model/User.js'
import mongoose from "mongoose";

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

let fastify
let adminToken
let teacherToken
let createdUserId

test('User API Tests', async (t) => {
    // Setup: Create Fastify instance and ensure admin exists
    await t.test('Setup - Initialize server and ensure admin exists', async (t) => {
        fastify = await build()

        // Clean up any existing test users
        await User.deleteMany({
            username: {$in: ['teacher1', 'student1', 'student2', 'testuser', 'admin']}
        })

        // Create admin user
        let adminUser = new User(TEST_ADMIN)
        await adminUser.save()
    })

    // Test 0: Wrong login
    await t.test('Wrong login attempt', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/login',
            payload: {
                username: 'admin',
                password: 'wrongpassword'
            }
        })

        assert.strictEqual(response.statusCode, 401)
        const data = response.json()
        assert.strictEqual(data.message, 'Invalid password')

        const response2 = await fastify.inject({
            method: 'POST',
            url: '/login',
            payload: {
                username: 'nonexistentuser',
                password: 'somepassword'
            }
        })

        assert.strictEqual(response2.statusCode, 401)
        const data2 = response2.json()
        assert.strictEqual(data2.message, 'User not found')
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

    // Test 2: Create teacher user (as admin)
    await t.test('Create teacher user as admin', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/users',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_TEACHER
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.user.username, TEST_TEACHER.username)
        assert.strictEqual(data.user.role, TEST_TEACHER.role)
        assert.ok(data.user._id)
    })

    // Test 3: Teacher login
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
        assert.strictEqual(data.user.username, TEST_TEACHER.username)
        assert.strictEqual(data.user.role, TEST_TEACHER.role)
        assert.ok(data.token)

        teacherToken = data.token
    })

    // Test 4: Create student user (as teacher)
    await t.test('Create student user as teacher', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/users',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: TEST_STUDENT
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.user.username, TEST_STUDENT.username)
        assert.strictEqual(data.user.role, TEST_STUDENT.role)
        assert.ok(data.user._id)

        createdUserId = data.user._id
    })

    // Test 5: Check user in database
    await t.test('Check created user in database', async (t) => {
        const user = await User.findById(createdUserId)
        assert.ok(user)
        assert.strictEqual(user.username, TEST_STUDENT.username)
        assert.strictEqual(user.role, TEST_STUDENT.role)
    })

    // Test 6: Update user (as admin)
    await t.test('Update user as admin', async (t) => {
        const updatedData = {
            username: 'updatedstudent',
            password: 'updatedPass123'
        }

        const response = await fastify.inject({
            method: 'PUT',
            url: `/users/${createdUserId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: updatedData
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.user.username, updatedData.username)
    })

    // Test 7: Check update in database
    await t.test('Check updated user in database', async (t) => {
        const user = await User.findById(createdUserId)
        assert.ok(user)
        assert.strictEqual(user.username, 'updatedstudent')

        // Verify password was hashed by checking it's different from plain text
        assert.notStrictEqual(user.password, 'updatedPass123')

        // Verify password actually works
        const passwordMatch = await user.comparePassword('updatedPass123')
        assert.strictEqual(passwordMatch, true)
    })

    // Test 8: Get user by ID
    await t.test('Get user by ID', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/users/${createdUserId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.user)
        assert.strictEqual(data.user._id, createdUserId)
        assert.strictEqual(data.user.username, 'updatedstudent')
        assert.strictEqual(data.user.role, TEST_STUDENT.role)
    })

    // Test 9: Populate with multiple users
    await t.test('Populate with multiple users', async (t) => {
        // Create additional student as teacher
        await fastify.inject({
            method: 'POST',
            url: '/users',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: TEST_STUDENT_2
        })

        // Verify we have multiple users
        const users = await User.find({})
        assert.ok(users.length >= 4) // admin, teacher, student1, student2
    })

    // Test 10: Get all users (as admin)
    await t.test('Get all users as admin', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/users',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.users)
        assert.ok(data.users.length >= 4)

        // Check that passwords are excluded
        data.users.forEach(user => {
            assert.strictEqual(user.password, undefined)
        })
    })

    // Test 10a: Get all users with role filter - admin
    await t.test('Get all users with role filter - admin', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/users?role=admin',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.users)
        assert.ok(data.users.length >= 1)

        // Verify all returned users are admins
        data.users.forEach(user => {
            assert.strictEqual(user.role, 'admin')
            assert.strictEqual(user.password, undefined)
        })
    })

    // Test 10b: Get all users with role filter - teacher
    await t.test('Get all users with role filter - teacher', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/users?role=teacher',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.users)
        assert.ok(data.users.length >= 1)

        // Verify all returned users are teachers
        data.users.forEach(user => {
            assert.strictEqual(user.role, 'teacher')
            assert.strictEqual(user.password, undefined)
        })
    })

    // Test 10c: Get all users with role filter - student
    await t.test('Get all users with role filter - student', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/users?role=student',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.users)
        assert.ok(data.users.length >= 2)

        // Verify all returned users are students
        data.users.forEach(user => {
            assert.strictEqual(user.role, 'student')
            assert.strictEqual(user.password, undefined)
        })
    })

    // Test 11: Authorization tests - Teacher trying to create teacher (should fail)
    await t.test('Teacher trying to create teacher role (should fail)', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/users',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: {
                username: 'unauthorizedteacher',
                password: 'unauthorized123',
                role: 'teacher'
            }
        })

        assert.strictEqual(response.statusCode, 403)
        const data = response.json()
        assert.strictEqual(data.message, 'Teachers can only create student accounts')
    })

    // Test 12: Create related data for user and verify deletion cascade
    await t.test('Verify related data deletion on user delete', async (t) => {
        const Statistic = (await import('../model/Statistic.js')).default
        const Practice = (await import('../model/Practice.js')).default

        // Create a temporary test student
        const tempStudentResponse = await fastify.inject({
            method: 'POST',
            url: '/users',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: {
                username: 'tempstudent',
                password: 'tempPass123',
                role: 'student'
            }
        })

        const tempStudentId = tempStudentResponse.json().user._id

        // Create some statistics for the user
        await Statistic.create([
            { type: 'visit', data: { page: 'home' }, user: tempStudentId },
            { type: 'material', data: { materialId: 'test123' }, user: tempStudentId },
            { type: 'practice', data: { practiceId: 'practice123' }, user: tempStudentId }
        ])

        // Create some practice records for the user
        await Practice.create([
            { code: 'TEST001', score: { correct: 8, total: 10 }, user: tempStudentId },
            { code: 'TEST002', score: { correct: 9, total: 10 }, user: tempStudentId }
        ])

        // Verify data exists before deletion
        const statsBeforeDelete = await Statistic.find({ user: tempStudentId })
        const practicesBeforeDelete = await Practice.find({ user: tempStudentId })
        assert.strictEqual(statsBeforeDelete.length, 3)
        assert.strictEqual(practicesBeforeDelete.length, 2)

        // Delete the user
        const deleteResponse = await fastify.inject({
            method: 'DELETE',
            url: `/users/${tempStudentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(deleteResponse.statusCode, 200)

        // Verify related data is deleted
        const statsAfterDelete = await Statistic.find({ user: tempStudentId })
        const practicesAfterDelete = await Practice.find({ user: tempStudentId })
        assert.strictEqual(statsAfterDelete.length, 0, 'Statistics should be deleted')
        assert.strictEqual(practicesAfterDelete.length, 0, 'Practice records should be deleted')
    })


    // Test 12a: Delete user (as admin)
    await t.test('Delete user as admin', async (t) => {
        const response = await fastify.inject({
            method: 'DELETE',
            url: `/users/${createdUserId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'User deleted')
    })

    // Test 13: Check user is deleted from database
    await t.test('Check user is deleted from database', async (t) => {
        const user = await User.findById(createdUserId)
        assert.strictEqual(user, null)
    })

    // Test 14: Clean up - remove all test users except admin
    await t.test('Clean up test data', async (t) => {
        await User.deleteMany({
            username: {$in: ['teacher1', 'student2', 'updatedstudent', 'admin']}
        })

        const remainingTestUsers = await User.find({
            username: {$in: ['teacher1', 'student1', 'student2', 'updatedstudent']}
        })

        assert.strictEqual(remainingTestUsers.length, 0)
        console.log('Test data cleaned up successfully')
    })

    // Teardown
    await t.test('Teardown - close server and database connections', async (t) => {
        await fastify.close()

        // Close MongoDB connection
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