import mongoose from 'mongoose';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { Lead } from './src/models/Lead.js';
import { Template, Campaign } from './src/models/Outreach.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
  if (!MONGODB_URI || MONGODB_URI.includes('<db_username>')) {
    console.error('❌ Please set a valid MONGODB_URI in your .env file first!');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Migrate Leads
    const localLeads = JSON.parse(readFileSync('./data/leads.json', 'utf8'));
    console.log(`📊 Found ${localLeads.length} local leads. Clearing DB and migrating...`);
    await Lead.deleteMany({});
    for (const lead of localLeads) {
      await Lead.create({
        id: lead.id,
        clinicName: lead.clinicName,
        website: lead.website,
        contactName: lead.contactName,
        role: lead.role,
        city: lead.city,
        email: lead.email,
        notes: lead.notes,
        status: lead.status || 'pending',
        unsubToken: lead.unsubToken,
        source: 'migration'
      });
    }

    // 2. Migrate Templates
    const localTemplates = JSON.parse(readFileSync('./data/templates.json', 'utf8'));
    console.log(`📝 Migrating ${localTemplates.length} templates...`);
    await Template.deleteMany({});
    for (const t of localTemplates) {
      await Template.create({
        id: t.id,
        name: t.name,
        subject: t.subject,
        bodyText: t.bodyText
      });
    }

    // 3. Migrate Campaigns
    const localCampaigns = JSON.parse(readFileSync('./data/campaigns.json', 'utf8'));
    console.log(`🚀 Migrating ${localCampaigns.length} campaigns...`);
    await Campaign.deleteMany({});
    for (const c of localCampaigns) {
      await Campaign.create({
        id: c.id,
        name: c.name,
        templateId: c.templateId,
        leadIds: c.leadIds || [],
        automationEnabled: Boolean(c.automationEnabled),
        status: c.status || 'active'
      });
    }

    console.log(`🚀 Migration Complete! Leads, Templates, and Campaigns are now in Atlas.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
