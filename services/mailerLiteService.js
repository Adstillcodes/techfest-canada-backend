import MailerLite from '@mailerlite/mailerlite-nodejs';

const mailerlite = new MailerLite({
  api_key: process.env.MAILERLITE_API_KEY,
});

const NEWSLETTER_GROUP_ID = process.env.MAILERLITE_GROUP_ID;

export async function addSubscriber(email, name = '', source = 'website') {
  try {
    const response = await mailerlite.subscribers.create({
      email,
      fields: {
        name: name,
      },
      groups: [NEWSLETTER_GROUP_ID],
      status: 'active',
      subscribed_at: new Date().toISOString(),
    });
    console.log('[MailerLite] Subscriber added:', email);
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Add subscriber error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function removeSubscriber(email) {
  try {
    const response = await mailerlite.subscribers.update(email, {
      status: 'unsubscribed',
    });
    console.log('[MailerLite] Subscriber unsubscribed:', email);
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Remove subscriber error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getSubscriber(email) {
  try {
    const response = await mailerlite.subscribers.find(email);
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Get subscriber error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getCampaigns() {
  try {
    const response = await mailerlite.campaigns.get();
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Get campaigns error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getCampaign(campaignId) {
  try {
    const response = await mailerlite.campaigns.get(campaignId);
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Get campaign error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getCampaignStats(campaignId) {
  try {
    const response = await mailerlite.campaigns.getStats(campaignId);
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Get campaign stats error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getGroups() {
  try {
    const response = await mailerlite.groups.get();
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Get groups error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getFields() {
  try {
    const response = await mailerlite.fields.get();
    return { success: true, data: response };
  } catch (error) {
    console.error('[MailerLite] Get fields error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function syncSubscriberToMailerLite(email, firstName, lastName, source) {
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || '');
  
  try {
    const existing = await getSubscriber(email);
    
    if (existing.success && existing.data) {
      const subscriber = existing.data;
      const groups = subscriber.groups || [];
      const currentGroupIds = groups.map(g => g.id);
      
      if (!currentGroupIds.includes(parseInt(NEWSLETTER_GROUP_ID))) {
        await mailerlite.subscribers.update(email, {
          groups: [...currentGroupIds, parseInt(NEWSLETTER_GROUP_ID)],
          status: 'active',
        });
      }
      console.log('[MailerLite] Updated existing subscriber:', email);
      return { success: true, action: 'updated' };
    }
    
    const response = await mailerlite.subscribers.create({
      email,
      fields: {
        name: fullName,
        last_name: lastName || '',
      },
      groups: [NEWSLETTER_GROUP_ID],
      status: 'active',
      subscribed_at: new Date().toISOString(),
    });
    console.log('[MailerLite] Created new subscriber:', email);
    return { success: true, action: 'created' };
  } catch (error) {
    console.error('[MailerLite] Sync subscriber error:', error.message);
    return { success: false, error: error.message };
  }
}

export default mailerlite;