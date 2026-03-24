import CampaignTemplate from "../models/CampaignTemplate.js";
import Audience from "../models/Audience.js";
import Campaign from "../models/Campaign.js";

const CAMPAIGN_DATA = [
  // === SPONSORS (12 campaigns) ===
  { id: 1, sendDate: "2026-03-25", phase: "Phase 1", audience: "Sponsors", subject: "Partner with Canada's Premier Tech Festival — Oct 26-27, 2026", purpose: "Cold Outreach", bodySummary: "Introduction to event. Key stats: 850+ attendees, 350+ delegates. Sponsorship tier overview. Past partner success highlights.", ctaText: "Download Sponsorship Deck", ctaLink: "thetechfestival.com/sponsors", segment: "Cold list + past sponsors" },
  { id: 2, sendDate: "2026-04-08", phase: "Phase 1", audience: "Sponsors", subject: "Your Brand in Front of 350+ Tech Decision-Makers — Here's How", purpose: "Value Proposition", bodySummary: "Deep dive into attendee demographics: job titles, industries, company sizes. ROI projections per tier. Comparison to competitor events.", ctaText: "Explore Sponsorship Tiers", ctaLink: "thetechfestival.com/sponsors", segment: "Opened Email 1, not converted" },
  { id: 3, sendDate: "2026-04-22", phase: "Phase 1", audience: "Sponsors", subject: "Early Sponsor Rates End April 30 — Lock In Your Package", purpose: "Early Bird Deadline", bodySummary: "Early commitment pricing expires. First sponsors confirmed (social proof). Show remaining tier availability.", ctaText: "Claim Early Rate", ctaLink: "thetechfestival.com/sponsors", segment: "All unconverted prospects" },
  { id: 4, sendDate: "2026-05-13", phase: "Phase 2", audience: "Sponsors", subject: "[X] Sponsors Confirmed — See Who's Joining Tech Festival Canada 2026", purpose: "Social Proof", bodySummary: "Announce confirmed sponsors. Updated delegate registration numbers. Media partnership announcements.", ctaText: "View Remaining Packages", ctaLink: "thetechfestival.com/sponsors", segment: "All sponsor leads" },
  { id: 5, sendDate: "2026-06-03", phase: "Phase 2", audience: "Sponsors", subject: "How [Company] Plans to Activate at Tech Festival Canada 2026", purpose: "Activation Showcase", bodySummary: "Feature a sponsor's activation as inspiration. Show what each tier enables. Updated milestones.", ctaText: "See Activation Options", ctaLink: "thetechfestival.com/sponsors", segment: "Warm leads" },
  { id: 6, sendDate: "2026-06-24", phase: "Phase 2", audience: "Sponsors", subject: "Sponsor Testimonials: 'Best ROI of Any Tech Event in Canada'", purpose: "Social Proof", bodySummary: "3-4 sponsor testimonials with specific metrics. Updated sponsorship availability.", ctaText: "Join These Brands", ctaLink: "thetechfestival.com/sponsors", segment: "All unconverted" },
  { id: 7, sendDate: "2026-07-15", phase: "Phase 3", audience: "Sponsors", subject: "Only [X] Sponsorship Slots Remain — Premium Tiers Almost Gone", purpose: "Scarcity", bodySummary: "Updated availability per tier. Delegate quality stats. Pre-event media coverage achieved so far.", ctaText: "Secure Your Tier", ctaLink: "thetechfestival.com/sponsors", segment: "All unconverted" },
  { id: 8, sendDate: "2026-08-05", phase: "Phase 3", audience: "Sponsors", subject: "Sponsor Spotlight: See What Your Brand Activation Could Look Like", purpose: "Visualization", bodySummary: "Visual mockups of sponsor activations. Branded zones, stage presence, digital signage examples.", ctaText: "Start Planning Your Activation", ctaLink: "thetechfestival.com/sponsors", segment: "Warm leads" },
  { id: 9, sendDate: "2026-08-26", phase: "Phase 3", audience: "Sponsors", subject: "Pre-Event ROI Already Delivering for Our Sponsors", purpose: "Pre-Event Value", bodySummary: "Share pre-event metrics: social impressions, media mentions, inbound inquiries generated for sponsors.", ctaText: "Get These Results", ctaLink: "thetechfestival.com/sponsors", segment: "All unconverted" },
  { id: 10, sendDate: "2026-09-10", phase: "Phase 4", audience: "Sponsors", subject: "FINAL CALL: [X] Sponsor Slots Left — Oct 26-27 is 6 Weeks Away", purpose: "Final Urgency", bodySummary: "Last chance messaging. Final attendee numbers. Remaining slot specifics. Direct contact for fast-track.", ctaText: "Contact Us Today", ctaLink: "thetechfestival.com/sponsors", segment: "All unconverted leads" },
  { id: 11, sendDate: "2026-10-01", phase: "Phase 4", audience: "Sponsors", subject: "Your Sponsorship Activation Guide — [X] Days Until Tech Festival Canada", purpose: "Prep Guide (Confirmed)", bodySummary: "For confirmed sponsors: setup timeline, branding guidelines, VIP schedule, contact info, on-site team.", ctaText: "Access Sponsor Portal", ctaLink: "sponsors.thetechfestival.com", segment: "Confirmed sponsors only" },
  { id: 12, sendDate: "2026-10-20", phase: "Phase 5", audience: "Sponsors", subject: "See You This Week! Your Sponsor Logistics & Setup Details", purpose: "Final Logistics", bodySummary: "Setup day schedule, load-in instructions, on-site contacts, Wi-Fi info, VIP dinner details.", ctaText: "View Setup Schedule", ctaLink: "sponsors.thetechfestival.com", segment: "Confirmed sponsors" },

  // === EXHIBITORS (12 campaigns) ===
  { id: 13, sendDate: "2026-03-30", phase: "Phase 1", audience: "Exhibitors", subject: "Showcase Your Tech to 850+ Attendees — Exhibit at Tech Festival Canada 2026", purpose: "Cold Outreach", bodySummary: "Exhibition opportunity introduction. Booth packages and pricing. Expected demographics. Floor plan preview.", ctaText: "View Exhibition Packages", ctaLink: "thetechfestival.com/exhibit", segment: "Target list + past exhibitors" },
  { id: 14, sendDate: "2026-04-15", phase: "Phase 1", audience: "Exhibitors", subject: "Early Bird Booth Pricing: Save 25% Before April 30", purpose: "Early Bird", bodySummary: "Early pricing deadline. Booth size options. What's included. Premium spot availability.", ctaText: "Book at Early Bird Rate", ctaLink: "thetechfestival.com/exhibit", segment: "All exhibitor leads" },
  { id: 15, sendDate: "2026-05-06", phase: "Phase 2", audience: "Exhibitors", subject: "Meet Your Fellow Exhibitors: [X] Companies Already Confirmed!", purpose: "Social Proof", bodySummary: "Confirmed exhibitor showcase. Industry mix. Attendee quality data. Updated booth availability.", ctaText: "Join These Companies", ctaLink: "thetechfestival.com/exhibit", segment: "Opened but not converted" },
  { id: 16, sendDate: "2026-05-27", phase: "Phase 2", audience: "Exhibitors", subject: "Exhibitor Success Story: [Company] Generated 85 Leads in 2 Days", purpose: "Case Study", bodySummary: "Detailed case study of past exhibitor success. Lead gen metrics. Tips for booth success.", ctaText: "Replicate These Results", ctaLink: "thetechfestival.com/exhibit", segment: "All exhibitor leads" },
  { id: 17, sendDate: "2026-06-17", phase: "Phase 2", audience: "Exhibitors", subject: "Booth Upgrade Offer — This Month Only", purpose: "Special Offer", bodySummary: "Limited upgrade offer. Premium/corner spots available. Enhanced packages with extras.", ctaText: "Claim Your Upgrade", ctaLink: "thetechfestival.com/exhibit", segment: "Leads in consideration phase" },
  { id: 18, sendDate: "2026-07-08", phase: "Phase 3", audience: "Exhibitors", subject: "Exhibition Floor [X]% Sold — Only [X] Booths Remaining", purpose: "Scarcity", bodySummary: "Updated availability with floor map. Sold vs. available visual. Attendee registration update.", ctaText: "Reserve Before Sold Out", ctaLink: "thetechfestival.com/exhibit", segment: "All unconverted" },
  { id: 19, sendDate: "2026-07-29", phase: "Phase 3", audience: "Exhibitors", subject: "Your Exhibitor Prep Timeline — From Now to Event Day", purpose: "Prep Guide", bodySummary: "Detailed timeline: profile submission, material shipping, setup day, event days. Deadlines highlighted.", ctaText: "Access Exhibitor Portal", ctaLink: "exhibitors.thetechfestival.com", segment: "Confirmed exhibitors" },
  { id: 20, sendDate: "2026-08-19", phase: "Phase 3", audience: "Exhibitors", subject: "LAST [X] BOOTHS — Exhibition Nearly Sold Out", purpose: "Final Scarcity", bodySummary: "Final push for remaining booths. Complete attendee stats. Last chance messaging.", ctaText: "Book Last Booths", ctaLink: "thetechfestival.com/exhibit", segment: "All unconverted" },
  { id: 21, sendDate: "2026-09-09", phase: "Phase 4", audience: "Exhibitors", subject: "Confirmed Exhibitor Checklist: Are You Ready for Oct 26-27?", purpose: "Prep Checklist", bodySummary: "Complete checklist: profile, materials, team, travel, lead scanning setup, follow-up plan.", ctaText: "Complete Your Checklist", ctaLink: "exhibitors.thetechfestival.com", segment: "Confirmed exhibitors" },
  { id: 22, sendDate: "2026-09-23", phase: "Phase 4", audience: "Exhibitors", subject: "Your Booth Assignment & Floor Map — Tech Festival Canada 2026", purpose: "Booth Details", bodySummary: "Booth number, neighbors, floor map, nearby amenities, power/Wi-Fi specs.", ctaText: "View Your Booth", ctaLink: "exhibitors.thetechfestival.com", segment: "Confirmed exhibitors" },
  { id: 23, sendDate: "2026-10-08", phase: "Phase 4", audience: "Exhibitors", subject: "Shipping & Setup Guide — Your Materials Need to Arrive by Oct 15", purpose: "Logistics", bodySummary: "Shipping address, deadlines, setup day schedule, on-site support contacts.", ctaText: "Ship Materials Now", ctaLink: "exhibitors.thetechfestival.com", segment: "Confirmed exhibitors" },
  { id: 24, sendDate: "2026-10-22", phase: "Phase 5", audience: "Exhibitors", subject: "Setup Day is Oct 25 — Final Details Inside!", purpose: "Final Logistics", bodySummary: "Setup day schedule, load-in slots, on-site contacts, Wi-Fi, exhibitor dinner invite.", ctaText: "View Setup Schedule", ctaLink: "exhibitors.thetechfestival.com", segment: "Confirmed exhibitors" },

  // === DELEGATES (18 campaigns) ===
  { id: 25, sendDate: "2026-03-24", phase: "Phase 1", audience: "Delegates", subject: "The Tech Festival Canada 2026 — Early Bird Tickets NOW LIVE", purpose: "Launch", bodySummary: "Event announcement. Early bird pricing (40% off). Format overview. Key dates. Why attend.", ctaText: "Get Early Bird Tickets", ctaLink: "thetechfestival.com/tickets", segment: "Full prospect database" },
  { id: 26, sendDate: "2026-04-04", phase: "Phase 1", audience: "Delegates", subject: "What's Included in Your Tech Festival Canada Delegate Pass", purpose: "Value Deep-Dive", bodySummary: "Full breakdown: all sessions, workshops, exhibition, networking, meals, after-party, app.", ctaText: "See Full Benefits", ctaLink: "thetechfestival.com/tickets", segment: "Opened but not purchased" },
  { id: 27, sendDate: "2026-04-18", phase: "Phase 1", audience: "Delegates", subject: "⏰ Early Bird Ends April 30 — Save $200 on Your Pass", purpose: "Early Bird Deadline", bodySummary: "Countdown to deadline. Pricing comparison. First speaker teasers. Registration milestone.", ctaText: "Lock In Savings", ctaLink: "thetechfestival.com/tickets", segment: "All non-purchasers" },
  { id: 28, sendDate: "2026-05-05", phase: "Phase 2", audience: "Delegates", subject: "First Speakers Announced — You Won't Want to Miss This Lineup", purpose: "Speaker Reveal #1", bodySummary: "First 5 speaker announcements with bios and topics. Session format overview.", ctaText: "Meet the Speakers", ctaLink: "thetechfestival.com/speakers", segment: "All prospects" },
  { id: 29, sendDate: "2026-05-19", phase: "Phase 2", audience: "Delegates", subject: "More Speakers Revealed + Workshop Details!", purpose: "Speaker Reveal #2", bodySummary: "Next wave of speakers. Workshop descriptions with learning outcomes. Early testimonials.", ctaText: "See Updated Lineup", ctaLink: "thetechfestival.com/speakers", segment: "All prospects" },
  { id: 30, sendDate: "2026-06-02", phase: "Phase 2", audience: "Delegates", subject: "Group Discount: Bring Your Team for 15-25% Off", purpose: "Group Offer", bodySummary: "Team pricing tiers. Why teams benefit more. How to register as a group.", ctaText: "Get Group Tickets", ctaLink: "thetechfestival.com/teams", segment: "All prospects" },
  { id: 31, sendDate: "2026-06-16", phase: "Phase 2", audience: "Delegates", subject: "Full Speaker Lineup + Why [X] Delegates Have Already Registered", purpose: "Social Proof", bodySummary: "Complete speaker list. Registration milestone. Attendee company names. Community building.", ctaText: "Join [X] Delegates", ctaLink: "thetechfestival.com/tickets", segment: "Non-purchasers" },
  { id: 32, sendDate: "2026-06-30", phase: "Phase 2", audience: "Delegates", subject: "Past Delegate Stories: 'Changed How I Think About My Career'", purpose: "Testimonials", bodySummary: "3-4 delegate testimonials. Career impact stories. Networking success examples.", ctaText: "Write Your Story", ctaLink: "thetechfestival.com/tickets", segment: "All non-purchasers" },
  { id: 33, sendDate: "2026-07-14", phase: "Phase 3", audience: "Delegates", subject: "The Full Agenda is LIVE — Plan Your Tech Festival Experience", purpose: "Agenda Launch", bodySummary: "Complete day-by-day agenda. Track descriptions. Must-attend sessions highlighted.", ctaText: "View Full Agenda", ctaLink: "thetechfestival.com/agenda", segment: "All prospects" },
  { id: 34, sendDate: "2026-07-28", phase: "Phase 3", audience: "Delegates", subject: "Workshop Spotlight: [Workshop Name] — Only [X] Seats Left", purpose: "Workshop Focus", bodySummary: "Deep dive on popular workshop. Instructor bio. What you'll learn. Limited capacity warning.", ctaText: "Secure Workshop Access", ctaLink: "thetechfestival.com/tickets", segment: "All prospects" },
  { id: 35, sendDate: "2026-08-11", phase: "Phase 3", audience: "Delegates", subject: "[X] Delegates Registered — Are You On the List?", purpose: "Social Proof + Urgency", bodySummary: "Registration milestone. Company name drops. Networking opportunity preview.", ctaText: "Register Now", ctaLink: "thetechfestival.com/tickets", segment: "Non-purchasers" },
  { id: 36, sendDate: "2026-08-25", phase: "Phase 3", audience: "Delegates", subject: "Networking Preview: Who You'll Meet at Tech Festival Canada 2026", purpose: "Networking Value", bodySummary: "Attendee demographics. Networking event schedule. Event app pre-matching feature.", ctaText: "Join the Network", ctaLink: "thetechfestival.com/tickets", segment: "All prospects" },
  { id: 37, sendDate: "2026-09-08", phase: "Phase 4", audience: "Delegates", subject: "6 Weeks to Go — Your Complete Event Prep Guide", purpose: "Pre-Event Prep", bodySummary: "Venue info, accommodation, travel tips, what to bring, dress code, schedule planner.", ctaText: "Plan Your Visit", ctaLink: "thetechfestival.com/plan", segment: "Registered delegates" },
  { id: 38, sendDate: "2026-09-22", phase: "Phase 4", audience: "Delegates", subject: "Last Group Discount Window — Offer Ends Sept 30", purpose: "Group Final Call", bodySummary: "Final group pricing deadline. Updated registration stats. Team benefits.", ctaText: "Group Tickets — Last Chance", ctaLink: "thetechfestival.com/teams", segment: "Non-purchasers" },
  { id: 39, sendDate: "2026-10-01", phase: "Phase 4", audience: "Delegates", subject: "Your Event App is Ready — Download Now & Build Your Schedule", purpose: "App Launch", bodySummary: "Event app features: schedule builder, networking, live updates, maps, speaker Q&A.", ctaText: "Download the App", ctaLink: "thetechfestival.com/app", segment: "Registered delegates" },
  { id: 40, sendDate: "2026-10-08", phase: "Phase 4", audience: "Delegates", subject: "Final Tickets Available — Last Chance Before Oct 26-27", purpose: "Final Call", bodySummary: "Final push. Complete event summary. Updated stats. Last-minute pricing.", ctaText: "Get Your Pass", ctaLink: "thetechfestival.com/tickets", segment: "Non-purchasers" },
  { id: 41, sendDate: "2026-10-15", phase: "Phase 4", audience: "Delegates", subject: "Your Pre-Event Checklist — 11 Days to Tech Festival Canada", purpose: "Final Prep", bodySummary: "Checklist: ticket, app, schedule, travel, accommodation, networking goals.", ctaText: "Complete Your Prep", ctaLink: "thetechfestival.com/app", segment: "Registered delegates" },
  { id: 42, sendDate: "2026-10-22", phase: "Phase 5", audience: "Delegates", subject: "This Week! Final Logistics for Tech Festival Canada 2026", purpose: "Event Week", bodySummary: "Venue directions, check-in process, Day 1 schedule highlights, what to bring, contacts.", ctaText: "See You Monday!", ctaLink: "thetechfestival.com/app", segment: "All registered delegates" },

  // === VISITORS (12 campaigns) ===
  { id: 43, sendDate: "2026-04-01", phase: "Phase 1", audience: "Visitors", subject: "The Tech Festival Canada 2026 — Free Visitor Registration Open!", purpose: "Launch", bodySummary: "Free registration announcement. What visitors get: exhibition access, demos, networking. Dates and location.", ctaText: "Register Free", ctaLink: "thetechfestival.com/visit", segment: "General tech community" },
  { id: 44, sendDate: "2026-04-22", phase: "Phase 1", audience: "Visitors", subject: "What's FREE at Tech Festival Canada? (Spoiler: Everything on the Exhibition Floor)", purpose: "Value Proposition", bodySummary: "Detailed free experience: 50+ booths, demos, innovation showcase, networking, swag.", ctaText: "Claim Your Free Pass", ctaLink: "thetechfestival.com/visit", segment: "Opened but not registered" },
  { id: 45, sendDate: "2026-05-20", phase: "Phase 2", audience: "Visitors", subject: "Sneak Peek: 50+ Companies Exhibiting at Tech Festival Canada 2026", purpose: "Exhibitor Preview", bodySummary: "Confirmed exhibitors by category. Demo highlights coming. Networking opportunities.", ctaText: "See Who's Exhibiting", ctaLink: "thetechfestival.com/exhibitors", segment: "All visitor leads" },
  { id: 46, sendDate: "2026-06-15", phase: "Phase 2", audience: "Visitors", subject: "Students Welcome! Free Passes for Canada's Biggest Tech Exhibition", purpose: "Student Outreach", bodySummary: "Student-specific messaging. Career opportunities. Companies hiring. Free access.", ctaText: "Get Your Student Pass", ctaLink: "thetechfestival.com/visit", segment: "Student lists + general" },
  { id: 47, sendDate: "2026-07-13", phase: "Phase 3", audience: "Visitors", subject: "Demo Stage Schedule Revealed — See Live Product Launches for Free!", purpose: "Demo Preview", bodySummary: "Exhibition demo stage schedule. Highlight exciting demos. Live launch announcements.", ctaText: "View Demo Schedule", ctaLink: "thetechfestival.com/demos", segment: "All visitor leads" },
  { id: 48, sendDate: "2026-08-03", phase: "Phase 3", audience: "Visitors", subject: "[X] Free Passes Claimed — Register Before Capacity!", purpose: "Urgency", bodySummary: "Registration milestone. Approaching capacity message. What you'll miss if you don't come.", ctaText: "Register Now — Free", ctaLink: "thetechfestival.com/visit", segment: "Unregistered visitors" },
  { id: 49, sendDate: "2026-08-24", phase: "Phase 3", audience: "Visitors", subject: "Bring Your Crew! No Limit on Free Visitor Registrations", purpose: "Group Push", bodySummary: "Encourage bringing friends and colleagues. Share the registration link. Group networking value.", ctaText: "Share This With Friends", ctaLink: "thetechfestival.com/visit", segment: "Registered visitors (referral)" },
  { id: 50, sendDate: "2026-09-14", phase: "Phase 4", audience: "Visitors", subject: "Your Exhibition Floor Map & Visitor Guide — Plan Your Visit!", purpose: "Visitor Guide", bodySummary: "Floor map with zones. Must-visit booths. Demo schedule. Practical info (hours, entry, food).", ctaText: "Download Visitor Guide", ctaLink: "thetechfestival.com/visitor-guide", segment: "Registered visitors" },
  { id: 51, sendDate: "2026-10-01", phase: "Phase 4", audience: "Visitors", subject: "500+ Visitors Registered — The Buzz is Real!", purpose: "Social Proof", bodySummary: "Milestone celebration. What visitors are most excited about. Updated exhibitor highlights.", ctaText: "Join 500+ Visitors", ctaLink: "thetechfestival.com/visit", segment: "Unregistered visitors" },
  { id: 52, sendDate: "2026-10-12", phase: "Phase 4", audience: "Visitors", subject: "2 Weeks Away! Everything You Need to Know for Tech Festival Canada", purpose: "Pre-Event Info", bodySummary: "Complete visitor info: dates, venue, entry process, what to bring, recommended route.", ctaText: "Get Ready", ctaLink: "thetechfestival.com/visitor-guide", segment: "All registered visitors" },
  { id: 53, sendDate: "2026-10-19", phase: "Phase 5", audience: "Visitors", subject: "Next Week! Your Free Visitor Pass to Tech Festival Canada 2026", purpose: "Final Reminder", bodySummary: "Final logistics. QR badge info. First-day highlights. Parking/transit. Opening times.", ctaText: "See You Monday!", ctaLink: "thetechfestival.com/visit", segment: "All registered visitors" },
  { id: 54, sendDate: "2026-10-25", phase: "Phase 5", audience: "Visitors", subject: "TOMORROW! Doors Open at 9AM — Don't Miss the Exhibition!", purpose: "Eve of Event", bodySummary: "Last-minute reminder. Entry instructions. Day 1 must-sees. Weather note. Excitement!", ctaText: "See You Tomorrow!", ctaLink: "thetechfestival.com/visit", segment: "All registered visitors" },
];

