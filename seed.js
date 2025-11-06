// seed-database.js
import mongoose from 'mongoose'
import User from './model/User.js'
import Material from './model/Material.js'
import Practice from './model/Practice.js'
import Statistic from './model/Statistic.js'
import {config} from "dotenv";

config() // Load environment variables from .env file

// Database connection
const MONGODB_URI = process.env.MONGODB_URI

// Progress tracking
let progress = {
    current: 0,
    total: 0,
    currentTask: ''
}

function updateProgress(task, current, total) {
    progress.currentTask = task
    progress.current = current
    progress.total = total

    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    process.stdout.write(`\r${task}: ${current}/${total} (${percentage}%)`)

    if (current === total) {
        process.stdout.write(' ✓\n')
    }
}

function startProgress(task, total) {
    progress.currentTask = task
    progress.total = total
    progress.current = 0
    console.log(`\n${task}...`)
    updateProgress(task, 0, total)
}

// Helper function to generate random YouTube links
function generateRandomYouTubeLinks() {
    const videoIds = [
        'k1BneeJTDcU', // The specific video you mentioned
        'dQw4w9WgXcQ', // Rick Roll
        'b8iSX4o557o', // 【Akie秋絵】約束 Promise【歌ってみた】
        'tpo8RkoMVlg', // huh?
        'VZAj-BE7AKo', // neuro padoru
        '1ewOadBo1Ws' // monster mv camila x neuro
    ]

    const count = Math.floor(Math.random() * 4) + 1 // 1-4 links
    const selectedIds = []

    for (let i = 0; i < count; i++) {
        const randomId = videoIds[Math.floor(Math.random() * videoIds.length)]
        if (!selectedIds.includes(randomId)) {
            selectedIds.push(randomId)
        }
    }

    return selectedIds.map(id => `https://www.youtube.com/watch?v=${id}`)
}

// Helper function to generate random placeholder images
function generateRandomImageLinks() {
    const resolutions = [
        '400x300', '600x400', '800x600', '1024x768',
        '500x400', '640x480', '720x540', '900x600'
    ]

    const count = Math.floor(Math.random() * 5) + 1 // 1-5 images
    const images = []

    for (let i = 0; i < count; i++) {
        const resolution = resolutions[Math.floor(Math.random() * resolutions.length)]
        images.push(`https://placehold.co/${resolution}`)
    }

    return images
}

// Sample materials data with YouTube and image links
const SAMPLE_MATERIALS = [
    {
        title: 'Algebra Basics',
        description: 'Introduction to algebraic expressions and equations',
        formula: 'a + b = c',
        example: 'If a=2 and b=3, then 2 + 3 = 5',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Linear Equations',
        description: 'Solving equations with one variable',
        formula: 'ax + b = 0',
        example: '2x + 3 = 7 → 2x = 4 → x = 2',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Quadratic Equations',
        description: 'Solving equations of the form ax² + bx + c = 0',
        formula: 'x = [-b ± √(b² - 4ac)] / 2a',
        example: 'x² + 5x + 6 = 0 → (x + 2)(x + 3) = 0 → x = -2 or x = -3',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Geometry Fundamentals',
        description: 'Basic concepts of geometry including shapes and angles',
        formula: 'A = πr²',
        example: 'For a circle with radius 5, area = 3.14 * 5² = 78.5',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Pythagorean Theorem',
        description: 'Relationship between sides of a right triangle',
        formula: 'a² + b² = c²',
        example: 'If a=3 and b=4, then c² = 3² + 4² = 9 + 16 = 25 → c = 5',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Trigonometry Basics',
        description: 'Introduction to trigonometric functions',
        formula: 'sin(θ) = opposite/hypotenuse',
        example: 'In a right triangle with opposite=3 and hypotenuse=5, sin(θ) = 3/5 = 0.6',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Calculus Derivatives',
        description: 'Basic rules of differentiation',
        formula: 'd/dx(xⁿ) = nxⁿ⁻¹',
        example: 'd/dx(x³) = 3x²',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Probability Basics',
        description: 'Introduction to probability theory',
        formula: 'P(A) = number of favorable outcomes / total outcomes',
        example: 'Probability of rolling a 6 on a die: P(6) = 1/6',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Statistics Mean',
        description: 'Calculating average values',
        formula: 'mean = (sum of all values) / (number of values)',
        example: 'Mean of [2, 4, 6, 8] = (2+4+6+8)/4 = 20/4 = 5',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    },
    {
        title: 'Exponential Functions',
        description: 'Understanding exponential growth and decay',
        formula: 'y = a * bˣ',
        example: 'If a=2 and b=3, then y = 2 * 3ˣ',
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    }
]

