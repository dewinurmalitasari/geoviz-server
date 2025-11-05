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

const TEST_MATERIAL_WITH_LINKS = {
    title: 'Geometry with Media',
    description: 'Geometry with YouTube and image resources',
    formula: 'A = πr²',
    example: 'For a circle with radius 5, area = 3.14 * 5² = 78.5',
    youtubeLinks: [
        'https://www.youtube.com/watch?v=obl718U-vgY',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ],
    imageLinks: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.png'
    ]
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

const UPDATED_MATERIAL_WITH_LINKS = {
    title: 'Advanced Algebra with Media',
    description: 'Updated description with media links',
    formula: 'ax² + bx + c = 0',
    example: 'Quadratic equation example: 2x² + 3x - 2 = 0',
    youtubeLinks: ['https://www.youtube.com/watch?v=abc123def45'],
    imageLinks: ['https://example.com/updated-image.jpg']
}

let fastify
let adminToken
let teacherToken
let studentToken
let createdMaterialId
let secondMaterialId
let materialWithLinksId

test('Material API Tests', async (t) => {
    // Setup: Create Fastify instance and ensure test users exist
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
        assert.strictEqual(data.material.title, TEST_MATERIAL.title)
        assert.strictEqual(data.material.description, TEST_MATERIAL.description)
        assert.strictEqual(data.material.formula, TEST_MATERIAL.formula)
        assert.strictEqual(data.material.example, TEST_MATERIAL.example)
        assert.strictEqual(data.message, 'Materi berhasil dibuat')
        assert.ok(data.material._id)
        assert.ok(data.material.createdAt)

        // Check that empty arrays are returned for links
        assert.ok(Array.isArray(data.material.youtubeLinks))
        assert.ok(Array.isArray(data.material.imageLinks))
        assert.strictEqual(data.material.youtubeLinks.length, 0)
        assert.strictEqual(data.material.imageLinks.length, 0)

        createdMaterialId = data.material._id
    })

    // Test 5: Create material with YouTube and image links
    await t.test('Create material with YouTube and image links', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_MATERIAL_WITH_LINKS
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.material.title, TEST_MATERIAL_WITH_LINKS.title)
        assert.strictEqual(data.message, 'Materi berhasil dibuat')

        // Check YouTube links
        assert.ok(Array.isArray(data.material.youtubeLinks))
        assert.strictEqual(data.material.youtubeLinks.length, 2)
        assert.strictEqual(data.material.youtubeLinks[0], TEST_MATERIAL_WITH_LINKS.youtubeLinks[0])
        assert.strictEqual(data.material.youtubeLinks[1], TEST_MATERIAL_WITH_LINKS.youtubeLinks[1])

        // Check image links
        assert.ok(Array.isArray(data.material.imageLinks))
        assert.strictEqual(data.material.imageLinks.length, 2)
        assert.strictEqual(data.material.imageLinks[0], TEST_MATERIAL_WITH_LINKS.imageLinks[0])
        assert.strictEqual(data.material.imageLinks[1], TEST_MATERIAL_WITH_LINKS.imageLinks[1])

        materialWithLinksId = data.material._id
    })

    // Test 6: Create material with invalid YouTube URL format
    await t.test('Create material with invalid YouTube URL format', async (t) => {
        const invalidYouTubeUrls = [
            'https://youtube.com/watch?v=abc123',
            'https://www.youtube.com/v/abc123',
            'https://youtu.be/abc123',
            'https://www.youtube.com/embed/abc123',
            'https://www.youtube.com/watch?v=',
            'https://www.youtube.com/watch?v=abc 123',
            'http://www.youtube.com/watch?v=abc123'
        ]

        for (const invalidUrl of invalidYouTubeUrls) {
            const response = await fastify.inject({
                method: 'POST',
                url: '/materials',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: {
                    ...TEST_MATERIAL_2,
                    title: `Test Invalid ${invalidUrl}`,
                    youtubeLinks: [invalidUrl]
                }
            })

            assert.strictEqual(response.statusCode, 400)
            const data = response.json()
            assert.strictEqual(data.message, 'Format URL YouTube tidak valid. Gunakan format: https://www.youtube.com/watch?v=VIDEO_ID')
        }
    })

    // Test 7: Create material with valid YouTube URL formats
    await t.test('Create material with valid YouTube URL formats', async (t) => {
        const validYouTubeUrls = [
            'https://www.youtube.com/watch?v=abc123',
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://www.youtube.com/watch?v=obl718U-vgY',
            'https://www.youtube.com/watch?v=AbC123-_XyZ'
        ]

        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                ...TEST_MATERIAL_2,
                title: 'Valid YouTube URLs Test',
                youtubeLinks: validYouTubeUrls
            }
        })

        assert.strictEqual(response.statusCode, 201)
        const data = response.json()
        assert.strictEqual(data.material.youtubeLinks.length, validYouTubeUrls.length)
        validYouTubeUrls.forEach((url, index) => {
            assert.strictEqual(data.material.youtubeLinks[index], url)
        })
    })

    // Test 8: Create material with duplicate title (should fail)
    await t.test('Create material with duplicate title - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: TEST_MATERIAL // Same title as first test
        })

        assert.strictEqual(response.statusCode, 409)
        const data = response.json()
        assert.strictEqual(data.message, 'Materi dengan judul ini sudah ada')
    })

    // Test 9: Create material as teacher (should fail - unauthorized)
    await t.test('Create material as teacher - should fail', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${teacherToken}`
            },
            payload: {
                title: 'Teacher Material',
                description: 'Test',
                formula: 'Test',
                example: 'Test'
            }
        })

        assert.strictEqual(response.statusCode, 403)
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
        assert.strictEqual(data.message, 'Materi berhasil diambil')
        assert.ok(data.materials)
        assert.strictEqual(data.materials.length, 3)

        // Check all materials have the required fields including link arrays
        data.materials.forEach(material => {
            assert.ok(material._id)
            assert.ok(material.title)
            assert.ok(material.description)
            assert.ok(material.formula)
            assert.ok(material.example)
            assert.ok(Array.isArray(material.youtubeLinks))
            assert.ok(Array.isArray(material.imageLinks))
            assert.ok(material.createdAt)
            assert.ok(material.updatedAt)
        })
    })

    // Test 11: Get all materials with noFormulaAndExample query
    await t.test('Get all materials with onlyIdTitleDesc query', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/materials?onlyIdTitleDesc=true',
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Materi berhasil diambil')
        assert.ok(data.materials)

        // Check that only _id, title, and description fields are returned
        data.materials.forEach(material => {
            assert.ok(material._id)
            assert.ok(material.title)
            assert.ok(material.description)
            assert.strictEqual(material.formula, undefined)
            assert.strictEqual(material.example, undefined)
            assert.strictEqual(material.youtubeLinks, undefined)
            assert.strictEqual(material.imageLinks, undefined)
            assert.strictEqual(material.createdAt, undefined)
            assert.strictEqual(material.updatedAt, undefined)
        })
    })

    // Test 12: Get material by ID with links
    await t.test('Get material by ID with links', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: `/materials/${materialWithLinksId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Materi berhasil diambil')
        assert.ok(data.material)
        assert.strictEqual(data.material._id, materialWithLinksId)
        assert.strictEqual(data.material.title, TEST_MATERIAL_WITH_LINKS.title)

        // Check links are preserved
        assert.strictEqual(data.material.youtubeLinks.length, 2)
        assert.strictEqual(data.material.imageLinks.length, 2)
        assert.strictEqual(data.material.youtubeLinks[0], TEST_MATERIAL_WITH_LINKS.youtubeLinks[0])
        assert.strictEqual(data.material.imageLinks[0], TEST_MATERIAL_WITH_LINKS.imageLinks[0])
    })

    // Test 13: Update material with YouTube and image links
    await t.test('Update material with YouTube and image links', async (t) => {
        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${createdMaterialId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: UPDATED_MATERIAL_WITH_LINKS
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.material.title, UPDATED_MATERIAL_WITH_LINKS.title)
        assert.strictEqual(data.material.description, UPDATED_MATERIAL_WITH_LINKS.description)
        assert.strictEqual(data.material.formula, UPDATED_MATERIAL_WITH_LINKS.formula)
        assert.strictEqual(data.material.example, UPDATED_MATERIAL_WITH_LINKS.example)

        // Check links are updated
        assert.strictEqual(data.material.youtubeLinks.length, 1)
        assert.strictEqual(data.material.imageLinks.length, 1)
        assert.strictEqual(data.material.youtubeLinks[0], UPDATED_MATERIAL_WITH_LINKS.youtubeLinks[0])
        assert.strictEqual(data.material.imageLinks[0], UPDATED_MATERIAL_WITH_LINKS.imageLinks[0])
        assert.strictEqual(data.message, 'Materi berhasil diperbarui')
    })

    // Test 14: Update material with invalid YouTube URL in update
    await t.test('Update material with invalid YouTube URL', async (t) => {
        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${createdMaterialId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                youtubeLinks: ['https://youtu.be/invalid-format']
            }
        })

        assert.strictEqual(response.statusCode, 400)
        const data = response.json()
        assert.strictEqual(data.message, 'Format URL YouTube tidak valid. Gunakan format: https://www.youtube.com/watch?v=VIDEO_ID')
    })

    // Test 15: Update material to clear links (set to empty arrays)
    await t.test('Update material to clear links', async (t) => {
        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${materialWithLinksId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                youtubeLinks: [],
                imageLinks: []
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.material.youtubeLinks.length, 0)
        assert.strictEqual(data.material.imageLinks.length, 0)
        assert.strictEqual(data.message, 'Materi berhasil diperbarui')
    })

    // Test 16: Partial update - only update YouTube links
    await t.test('Partial update - only update YouTube links', async (t) => {
        const newYouTubeLinks = ['https://www.youtube.com/watch?v=newVideo123']

        const response = await fastify.inject({
            method: 'PUT',
            url: `/materials/${materialWithLinksId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                youtubeLinks: newYouTubeLinks
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.material.youtubeLinks.length, 1)
        assert.strictEqual(data.material.youtubeLinks[0], newYouTubeLinks[0])
        assert.strictEqual(data.material.imageLinks.length, 0) // Should remain empty
        assert.strictEqual(data.material.title, TEST_MATERIAL_WITH_LINKS.title) // Should remain unchanged
    })

    // Test 17: Get non-existent material by ID
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
        assert.strictEqual(data.message, 'Materi tidak ditemukan')
    })

    // Test 18: Delete material as admin
    await t.test('Delete material as admin', async (t) => {
        const response = await fastify.inject({
            method: 'DELETE',
            url: `/materials/${materialWithLinksId}`,
            headers: {
                authorization: `Bearer ${adminToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Materi berhasil dihapus')
    })

    // Test 19: Validation tests - Create material with missing required fields
    await t.test('Create material with missing required fields', async (t) => {
        const response = await fastify.inject({
            method: 'POST',
            url: '/materials',
            headers: {
                authorization: `Bearer ${adminToken}`
            },
            payload: {
                title: 'Incomplete Material',
                youtubeLinks: ['https://www.youtube.com/watch?v=valid123']
                // Missing description, formula, example
            }
        })

        assert.strictEqual(response.statusCode, 400)
    })

    // Test 20: Get materials as teacher (should succeed)
    await t.test('Get materials as teacher - should succeed', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/materials',
            headers: {
                authorization: `Bearer ${teacherToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Materi berhasil diambil')
        assert.ok(data.materials)
    })

    // Test 21: Get materials as student (should succeed)
    await t.test('Get materials as student - should succeed', async (t) => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/materials',
            headers: {
                authorization: `Bearer ${studentToken}`
            }
        })

        assert.strictEqual(response.statusCode, 200)
        const data = response.json()
        assert.strictEqual(data.message, 'Materi berhasil diambil')
        assert.ok(data.materials)
    })

    // Test 22: Clean up - remove all test data
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
