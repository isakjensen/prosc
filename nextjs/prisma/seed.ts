import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const hash = await bcrypt.hash('password123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fullstack.com' },
    update: {},
    create: {
      email: 'admin@fullstack.com',
      name: 'Admin',
      passwordHash: hash,
      role: 'ADMIN',
    },
  })
  console.log('Created user:', admin.email)

  // Prospect stages — clear old stages and insert new ones
  await prisma.prospectStageHistory.deleteMany()
  await prisma.prospectStage.deleteMany()

  const stages = [
    { name: 'Tillagd', order: 1, color: '#6B7280' },
    { name: 'Planerad', order: 2, color: '#3B82F6' },
    { name: 'Kontakta', order: 3, color: '#8B5CF6' },
    { name: 'Kontaktad - väntar svar', order: 4, color: '#F59E0B' },
    { name: 'Komplettera', order: 5, color: '#F97316' },
    { name: 'Invänta kontrakt/beslut', order: 6, color: '#10B981' },
  ]

  for (const stage of stages) {
    await prisma.prospectStage.create({ data: stage })
  }
  console.log('Created prospect stages')

  // Default system settings
  const settings = [
    { key: 'company_name', value: 'Fullstack AB' },
    { key: 'company_org_number', value: '556000-0000' },
    { key: 'company_address', value: 'Storgatan 1' },
    { key: 'company_city', value: 'Stockholm' },
    { key: 'company_zip', value: '111 22' },
    { key: 'company_phone', value: '' },
    { key: 'company_email', value: 'info@fullstack.com' },
    { key: 'quote_prefix', value: 'OFF' },
    { key: 'contract_prefix', value: 'AVT' },
    { key: 'invoice_prefix', value: 'FAK' },
    { key: 'default_tax', value: '25' },
  ]

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('Created system settings')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
