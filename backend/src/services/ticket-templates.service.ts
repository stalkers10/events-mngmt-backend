import { query } from '../config/db';
import { RoleType } from '../types/auth';

export interface TicketTemplateRow {
  id: string;
  category: string;
  theme_name: string;
  theme_description: string | null;
  single_html: string;
  couple_html: string;
  single_mapping: Record<string, string>;
  couple_mapping: Record<string, string>;
  created_by: string | null;
  client_id: string | null;
  created_at: Date;
}

export interface TicketTemplatesUser {
  id: string;
  role: RoleType;
  clientId?: string;
}

export const TicketTemplatesService = {
  async list(user: TicketTemplatesUser): Promise<TicketTemplateRow[]> {
    if (user.role === RoleType.CLIENT_ADMIN) {
      const res = await query<TicketTemplateRow>(
        `SELECT * FROM ticket_templates WHERE client_id = $1 ORDER BY created_at DESC`,
        [user.clientId]
      );
      return res.rows;
    }
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
    user: TicketTemplatesUser,
    category: string,
    themeName: string,
    themeDescription: string | null,
    singleHtml: string,
    coupleHtml: string,
    singleMapping: Record<string, string>,
    coupleMapping: Record<string, string>
  ): Promise<TicketTemplateRow> {
    const clientId = user.role === RoleType.CLIENT_ADMIN ? user.clientId : null;
    const res = await query<TicketTemplateRow>(
      `INSERT INTO ticket_templates (category, theme_name, theme_description, single_html, couple_html, single_mapping, couple_mapping, created_by, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [category, themeName, themeDescription, singleHtml, coupleHtml, singleMapping, coupleMapping, user.id, clientId]
    );
    return res.rows[0];
  },

  async deleteById(id: string, user: TicketTemplatesUser): Promise<{ deleted: boolean; authorized: boolean }> {
    if (user.role === RoleType.CLIENT_ADMIN) {
      const res = await query(
        `DELETE FROM ticket_templates WHERE id = $1 AND created_by = $2`,
        [id, user.id]
      );
      if ((res.rowCount ?? 0) > 0) return { deleted: true, authorized: true };
      const existing = await this.getById(id);
      if (!existing) return { deleted: false, authorized: true };
      return { deleted: false, authorized: false };
    }
    const res = await query(`DELETE FROM ticket_templates WHERE id = $1`, [id]);
    return { deleted: (res.rowCount ?? 0) > 0, authorized: true };
  },
};
