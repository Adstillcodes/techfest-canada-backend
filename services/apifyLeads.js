const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_TOKEN) {
  throw new Error("APIFY_API_TOKEN environment variable is required");
}

const ACTOR_ID = "boneswill/leads-generator";
const APIFY_BASE = "https://api.apify.com/v2";

async function generateLeadsFromApify(filters) {
  const {
    personTitle = [],
    seniority = [],
    functional = [],
    companyEmployeeSize = [],
    personCountry = [],
    personState = [],
    companyCountry = [],
    companyState = [],
    industry = [],
    industryKeywords = [],
    revenue = [],
    businessModel = [],
    companyDomain = [],
    totalResults = 5000,
    includeEmails = true,
  } = filters;

  const input = {
    firstName: "",
    lastName: "",
    personTitle: personTitle.length > 0 ? personTitle : undefined,
    seniority: seniority.length > 0 ? seniority : undefined,
    functional: functional.length > 0 ? functional : undefined,
    companyEmployeeSize: companyEmployeeSize.length > 0 ? companyEmployeeSize : undefined,
    personCountry: personCountry.length > 0 ? personCountry : undefined,
    personState: personState.length > 0 ? personState : undefined,
    companyCountry: companyCountry.length > 0 ? companyCountry : undefined,
    companyState: companyState.length > 0 ? companyState : undefined,
    industry: industry.length > 0 ? industry : undefined,
    industryKeywords: industryKeywords.length > 0 ? industryKeywords : undefined,
    revenue: revenue.length > 0 ? revenue : undefined,
    businessModel: businessModel.length > 0 ? businessModel : undefined,
    companyDomain: companyDomain.length > 0 ? companyDomain : undefined,
    totalResults: totalResults || 5000,
    includeEmails: includeEmails !== false,
  };

  console.log("🎯 Running Apify lead generation with input:", JSON.stringify(input, null, 2));

  // Step 1: Start the actor run
  const startResponse = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`Failed to start Apify actor: ${errorText}`);
  }

  const run = await startResponse.json();

  if (!run.id) {
    throw new Error("Apify run failed to start");
  }

  console.log(`🚀 Apify run started: ${run.id}`);

  // Step 2: Poll for completion
  let runStatus = run;
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes max

  while (runStatus.status !== "SUCCEEDED" && runStatus.status !== "FAILED" && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
    attempts++;

    const statusResponse = await fetch(
      `${APIFY_BASE}/runs/${run.id}?token=${APIFY_TOKEN}`
    );

    if (!statusResponse.ok) {
      console.log(`📊 Run status: ${runStatus.status} (attempt ${attempts})`);
      continue;
    }

    runStatus = await statusResponse.json();
    console.log(`📊 Run status: ${runStatus.status} (attempt ${attempts})`);
  }

  if (runStatus.status === "FAILED") {
    throw new Error(`Apify run failed: ${runStatus.errorMessage || "Unknown error"}`);
  }

  if (runStatus.status !== "SUCCEEDED") {
    throw new Error(`Apify run timed out after ${maxAttempts} seconds`);
  }

  const datasetId = runStatus.defaultDatasetId;
  if (!datasetId) {
    throw new Error("No dataset returned from Apify");
  }

  // Step 3: Get the data
  const itemsResponse = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );

  if (!itemsResponse.ok) {
    throw new Error("Failed to retrieve lead data from Apify");
  }

  const items = await itemsResponse.json();

  console.log(`✅ Generated ${items.length} leads from Apify`);

  return items;
}

function transformApifyLead(apifyLead) {
  const firstName = apifyLead.firstName || "";
  const lastName = apifyLead.lastName || "";
  const leadName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

  const email = apifyLead.emails?.[0]?.email || "";
  const emailStatus = apifyLead.emails?.[0]?.status || "unknown";

  const phone = apifyLead.phones?.[0]?.phoneNumber || "";

  const linkedin = apifyLead.linkedinUrl || "";

  const company = apifyLead.company || {};

  return {
    leadName,
    companyName: company.companyName || apifyLead.companyName || "",
    jobTitle: apifyLead.title || apifyLead.jobTitle || "",
    industry: apifyLead.industry || company.industry || "",
    country: apifyLead.country || company.country || "",
    city: apifyLead.city || "",
    score: 50,
    email,
    phone,
    linkedin,
    website: company.website || apifyLead.website || "",
    notes: "",
    followUpDate: "",
    followUpNotes: "",
    reminderDate: "",
    reminderNotes: "",
    meetingHeldDate: "",
    meetingNotes: "",
    contactMethod: "Phone Call",
    contactLog: [],
    dealSize: 0,
    dealCategories: [],
    status: "new",
    relatedLeadId: "",
    leadContact: "",
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    lastContactedAt: null,
    lastContactedBy: null,
    email_status: emailStatus,
    functionalLevel: "",
    company_domain: company.domain || company.companyDomain || "",
    company_size: company.employeeCount || "",
    company_annual_revenue_clean: company.revenue || "",
    company_total_funding_clean: company.totalFunding || "",
    company_founded_year: company.foundedYear || "",
    company_linkedin: company.linkedin || "",
    company_phone: company.phone || "",
    company_full_address: company.fullAddress || "",
    company_description: company.description || "",
  };
}

export { generateLeadsFromApify, transformApifyLead };