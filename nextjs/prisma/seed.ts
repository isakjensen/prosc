import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const hash = await bcrypt.hash('password123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@prosc.com' },
    update: {},
    create: {
      email: 'admin@prosc.com',
      name: 'Admin',
      passwordHash: hash,
      role: 'ADMIN',
    },
  })
  console.log('Created user:', admin.email)

  // Prospect stages
  const stages = [
    { name: 'Hittad/Lead', order: 1, color: '#6B7280' },
    { name: 'Kvalificerad', order: 2, color: '#3B82F6' },
    { name: 'Offert', order: 3, color: '#8B5CF6' },
    { name: 'Förhandling', order: 4, color: '#F59E0B' },
    { name: 'Vunnen', order: 5, color: '#10B981' },
    { name: 'Implementering', order: 6, color: '#06B6D4' },
    { name: 'Implementerad kund', order: 7, color: '#059669' },
  ]

  for (const stage of stages) {
    await prisma.prospectStage.upsert({
      where: { name: stage.name },
      update: {},
      create: stage,
    })
  }
  console.log('Created prospect stages')

  // Default system settings
  const settings = [
    { key: 'company_name', value: 'ProSC AB' },
    { key: 'company_org_number', value: '556000-0000' },
    { key: 'company_address', value: 'Storgatan 1' },
    { key: 'company_city', value: 'Stockholm' },
    { key: 'company_zip', value: '111 22' },
    { key: 'company_phone', value: '' },
    { key: 'company_email', value: 'info@prosc.com' },
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
