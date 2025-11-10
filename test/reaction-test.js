import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../server.js'
import User from '../model/User.js'
import Material from '../model/Material.js'
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

const TEST_MATERIAL = {
    title: 'Algebra Basics',
    description: 'Introduction to algebraic expressions and equations',
    formula: 'a + b = c',
    example: 'If a=2 and b=3, then 2 + 3 = 5'
}

const TEST_MATERIAL_2 = {
    title: 'Geometry Fundamentals',
    description: 'Basic concepts of geometry including shapes and angles',
    formula: 'A = πr²',
    example: 'For a circle with radius 5, area = 3.14 * 5² = 78.5'
}

// Reaction test data
const MATERIAL_REACTION = {
    reaction: 'happy',
    type: 'material',
    materialId: null // Will be set dynamically
}

const PRACTICE_REACTION = {
    reaction: 'confused',
    type: 'practice',
    practiceCode: 'algebra_basics_001'
}

const UPDATED_MATERIAL_REACTION = {
    reaction: 'sad',
    type: 'material',
    materialId: null // Will be set dynamically
}

const UPDATED_PRACTICE_REACTION = {
    reaction: 'neutral',
    type: 'practice',
    practiceCode: 'algebra_basics_001'
}

let fastify
let adminToken
let teacherToken
let studentToken
let studentToken2
let studentId
let studentId2
let materialId
let materialId2

