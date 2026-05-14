
import 'dotenv/config';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { Lead } from '../src/models/Lead.js';
import { Template } from '../src/models/Outreach.js';

const improvedBody = `Hi {{clinicName}},

I’m Hassan — I’m reaching out to a select group of private clinics in London about a persistent problem: empty surgery slots caused by last-minute cancellations and no-shows.

I’m building AI Nexus Insight, an automated recovery system designed to stop the manual "WhatsApp chasing" and fill those gaps automatically.

If you can share just 2 quick numbers (average daily appointments + your estimated no-show %), I’ll send over a custom 1-page “Revenue Leak Audit” for {{clinicName}} showing exactly how much is being left on the table annually.

Worth a 5-minute chat this week? If you're not the right person, who should I speak with regarding patient booking efficiency at {{clinicName}}?

Best,

Hassan Naseer
Founder, AI Nexus Insight`;

const clinics = [
  { name: 'London Dental Studio', email: 'info@londondentalstudio.co.uk', website: 'https://www.londondentalstudio.co.uk', city: 'London' },
  { name: 'Harley Street Dental Clinic', email: 'info@hsdc.net', website: 'https://www.harleystreetdentalclinic.co.uk', city: 'London' },
  { name: 'The London Dental Centre', email: 'info@thelondondentalcentre.co.uk', website: 'https://www.thelondondentalcentre.co.uk', city: 'London' },
  { name: 'Smilepod London', email: 'reception@smilepod.co.uk', website: 'https://www.smilepod.co.uk', city: 'London' },
  { name: 'Marylebone Dental Practice', email: 'info@marylebonedental.co.uk', website: 'https://www.marylebonedental.co.uk', city: 'London' },
  { name: 'Elleven Dental', email: 'info@ellevendental.com', website: 'https://www.ellevendental.com', city: 'London' },
  { name: 'Bow Lane Dental Group', email: 'reception@bowlanedental.com', website: 'https://www.bowlanedental.com', city: 'London' },
  { name: 'Kensington Dental Practice', email: 'info@kensingtondentalpractice.com', website: 'https://www.kensingtondentalpractice.com', city: 'London' },
  { name: 'Chelsea Dental Lounge', email: 'info@chelseadentallounge.com', website: 'https://www.chelseadentallounge.com', city: 'London' },
  { name: 'London Bridge Dental Practice', email: 'info@lbdp.co.uk', website: 'https://www.lbdp.co.uk', city: 'London' }
];

async function setup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB.');

    // 1. Update Template
    const tplUpdate = await Template.findOneAndUpdate(
      { id: 'founding_partner_outreach' },
      { 
        subject: 'Question about no-shows at {{clinicName}}',
        bodyText: improvedBody,
        name: 'Founding Partner Outreach (Improved)'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Template updated/created.');

    // 2. Add Leads
    let added = 0;
    for (const c of clinics) {
      const existing = await Lead.findOne({ email: c.email });
      if (!existing) {
        await Lead.create({
          id: nanoid(),
          clinicName: c.name,
          email: c.email,
          website: c.website,
          city: c.city,
          status: 'pending',
          unsubToken: nanoid()
        });
        added++;
      }
    }
    console.log(`✅ Added ${added} new leads.`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

setup();
