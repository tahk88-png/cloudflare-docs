import { query } from '../db';
import { MessageTemplate } from '../types';

export class TemplateRepository {
  static async findByName(name: string): Promise<MessageTemplate | null> {
    const result = await query<MessageTemplate>(
      `SELECT * FROM message_templates WHERE name = $1 AND active = true`,
      [name]
    );

    return result.rows[0] || null;
  }

  static async findByCategory(
    category: string,
    type?: 'email' | 'sms'
  ): Promise<MessageTemplate[]> {
    let sql = `SELECT * FROM message_templates WHERE category = $1 AND active = true`;
    const params: any[] = [category];

    if (type) {
      sql += ` AND type = $2`;
      params.push(type);
    }

    const result = await query<MessageTemplate>(sql, params);
    return result.rows;
  }

  static renderTemplate(
    template: MessageTemplate,
    variables: Record<string, any>
  ): { subject?: string; body: string } {
    let body = template.body_template;
    let subject = template.subject;

    // Replace all {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, String(value));
      if (subject) {
        subject = subject.replace(regex, String(value));
      }
    });

    return { subject, body };
  }
}