// Sample practice codes and topics
const PRACTICE_TOPICS = [
    { code: 'algebra_basics_001', topic: 'Basic Algebraic Expressions', totalQuestions: 10 },
    { code: 'algebra_basics_002', topic: 'Solving Simple Equations', totalQuestions: 10 },
    { code: 'linear_eq_001', topic: 'Linear Equations Practice', totalQuestions: 15 },
    { code: 'quadratic_eq_001', topic: 'Quadratic Equations', totalQuestions: 12 },
    { code: 'geometry_001', topic: 'Basic Geometry Problems', totalQuestions: 10 },
    { code: 'geometry_002', topic: 'Area and Perimeter', totalQuestions: 15 },
    { code: 'trigonometry_001', topic: 'Trigonometric Ratios', totalQuestions: 12 },
    { code: 'calculus_001', topic: 'Basic Derivatives', totalQuestions: 10 },
    { code: 'probability_001', topic: 'Basic Probability', totalQuestions: 8 },
    { code: 'statistics_001', topic: 'Mean and Median', totalQuestions: 10 }
]

// Statistic types according to your schema
const STATISTIC_TYPES = {
    VISIT: 'visit',
    MATERIAL: 'material',
    PRACTICE_ATTEMPT: 'practice_attempt',
    PRACTICE_COMPLETED: 'practice_completed'
}

async function connectDB() {
    console.log('🔌 Connecting to MongoDB...')
    console.log('MONGODB_URI from env:', process.env.MONGODB_URI)
    console.log('Connecting to:', MONGODB_URI)
    try {
        await mongoose.connect(MONGODB_URI)
        console.log('✅ Connected to MongoDB successfully')
    } catch (error) {
        console.error('❌ MongoDB connection error:', error)
        process.exit(1)
    }
}

async function dropAllIndexes() {
    try {
        await Promise.all([
            Practice.collection.dropIndexes(),
            User.collection.dropIndexes(),
            Material.collection.dropIndexes(),
            Statistic.collection.dropIndexes()
        ])
        console.log('✅ Dropped all indexes from all collections')
    } catch (error) {
        console.warn('⚠️  Error dropping indexes:', error.message)
    }
}

async function clearDatabase() {
    console.log('🗑️  Clearing existing data...')
    await User.deleteMany({})
    await Material.deleteMany({})
    await Practice.deleteMany({})
    await Statistic.deleteMany({})
    console.log('✅ Database cleared successfully')
}

async function createAdmin() {
    console.log('👨‍💼 Creating admin user...')
    const admin = new User({
        username: 'admin',
        password: 'AdminSecurePass123!',
        role: 'admin'
    })
    await admin.save()
    console.log('✅ Admin user created')
    return admin
}

async function createTeachers() {
    const totalTeachers = 5
    startProgress('👨‍🏫 Creating teacher users', totalTeachers)

    const teachers = []
    for (let i = 1; i <= totalTeachers; i++) {
        const teacher = new User({
            username: `teacher${i}`,
            password: 'teacherPass123',
            role: 'teacher'
        })
        await teacher.save()
        teachers.push(teacher)
        updateProgress('👨‍🏫 Creating teacher users', i, totalTeachers)
    }

    return teachers
}

async function createStudents() {
    const totalStudents = 30
    startProgress('👨‍🎓 Creating student users', totalStudents)

    const students = []
    for (let i = 1; i <= totalStudents; i++) {
        const student = new User({
            username: `student${i}`,
            password: 'studentPass123',
            role: 'student'
        })
        await student.save()
        students.push(student)
        updateProgress('👨‍🎓 Creating student users', i, totalStudents)
    }

    return students
}

async function createMaterials() {
    console.log('📚 Creating learning materials with YouTube and image links...')

    // Generate fresh random links for each material to ensure variety
    const materialsWithFreshLinks = SAMPLE_MATERIALS.map(material => ({
        ...material,
        youtubeLinks: generateRandomYouTubeLinks(),
        imageLinks: generateRandomImageLinks()
    }))

    const materials = await Material.insertMany(materialsWithFreshLinks)

    console.log(`✅ Created ${materials.length} learning materials`)
    console.log('📹 Sample YouTube links generated')
    console.log('🖼️  Sample image placeholders generated')

    // Log some examples
    materials.slice(0, 2).forEach((material, index) => {
        console.log(`   Material ${index + 1}: ${material.youtubeLinks.length} YouTube links, ${material.imageLinks.length} images`)
    })

    return materials
}

