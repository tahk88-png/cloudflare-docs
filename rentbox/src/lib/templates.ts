export const MESSAGES = {
  ET: {
    PICKUP_INSTRUCTIONS: "Rentbox: Sinu broneering on makstud! Kapp: {{lockerLocation}}, uks {{compartmentSize}}. Kood: Avatud rakendusest.",
    REMINDER_START_MINUS_15: "Rentbox: Sinu broneering algab 15 minuti pärast. Asukoht: {{lockerLocation}}.",
    REMINDER_RETURN_MINUS_2H: "Rentbox: Sinu rent lõpeb 2 tunni pärast. Palun tagasta seade õigeaegselt.",
    OVERDUE_LADDER_1: "Rentbox: Sinu broneering on 30 min üle aja. Palun tagasta seade kohe. Lisandub hilinemistasu.",
    OVERDUE_LADDER_2: "Rentbox: Broneering on 24h üle aja. Oleme teavitanud haldurit. Palun võta ühendust.",
    HIGH_RISK_PROACTIVE: "Rentbox: Tuletame meelde rentimise reegleid. Seadme peab tagastama puhtana ja õigeaegselt.",
    REVIEW_REQUEST: "Rentbox: Kuidas jäid rahule? Anna hinnang: {{link}}",
    MAINTENANCE_ACK: "Rentbox: Täname teavituse eest. Tegeleme probleemiga esimesel võimalusel.",
  }
};

export function getTemplate(key: keyof typeof MESSAGES.ET, params: Record<string, string> = {}) {
  let text = MESSAGES.ET[key] || "";
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{{${k}}}`, v);
  }
  return text;
}
