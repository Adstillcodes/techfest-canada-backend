# Mail Analyzer Project - Context Document

> Created: March 30, 2026
> Last Updated: March 30, 2026

---

## Project Overview

This document captures the project context for building an AI-powered email classification system for TechFest Canada. The system analyzes email lists and automatically categorizes contacts into different prospect categories.

---

## Current System Status

### Issues Fixed (Completed)

1. **Sent Emails Not Updating** (FIXED)
   - Problem: When sending emails, the "sent" count showed 0
   - Root Cause: Two separate campaign systems (Campaign vs CampaignTemplate) weren't connected
   - Solution: Modified `routes/campaignAutomation.js` to create Campaign entries when sending via automation templates

2. **Click Tracking Not Working** (FIXED)
   - Problem: Links in emails weren't tracked
   - Root Cause: `wrapLinksWithTracking` function existed but was never called
   - Solution: Imported and applied click tracking in both campaigns.js and campaignAutomation.js

3. **Test Emails Not Tracked** (FIXED)
   - Problem: Test emails didn't count toward sent metrics
   - Solution: Added EmailTracking creation and stats increment for test sends

4. **Automation Campaign ID Mismatch** (FIXED)
   - Problem: Campaign name used `templateId` but tracking used `tpl-{_id}`
   - Solution: Unified to use `tpl-{template._id}` consistently

---

## New Feature: AI-Powered Lead Classification

### Problem Statement

User has 4 prospect categories:
1. Visitor Prospects
2. Delegate Prospects
3. Exhibitor Leads
4. Sponsor Leads

Need: A tool to analyze email lists (3,000+ contacts) and automatically classify each contact into the appropriate category, then distribute them to the correct audiences for targeted email campaigns.

### Solution: Ollama-Powered Local AI Classification

**Why Local AI?**
- No API costs (runs on local machine)
- Privacy: Data stays local
- ~3-5 minutes for 3,000 contacts

### Technical Specifications

**Hardware:**
- Laptop: AMD Ryzen 7 5800H CPU
- GPU: RTX 3050 (4GB VRAM)
- RAM: 16GB

**Recommended Model:** `llama3.2:3b` (or `mistral`)
- Fits in 4GB VRAM
- ~10-15 emails/second processing speed
- Excellent classification accuracy

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR SYSTEM                               │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │   Frontend      │    │   Backend       │                   │
│  │   (Next.js)    │◀──▶│   (Express)     │                   │
│  └─────────────────┘    └────────┬────────┘                   │
│                                    │                             │
│                         ┌──────────▼──────────┐                │
│                         │   Ollama (Local)    │                │
│                         │   llama3.2:3b       │                │
│                         └─────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Classification Categories

| Category | Description | Classification Rules |
|----------|-------------|---------------------|
| Visitor | Students, general attendees | `@university.edu`, "student", "professor" |
| Delegate | Individual professionals | Default category |
| Exhibitor Lead | Companies looking to exhibit | "exhibit", "trade show", "booth" |
| Sponsor Lead | Companies looking to sponsor | CEO, VP, Director + large company signals |

### Classification Prompt

```json
{
  "model": "llama3.2:3b",
  "prompt": "Classify this contact into exactly ONE category: Visitor, Delegate, Exhibitor Lead, or Sponsor Lead.\n\nRULES:\n- If company contains 'university', 'college', 'student' → Visitor\n- If title contains CEO, CFO, VP, Founder, Director and company is established → Sponsor Lead\n- If company mentions events, exhibitions, trade shows → Exhibitor Lead\n- Otherwise → Delegate\n\nContact: {name}\nEmail: {email}\nCompany: {company}\nTitle: {title}\n\nRespond with ONLY the category name.",
  "stream": false
}
```

---

## Implementation Plan

### Phase 1: Backend Setup

**New Files:**

| File | Description |
|------|-------------|
| `services/aiClassifier.js` | Ollama API integration |
| `routes/classify.js` | API endpoints |
| `models/ClassificationJob.js` | Track processing status |

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/classify/import` | POST | Upload & parse CSV |
| `/api/classify/process` | POST | Run Ollama classification |
| `/api/classify/status` | GET | Poll for progress |
| `/api/classify/confirm` | POST | Save to audiences |

### Phase 2: Frontend

**New/Modified Files:**

| File | Description |
|------|-------------|
| `frontend/AdminLeadIntelligence.jsx` | New admin page |
| `frontend/Admin.jsx` | Add navigation tab |

### Phase 3: Integration

- Auto-distribute classified contacts to existing audiences
- Reuse existing email campaign system for sending

---

## CSV Format

```csv
email,name,company,title,linkedin_url
john@techcorp.com,John Smith,TechCorp Inc,CEO,https://linkedin.com/in/johnsmith
sarah@university.edu,Sarah Johnson,State University,Professor,
```

**Required:** `email`
**Optional:** `name`, `company`, `title`, `linkedin_url`

---

## Files to Create/Modify

### Backend (To Create)

- [ ] `services/aiClassifier.js`
- [ ] `routes/classify.js`
- [ ] `models/ClassificationJob.js`

### Backend (Modified)

- [ ] `server.js` - Add new routes

### Frontend (To Create)

- [ ] `src/components/AdminLeadIntelligence.jsx`

### Frontend (Modified)

- [ ] `src/pages/Admin.jsx` - Add Lead Intelligence tab

---

## Estimated Timeline

| Phase | Time |
|-------|------|
| Backend Setup | 1-2 hours |
| Frontend | 1-2 hours |
| Testing | 30 minutes |
| **Total** | **~3-4 hours** |

---

## Notes

1. **Ollama should be running** on the local machine before using the feature
2. **Model can be changed** - system can be made configurable to test different models
3. **LinkedIn URLs are optional** - they provide marginal classification improvement
4. **Processing happens in batches** - 50 contacts per request to avoid memory issues

---

## Previous Code Changes Summary

### Fixed Issues

1. **campaignAutomation.js**: Connected to Campaign model, added EmailTracking
2. **campaigns.js**: Added wrapLinksWithTracking, test email tracking
3. **tracking.js**: Added logging, fixed automation campaign stats updates
4. **Campaign.js model**: Made audienceId optional
5. **emailService.js**: Added error handling in wrapLinksWithTracking

### Key Code Locations

- **Campaign launch**: `routes/campaigns.js` - `POST /:id/launch`
- **Template send**: `routes/campaignAutomation.js` - `POST /templates/:id/send`
- **Click tracking**: `routes/tracking.js` - `GET /click`
- **Open tracking**: `routes/tracking.js` - `GET /open/:campaignId/:email`
- **Email service**: `services/emailService.js`

---

*This document should be updated as the project progresses.*