async function createPracticesAndStatistics(students, materials) {
    console.log('📝 Creating practice records and statistics...')

    const practices = []
    const statistics = []
    let totalPractices = 0

    // Calculate total expected practices for progress tracking
    students.forEach(student => {
        const practiceCount = Math.floor(Math.random() * 10) + 5 // 5-14 practices per student
        totalPractices += practiceCount
    })

    startProgress('📊 Creating practices and statistics', totalPractices + students.length)

    let practiceCounter = 0

    for (let i = 0; i < students.length; i++) {
        const student = students[i]

        // Create general statistics for this student
        await createGeneralStatistics(student, materials, statistics)

        // Each student gets 2-5 practice records
        const practiceCount = Math.floor(Math.random() * 4) + 2

        for (let j = 0; j < practiceCount; j++) {
            const topic = PRACTICE_TOPICS[Math.floor(Math.random() * PRACTICE_TOPICS.length)]
            const totalQuestions = topic.totalQuestions // Use static total from PRACTICE_TOPICS
            const correctAnswers = Math.floor(Math.random() * (totalQuestions + 1)) // 0 to totalQuestions correct

            // Create practice record
            const practice = new Practice({
                code: topic.code,
                score: {
                    correct: correctAnswers,
                    total: totalQuestions
                },
                content: {
                    topic: topic.topic,
                    exercises: Array.from({ length: totalQuestions }, (_, idx) => ({
                        question: `Question ${idx + 1} about ${topic.topic}`,
                        answer: `Answer ${idx + 1}`
                    }))
                },
                user: student._id,
                completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
            })
            await practice.save()
            practices.push(practice)

            // Create practice_completed statistic for this practice
            const completedStatistic = new Statistic({
                type: STATISTIC_TYPES.PRACTICE_COMPLETED,
                data: {
                    code: topic.code,
                    practice: practice._id
                },
                user: student._id,
                timestamp: practice.completedAt
            })
            statistics.push(completedStatistic)

            practiceCounter++
            updateProgress('📊 Creating practices and statistics', practiceCounter + i, totalPractices + students.length)
        }

        // Update progress after each student's general statistics are created
        updateProgress('📊 Creating practices and statistics', practiceCounter + i + 1, totalPractices + students.length)
    }

    // Save all statistics
    await Statistic.insertMany(statistics)
    console.log(`\n✅ Created ${practices.length} practice records`)
    console.log(`✅ Created ${statistics.length} statistics`)

    return { practices, statistics }
}

async function createGeneralStatistics(student, materials, statistics) {
    // Create visit statistics (10-20 per student)
    const visitCount = Math.floor(Math.random() * 11) + 10
    for (let i = 0; i < visitCount; i++) {
        const visitStat = new Statistic({
            type: STATISTIC_TYPES.VISIT,
            user: student._id,
            data: {},
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        })
        statistics.push(visitStat)
    }

    // Create material view statistics (15-25 per student)
    const materialViewCount = Math.floor(Math.random() * 11) + 15
    for (let i = 0; i < materialViewCount; i++) {
        const material = materials[Math.floor(Math.random() * materials.length)]
        const materialStat = new Statistic({
            type: STATISTIC_TYPES.MATERIAL,
            data: {
                material: material._id,
                title: material.title // Added title field to match new schema requirement
            },
            user: student._id,
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        })
        statistics.push(materialStat)
    }

    // Create practice start statistics (10-15 per student)
    const practiceStartCount = Math.floor(Math.random() * 6) + 10
    for (let i = 0; i < practiceStartCount; i++) {
        const topic = PRACTICE_TOPICS[Math.floor(Math.random() * PRACTICE_TOPICS.length)]
        const practiceStat = new Statistic({
            type: STATISTIC_TYPES.PRACTICE_ATTEMPT,
            data: {
                code: topic.code
            },
            user: student._id,
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        })
        statistics.push(practiceStat)
    }
}

async function seedDatabase() {
    console.log('🚀 Starting database seeding process...\n')

    const startTime = Date.now()

    try {
        // Connect to database
        await connectDB()

        // Drop indexes to avoid conflicts
        await dropAllIndexes()

        // Clear existing data
        await clearDatabase()

        // Create users
        const admin = await createAdmin()
        const teachers = await createTeachers()
        const students = await createStudents()

        // Create materials with YouTube and image links
        const materials = await createMaterials()

        // Create practices and statistics
        const { practices, statistics } = await createPracticesAndStatistics(students, materials)

        const endTime = Date.now()
        const duration = Math.round((endTime - startTime) / 1000)

        console.log('\n🎉 Database seeding completed successfully!')
        console.log(`⏱️  Total time: ${duration} seconds`)
        console.log('\n📊 Summary:')
        console.log(`   👨‍💼 Admin: 1`)
        console.log(`   👨‍🏫 Teachers: ${teachers.length}`)
        console.log(`   👨‍🎓 Students: ${students.length}`)
        console.log(`   📚 Materials: ${materials.length}`)
        console.log(`   📝 Practices: ${practices.length}`)
        console.log(`   📈 Statistics: ${statistics.length}`)

        console.log('🔑 Sample login credentials:')
        console.log('   Admin:     username: admin, password: AdminSecurePass123!')
        console.log('   Teacher 1: username: teacher1, password: teacherPass123')
        console.log('   Student 1: username: student1, password: studentPass123')

        console.log('\n📋 Statistic Data Structure:')
        console.log('   - visit: {}')
        console.log('   - material: { material: ObjectId, title: String }') // Updated to show new structure
        console.log('   - practice_attempt: { code: String }')
        console.log('   - practice_completed: { code: String, practice: ObjectId }')

    } catch (error) {
        console.error('\n❌ Seeding failed:', error)
    } finally {
        await mongoose.connection.close()
        console.log('\n🔌 Database connection closed')
        process.exit(0)
    }
}

// Run the seeding script
seedDatabase()