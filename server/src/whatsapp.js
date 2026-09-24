const getWhatsAppConfig = () => ({
  accessToken: String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
  phoneNumberId: String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
  templateName: String(process.env.WHATSAPP_TEMPLATE_NAME || '').trim(),
  templateLanguage: String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_ES').trim(),
  graphApiVersion: String(process.env.WHATSAPP_GRAPH_API_VERSION || '').trim(),
});

const isWhatsAppConfigured = () => {
  const config = getWhatsAppConfig();
  return Boolean(config.accessToken && config.phoneNumberId && config.templateName && config.graphApiVersion);
};

const normalizeWhatsAppPhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `34${digits}`;
  return digits;
};

const sendMembershipReminder = async ({ phone, fullName, monthlyFee, dueDate }) => {
  const config = getWhatsAppConfig();
  if (!isWhatsAppConfigured()) throw new Error('WhatsApp Cloud API no está configurada.');
  const recipient = normalizeWhatsAppPhone(phone);
  if (recipient.length < 8 || recipient.length > 15) throw new Error('El teléfono del socio no es válido para WhatsApp.');

  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(config.graphApiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: String(fullName || 'socio').slice(0, 120) },
              { type: 'text', text: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(monthlyFee)) },
              { type: 'text', text: String(dueDate) },
            ],
          }],
        },
      }),
    },
  );

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const reason = String(data?.error?.message || 'Meta ha rechazado el envío del recordatorio.').slice(0, 500);
    throw new Error(reason);
  }
  return data?.messages?.[0]?.id || null;
};

module.exports = { isWhatsAppConfigured, sendMembershipReminder };