export async function seedCampaignTemplates() {
  console.log("Seeding campaign templates...");

  const results = { created: 0, skipped: 0, errors: [] };

  for (const data of CAMPAIGN_DATA) {
    try {
      const templateId = `tfc-2026-${String(data.id).padStart(3, "0")}`;
      
      const existing = await CampaignTemplate.findOne({ templateId });
      
      if (existing) {
        results.skipped++;
        continue;
      }

      const template = new CampaignTemplate({
        templateId,
        sendDate: new Date(data.sendDate),
        phase: data.phase,
        audience: data.audience,
        subject: data.subject,
        purpose: data.purpose,
        bodySummary: data.bodySummary,
        ctaText: data.ctaText,
        ctaLink: data.ctaLink,
        segment: data.segment,
        autoGenerated: true,
        status: "pending",
      });

      await template.save();
      results.created++;
    } catch (err) {
      results.errors.push({ id: data.id, error: err.message });
    }
  }

  console.log(`Seed complete: ${results.created} created, ${results.skipped} skipped`);
  if (results.errors.length > 0) {
    console.log("Errors:", results.errors);
  }

  return results;
}

export async function createDefaultAudiences() {
  const audiences = [
    { name: "Sponsor Leads", description: "Prospective and confirmed sponsors" },
    { name: "Exhibitor Leads", description: "Prospective and confirmed exhibitors" },
    { name: "Delegate Prospects", description: "Potential delegate attendees" },
    { name: "Visitor Prospects", description: "Free visitor registration leads" },
  ];

  const results = [];

  for (const aud of audiences) {
    const existing = await Audience.findOne({ name: aud.name });
    if (!existing) {
      const created = new Audience({
        name: aud.name,
        description: aud.description,
        contacts: [],
      });
      await created.save();
      results.push(created);
    }
  }

  console.log(`Created ${results.length} default audiences`);
  return results;
}

export async function getUpcomingCampaigns(days = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  const templates = await CampaignTemplate.find({
    sendDate: { $gte: now, $lte: future },
    status: "pending",
  }).sort({ sendDate: 1, audience: 1 });

  return templates;
}

export async function markCampaignSent(templateId) {
  await CampaignTemplate.findOneAndUpdate(
    { templateId },
    { status: "sent", sentAt: new Date() }
  );
}

export default {
  seedCampaignTemplates,
  createDefaultAudiences,
  getUpcomingCampaigns,
  markCampaignSent,
};
