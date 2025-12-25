export type TemplateId =
  | "pickup_instructions"
  | "reminder_before_end"
  | "overdue_notice"
  | "payment_pending";

export type TemplateRender = {
  subject: string;
  text: string;
};

const TEMPLATES: Record<TemplateId, TemplateRender> = {
  pickup_instructions: {
    subject: "Your Rentbox pickup instructions",
    text: [
      "Hi {{name}},",
      "",
      "Your booking {{booking_id}} is ready.",
      "Locker: {{locker_name}} ({{locker_location}})",
      "Compartment: {{compartment_code}}",
      "",
      "Pickup window: {{start_at}} → {{end_at}}",
      "",
      "If you have trouble opening the locker, reply here and we’ll help."
    ].join("\n")
  },
  reminder_before_end: {
    subject: "Reminder: your Rentbox booking ends soon",
    text: [
      "Hi {{name}},",
      "",
      "Reminder: your booking {{booking_id}} ends at {{end_at}}.",
      "If you need more time, contact support before the end time.",
      "",
      "Thanks,"
    ].join("\n")
  },
  overdue_notice: {
    subject: "Action needed: booking overdue",
    text: [
      "Hi {{name}},",
      "",
      "Your booking {{booking_id}} is overdue (ended at {{end_at}}).",
      "Please complete pickup/return as soon as possible.",
      "",
      "If you have an issue, reply to this message."
    ].join("\n")
  },
  payment_pending: {
    subject: "Payment pending for your booking",
    text: [
      "Hi {{name}},",
      "",
      "We haven’t received payment for booking {{booking_id}} yet.",
      "Please complete payment to avoid interruption.",
      "",
      "If you believe this is incorrect, contact support."
    ].join("\n")
  }
};

export function renderTemplate(id: TemplateId, vars: Record<string, string>): TemplateRender {
  const t = TEMPLATES[id];
  const replace = (s: string) =>
    s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (k in vars ? vars[k]! : ""));
  return { subject: replace(t.subject), text: replace(t.text) };
}

