import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../server.js'
import Material from '../model/Material.js'
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

const UPDATED_MATERIAL = {
    title: 'Advanced Algebra',
    description: 'Updated description for advanced algebraic concepts',
    formula: 'ax² + bx + c = 0',
    example: 'Quadratic equation example: 2x² + 3x - 2 = 0'
}

let fastify
let adminToken
let teacherToken
let studentToken
let createdMaterialId
let secondMaterialId

test('Material API Tests', async (t) => {
    // Setup: Create Fastify instance and ensure admin exists
    await t.test('Setup - Initialize server and ensure test users exist', async (t) => {
        fastify = await build()

        // Clean up any existing test data
        await Material.deleteMany({})
        await User.deleteMany({
            username: { $in: ['teacher1', 'student1', 'admin'] }
        })

        // Create test users
        let adminUser = new User(TEST_ADMIN)
        await adminUser.save()

        let teacherUser = new User(TEST_TEACHER)
        await teacherUser.save()

        let studentUser = new User(TEST_STUDENT)
        await studentUser.save()
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

    // Test 4: Create material as admin (success)
    await t.test('Create material as admin - success', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_MATERIAL
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.message, 'Material created successfully')
        assert.strictEqual(data.material.title, TEST_MATERIAL.title)
        assert.strictEqual(data.material.description, TEST_MATERIAL.description)
        assert.strictEqual(data.material.formula, TEST_MATERIAL.formula)
        assert.strictEqual(data.material.example, TEST_MATERIAL.example)
        assert.ok(data.material._id)
        assert.ok(data.material.createdAt)

        createdMaterialId = data.material._id
    })

    // Test 5: Create material with duplicate title (should fail)
    await t.test('Create material with duplicate title - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_MATERIAL // Same title as previous
        })

        assert.strictEqual(response.statusCode, 409)
        const data = response.json()
        assert.strictEqual(data.message, 'Material with this title already exists')
    })

    // Test 6: Create material as teacher (should fail - unauthorized)
    await t.test('Create material as teacher - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: TEST_MATERIAL_2
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 7: Create material as student (should fail - unauthorized)
    await t.test('Create material as student - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${studentToken}`
            },
            payload: TEST_MATERIAL_2
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 8: Create material without authentication (should fail)
    await t.test('Create material without authentication - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            payload: TEST_MATERIAL_2
        })

        assert.strictEqual(response.statusCode, 401)
    })

    // Test 9: Create second material as admin
    await t.test('Create second material as admin', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_MATERIAL_2
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.material.title, TEST_MATERIAL_2.title)
        secondMaterialId = data.material._id
    })

    // Test 10: Get all materials as admin
    await t.test('Get all materials as admin', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.materials)
        assert.strictEqual(data.materials.length, 2)

        // Check materials are in correct order (newest first)
        assert.strictEqual(data.materials[0].title, TEST_MATERIAL_2.title)
        assert.strictEqual(data.materials[1].title, TEST_MATERIAL.title)

        // Check all fields are present
        data.materials.forEach(material => {
            assert.ok(material._id)
            assert.ok(material.title)
            assert.ok(material.description)
            assert.ok(material.formula)
            assert.ok(material.example)
            assert.ok(material.createdAt)
            assert.ok(material.updatedAt)
        })
    })

    // Test 11: Get material by ID as admin
    await t.test('Get material by ID as admin', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/materials/${createdMaterialId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.ok(data.material)
        assert.strictEqual(data.material._id, createdMaterialId)
        assert.strictEqual(data.material.title, TEST_MATERIAL.title)
        assert.strictEqual(data.material.description, TEST_MATERIAL.description)
        assert.strictEqual(data.material.formula, TEST_MATERIAL.formula)
        assert.strictEqual(data.material.example, TEST_MATERIAL.example)
    })

    // Test 12: Get non-existent material by ID
    await t.test('Get non-existent material by ID', async (t) => {
        const fakeId = new mongoose.Types.ObjectId()
        const response = await fastify.inject({
            method: 'GET',
            url: `/materials/${fakeId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Material not found')
    })

    // Test 13: Get material with invalid ID format
    await t.test('Get material with invalid ID format', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/materials/invalid-id-format',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 500)
        const data = response.json()
        assert.strictEqual(data.message, 'Cast to ObjectId failed for value "invalid-id-format" (type string) at path "_id" for model "Material"')
    })

    // Test 14: Update material as admin
    await t.test('Update material as admin', async (t) => {
        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${createdMaterialId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: UPDATED_MATERIAL
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Material updated successfully')
        assert.strictEqual(data.material.title, UPDATED_MATERIAL.title)
        assert.strictEqual(data.material.description, UPDATED_MATERIAL.description)
        assert.strictEqual(data.material.formula, UPDATED_MATERIAL.formula)
        assert.strictEqual(data.material.example, UPDATED_MATERIAL.example)
    })

    // Test 15: Update material with duplicate title (should fail)
    await t.test('Update material with duplicate title - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${createdMaterialId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                title: TEST_MATERIAL_2.title // Try to use title of second material
            }
        })

        assert.strictEqual(response.statusCode, 409)
        const data = response.json()
        assert.strictEqual(data.message, 'Material with this title already exists')
    })

    // Test 16: Partial update material
    await t.test('Partial update material', async (t) => {
        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${secondMaterialId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                description: 'Updated description only'
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.material.title, TEST_MATERIAL_2.title) // Title unchanged
        assert.strictEqual(data.material.description, 'Updated description only')
        assert.strictEqual(data.material.formula, TEST_MATERIAL_2.formula) // Formula unchanged
    })

    // Test 17: Update non-existent material
    await t.test('Update non-existent material', async (t) => {
        const fakeId = new mongoose.Types.ObjectId()
        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${fakeId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: UPDATED_MATERIAL
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Material not found')
    })

    // Test 18: Delete material as admin
    await t.test('Delete material as admin', async (t) => {
        const response = await fastify.inject({
            method: 'DELETE',
            url: `/materials/${secondMaterialId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Material deleted successfully')
    })

    // Test 19: Verify material is deleted from database
    await t.test('Verify material is deleted from database', async (t) => {
        const material = await Material.findById(secondMaterialId)
        assert.strictEqual(material, null)
    })

    // Test 20: Delete non-existent material
    await t.test('Delete non-existent material', async (t) => {
        const fakeId = new mongoose.Types.ObjectId()
        const response = await fastify.inject({
            method: 'DELETE',
            url: `/materials/${fakeId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 404)
        const data = response.json()
        assert.strictEqual(data.message, 'Material not found')
    })

    // Test 21: Validation tests - Create material with missing required fields
    await t.test('Create material with missing required fields', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                title: 'Incomplete Material'
                // Missing description, formula, example
            }
        })

        assert.strictEqual(response.statusCode, 400) // Bad Request due to validation
    })

    // Test 22: Validation tests - Create material with empty strings
    await t.test('Create material with empty strings', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                title: '',
                description: '',
                formula: '',
                example: ''
            }
        })

        assert.strictEqual(response.statusCode, 400) // Bad Request due to minLength validation
    })

    // Test 23: Get materials as teacher (should fail)
    await t.test('Get materials as teacher - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/materials',
            headers: {
                authorization: `Bearer ${teacherToken}`
            }
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 24: Get materials as student (should fail)
    await t.test('Get materials as student - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/materials',
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 403)
    })

    // Test 25: Clean up - remove all test data
    await t.test('Clean up test data', async (t) => {
        await Material.deleteMany({})
        await User.deleteMany({
            username: { $in: ['teacher1', 'student1', 'admin'] }
        })

        const remainingMaterials = await Material.find({})
        const remainingTestUsers = await User.find({
            username: { $in: ['teacher1', 'student1', 'admin'] }
        })

        assert.strictEqual(remainingMaterials.length, 0)
        assert.strictEqual(remainingTestUsers.length, 0)
        console.log('Material test data cleaned up successfully')
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