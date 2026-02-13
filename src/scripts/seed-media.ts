import { getPayload } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import https from 'https'
import dotenv from 'dotenv'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

dotenv.config({
  path: path.resolve(dirname, '../../.env'),
})

// Unsplash Image URLs (Direct links to specific high-quality images)
const PLACEHOLDER_IMAGES = [
  {
    name: 'hero-business-meeting',
    url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop',
    alt: 'Business team meeting in modern office',
    category: 'hero',
  },
  {
    name: 'service-strategy',
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop',
    alt: 'Strategic planning session with charts',
    category: 'service',
  },
  {
    name: 'service-operations',
    url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2032&auto=format&fit=crop',
    alt: 'Efficient manufacturing operations',
    category: 'service',
  },
  {
    name: 'service-technology',
    url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop',
    alt: 'Digital technology and coding',
    category: 'service',
  },
  {
    name: 'office-interior',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop',
    alt: 'Modern corporate office interior',
    category: 'about',
  },
  {
    name: 'team-portrait',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
    alt: 'Diverse team of professionals',
    category: 'team',
  },
]

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    https
      .get(url, (response) => {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      })
      .on('error', (err) => {
        fs.unlink(filepath, () => {}) // Delete the file async. (But we don't check the result)
        reject(err)
      })
  })
}

async function seed() {
  try {
    const { default: configPromise } = await import('@payload-config')
    const payload = await getPayload({ config: configPromise })

    console.log('Starting media seeding...')
    const tempDir = path.resolve(dirname, 'temp_images')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
    }

    const uploadedMedia: Record<string, string> = {}

    for (const image of PLACEHOLDER_IMAGES) {
      console.log(`Processing ${image.name}...`)

      // Check if media with this alt text already exists (simple deduplication)
      const existing = await payload.find({
        collection: 'media',
        where: { alt: { equals: image.alt } },
      })

      if (existing.totalDocs > 0) {
        console.log(`Media for ${image.name} already exists. Skipping download.`)
        uploadedMedia[image.name] = existing.docs[0].id
        continue
      }

      const ext = 'jpg' // Assuming unsplash sends jpg usually, or we treat it as such for simplicity
      const tempFilePath = path.join(tempDir, `${image.name}.${ext}`)

      console.log(`Downloading ${image.url}...`)
      await downloadImage(image.url, tempFilePath)

      console.log(`Uploading to Payload...`)
      const fileBuffer = fs.readFileSync(tempFilePath)
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: image.alt,
        },
        file: {
          data: fileBuffer,
          name: `${image.name}.${ext}`,
          mimetype: 'image/jpeg',
          size: fileBuffer.length,
        },
        overrideAccess: true,
      })

      uploadedMedia[image.name] = media.id

      // Cleanup temp file
      fs.unlinkSync(tempFilePath)
    }

    // Cleanup temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir)
    }

    console.log('Media seeded successfully!')
    console.log('Updating pages and services with new media...')

    // Update Home Page Hero
    if (uploadedMedia['hero-business-meeting']) {
      const homePages = await payload.find({
        collection: 'pages',
        where: { slug: { equals: 'home' } },
      })
      if (homePages.totalDocs > 0) {
        await payload.update({
          collection: 'pages',
          id: homePages.docs[0].id,
          data: {
            heroType: 'image', // Switch to image hero to show off the media
            heroImage: uploadedMedia['hero-business-meeting'],
          },
          overrideAccess: true,
        })
        console.log('Updated Home page hero image.')
      }
    }

    // Update Services
    const serviceMap = {
      'corporate-strategy': 'service-strategy',
      'operational-excellence': 'service-operations',
      'digital-transformation': 'service-technology',
    }

    for (const [slug, imageName] of Object.entries(serviceMap)) {
      if (uploadedMedia[imageName]) {
        const services = await payload.find({
          collection: 'services',
          where: { slug: { equals: slug } },
        })
        if (services.totalDocs > 0) {
          await payload.update({
            collection: 'services',
            id: services.docs[0].id,
            data: {
              featuredImage: uploadedMedia[imageName],
            },
            overrideAccess: true,
          })
          console.log(`Updated ${slug} featured image.`)
        }
      }
    }

    // Update About Page Team/Office
    if (uploadedMedia['office-interior']) {
      const aboutPages = await payload.find({
        collection: 'pages',
        where: { slug: { equals: 'about' } },
      })
      if (aboutPages.totalDocs > 0) {
        // This is a bit complex as we need to find the specific block to update,
        // but for now let's just update the hero image if we switch it to image type
        await payload.update({
          collection: 'pages',
          id: aboutPages.docs[0].id,
          data: {
            heroType: 'image',
            heroImage: uploadedMedia['office-interior'],
          },
          overrideAccess: true,
        })
        console.log('Updated About page hero image.')
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('Error seeding media:', error)
    process.exit(1)
  }
}

seed()
