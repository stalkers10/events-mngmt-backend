import { query } from '../config/db';

export interface TicketTemplateRow {
  id: string;
  category: string;
  theme_name: string;
  theme_description: string | null;
  single_html: string;
  couple_html: string;
  single_mapping: Record<string, string>;
  couple_mapping: Record<string, string>;
  created_at: Date;
}

export const TicketTemplatesService = {
  async list(): Promise<TicketTemplateRow[]> {
    const res = await query<TicketTemplateRow>(
      `SELECT * FROM ticket_templates ORDER BY created_at DESC`
    );
    return res.rows;
  },

  async getById(id: string): Promise<TicketTemplateRow | null> {
    const res = await query<TicketTemplateRow>(
      `SELECT * FROM ticket_templates WHERE id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  },

  async create(
    category: string,
    themeName: string,
    themeDescription: string | null,
    singleHtml: string,
    coupleHtml: string,
    singleMapping: Record<string, string>,
    coupleMapping: Record<string, string>
  ): Promise<TicketTemplateRow> {
    const res = await query<TicketTemplateRow>(
      `INSERT INTO ticket_templates (category, theme_name, theme_description, single_html, couple_html, single_mapping, couple_mapping)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [category, themeName, themeDescription, singleHtml, coupleHtml, singleMapping, coupleMapping]
    );
    return res.rows[0];
  },
};