test('Reaction API Tests', async (t) => {
    // Setup: Create Fastify instance and ensure test users exist
    await t.test('Setup - Initialize server and ensure test users exist', async (t) => {
        fastify = await build()

        // Clean up any existing test data
        await User.deleteMany({
            username: { $in: ['teacher1', 'student1', 'student2', 'admin'] }
        })
        await Material.deleteMany({})

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

        // Create test materials
        let material1 = new Material(TEST_MATERIAL)
        await material1.save()
        materialId = material1._id.toString()

        let material2 = new Material(TEST_MATERIAL_2)
        await material2.save()
        materialId2 = material2._id.toString()

        // Update reaction test data with actual material IDs
        MATERIAL_REACTION.materialId = materialId
        UPDATED_MATERIAL_REACTION.materialId = materialId
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

    // Test 5: Create material reaction as student (success)
    await t.test('Create material reaction as student - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: MATERIAL_REACTION
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil disimpan')
        assert.ok(data.reaction)
        assert.strictEqual(data.reaction.reaction, MATERIAL_REACTION.reaction)
        assert.strictEqual(data.reaction.type, MATERIAL_REACTION.type)
        assert.strictEqual(data.reaction.materialId, MATERIAL_REACTION.materialId)
    })

    // Test 6: Create practice reaction as student (success)
    await t.test('Create practice reaction as student - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: PRACTICE_REACTION
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil disimpan')
        assert.ok(data.reaction)
        assert.strictEqual(data.reaction.reaction, PRACTICE_REACTION.reaction)
        assert.strictEqual(data.reaction.type, PRACTICE_REACTION.type)
        assert.strictEqual(data.reaction.practiceCode, PRACTICE_REACTION.practiceCode)
    })

    // Test 7: Create reaction without authentication (should fail)
    await t.test('Create reaction without authentication - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            payload: MATERIAL_REACTION
        })

        assert.strictEqual(response.statusCode, 401)
    })

    // Test 8: Create reaction as teacher (should fail - unauthorized)
    await t.test('Create reaction as teacher - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: MATERIAL_REACTION
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 9: Create reaction as admin (should fail - unauthorized)
    await t.test('Create reaction as admin - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: MATERIAL_REACTION
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 10: Create reaction with missing required fields
    await t.test('Create reaction with missing required fields', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                // Missing reaction and type
            }
        })

        assert.strictEqual(response.statusCode, 400)
    })

    // Test 11: Create material reaction without materialId (should fail)
    await t.test('Create material reaction without materialId - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                reaction: 'happy',
                type: 'material'
                // Missing materialId
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'materialId diperlukan untuk reaksi materi')
    })

    // Test 12: Create practice reaction without practiceCode (should fail)
    await t.test('Create practice reaction without practiceCode - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                reaction: 'happy',
                type: 'practice'
                // Missing practiceCode
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'practiceCode diperlukan untuk reaksi latihan')
    })

    // Test 13: Create material reaction with invalid materialId (should fail)
    await t.test('Create material reaction with invalid materialId - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                reaction: 'happy',
                type: 'material',
                materialId: 'invalid-object-id'
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'materialId tidak valid')
    })

    // Test 14: Create material reaction with non-existent material (should fail)
    await t.test('Create material reaction with non-existent material - should fail', async (t) => {
        const fakeId = new mongoose.Types.ObjectId()
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: {
                reaction: 'happy',
                type: 'material',
                materialId: fakeId.toString()
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'Materi tidak ditemukan')
    })

    // Test 15: Update existing material reaction (success)
    await t.test('Update existing material reaction - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: UPDATED_MATERIAL_REACTION
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil disimpan')
        assert.strictEqual(data.reaction.reaction, UPDATED_MATERIAL_REACTION.reaction) // Should be updated
    })

    // Test 16: Update existing practice reaction (success)
    await t.test('Update existing practice reaction - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: UPDATED_PRACTICE_REACTION
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil disimpan')
        assert.strictEqual(data.reaction.reaction, UPDATED_PRACTICE_REACTION.reaction) // Should be updated
    })

    // Test 17: Get all reactions for user as admin (success)
    await t.test('Get all reactions for user as admin - success', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil diambil')
        assert.ok(data.reactions)
        assert.strictEqual(data.reactions.length, 2) // Should have both material and practice reactions

        // Verify reaction types and content
        const materialReaction = data.reactions.find(r => r.type === 'material')
        const practiceReaction = data.reactions.find(r => r.type === 'practice')

        assert.ok(materialReaction)
        assert.ok(practiceReaction)
        assert.strictEqual(materialReaction.reaction, UPDATED_MATERIAL_REACTION.reaction)
        assert.strictEqual(practiceReaction.reaction, UPDATED_PRACTICE_REACTION.reaction)

        // Verify materialTitle is included
        assert.ok(materialReaction.materialTitle)
        assert.strictEqual(materialReaction.materialTitle, TEST_MATERIAL.title)

        // Verify practiceReaction doesn't have materialTitle
        assert.strictEqual(practiceReaction.materialTitle, '')
    })

    // Test 18: Get all reactions for user as teacher (success)
    await t.test('Get all reactions for user as teacher - success', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/user/${studentId}`,
            headers: {
                authorization: `Bearer ${teacherToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.reactions)
        assert.strictEqual(data.reactions.length, 2)

        // Verify materialTitle is present
        const materialReaction = data.reactions.find(r => r.type === 'material')
        assert.ok(materialReaction.materialTitle)
    })

    // Test 19: Get all reactions for user as same student (success)
    await t.test('Get all reactions for own user as student - success', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/user/${studentId}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.reactions)
        assert.strictEqual(data.reactions.length, 2)

        // Verify materialTitle is present
        const materialReaction = data.reactions.find(r => r.type === 'material')
        assert.ok(materialReaction.materialTitle)
        assert.strictEqual(materialReaction.materialTitle, TEST_MATERIAL.title)
    })

    // Test 20: Get all reactions for different user as student (should fail)
    await t.test('Get all reactions for different user as student - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/user/${studentId2}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 403)
        const data = response.json()
        assert.strictEqual(data.message, 'Akses ditolak')
    })

    // Test 21: Get all reactions with invalid user ID
    await t.test('Get all reactions with invalid user ID', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/reactions/user/invalid-object-id',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Pengguna tidak ditemukan')
    })

    // Test 22: Get material reaction by materialId (success)
    await t.test('Get material reaction by materialId - success', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/material/${materialId}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil diambil')
        assert.ok(data.reaction)
        assert.strictEqual(data.reaction.reaction, UPDATED_MATERIAL_REACTION.reaction)
        assert.strictEqual(data.reaction.type, 'material')
        assert.strictEqual(data.reaction.materialId, materialId)

        // Verify materialTitle is included
        assert.ok(data.reaction.materialTitle)
        assert.strictEqual(data.reaction.materialTitle, TEST_MATERIAL.title)
    })

    // Test 23: Get material reaction with invalid materialId
    await t.test('Get material reaction with invalid materialId', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/reactions/material/invalid-object-id',
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Material tidak ditemukan')
    })

    // Test 24: Get non-existent material reaction
    await t.test('Get non-existent material reaction', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/material/${materialId2}`, // Material without reaction
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi tidak ditemukan')
    })

    // Test 25: Get practice reaction by practiceCode (success)
    await t.test('Get practice reaction by practiceCode - success', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/practice/${PRACTICE_REACTION.practiceCode}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil diambil')
        assert.ok(data.reaction)
        assert.strictEqual(data.reaction.reaction, UPDATED_PRACTICE_REACTION.reaction)
        assert.strictEqual(data.reaction.type, 'practice')
        assert.strictEqual(data.reaction.practiceCode, PRACTICE_REACTION.practiceCode)
    })

    // Test 26: Get non-existent practice reaction
    await t.test('Get non-existent practice reaction', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/reactions/practice/non-existent-code',
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi tidak ditemukan')
    })

    // Test 27: Delete material reaction (success)
    await t.test('Delete material reaction - success', async (t) => {
        const response = await fastify.inject({
            method: 'DELETE',
            url: `/reactions/material/${materialId}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil dihapus')
    })

    // Test 28: Delete already deleted material reaction (should fail)
    await t.test('Delete already deleted material reaction - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'DELETE',
            url: `/reactions/material/${materialId}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi tidak ditemukan')
    })

    // Test 29: Delete practice reaction (success)
    await t.test('Delete practice reaction - success', async (t) => {
        const response = await fastify.inject({
            method: 'DELETE',
            url: `/reactions/practice/${PRACTICE_REACTION.practiceCode}`,
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Reaksi berhasil dihapus')
    })

    // Test 30: Verify reactions are properly separated by user
    await t.test('Verify reactions are properly separated by user', async (t) => {
        // Create a reaction for student 2
        await fastify.inject({
            method: 'POST',
            url: '/reactions',
            headers: {
                authorization: `Bearer ${studentToken2}`
            },
            payload: {
                reaction: 'happy',
                type: 'material',
                materialId: materialId2
            }
        })

        // Check student 1 reactions (should be empty after deletions)
        const response1 = await fastify.inject({
            method: 'GET',
            url: `/reactions/user/${studentId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response1.statusCode, 200)
        const data1 = response1.json()
        assert.strictEqual(data1.reactions.length, 0)

        // Check student 2 reactions
        const response2 = await fastify.inject({
            method: 'GET',
            url: `/reactions/user/${studentId2}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response2.statusCode, 200)
        const data2 = response2.json()
        assert.strictEqual(data2.reactions.length, 1)
        assert.strictEqual(data2.reactions[0].materialId, materialId2)

        // Verify materialTitle for student 2's reaction
        assert.ok(data2.reactions[0].materialTitle)
        assert.strictEqual(data2.reactions[0].materialTitle, TEST_MATERIAL_2.title)
    })

    // Test 31: Get reactions without authentication (should fail)
    await t.test('Get reactions without authentication - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/reactions/user/${studentId}`
        })

        assert.strictEqual(response.statusCode, 401)
    })

    // Test 32: Clean up - remove all test data
    await t.test('Clean up test data', async (t) => {
        await User.deleteMany({
            username: { $in: ['teacher1', 'student1', 'student2', 'admin'] }
        })
        await Material.deleteMany({})

        const remainingTestUsers = await User.find({
            username: { $in: ['teacher1', 'student1', 'student2', 'admin'] }
        })
        const remainingMaterials = await Material.find({})

        assert.strictEqual(remainingTestUsers.length, 0)
        assert.strictEqual(remainingMaterials.length, 0)
        console.log('Reaction test data cleaned up successfully')
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