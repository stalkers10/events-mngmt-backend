export interface TicketTemplateContext {
  event_name: string;
  invitee_name: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  room_number: string;
  floor_number: string;
  table_number: string;
  chair_number: string;
  paired_table_number: string;
  paired_chair_number: string;
  seating_label: string;
  reservation_type: string;
  status: string;
  ticket_id: string;
  qr_token: string;
  qr_image: string;
}

export interface TicketTemplateDef {
  id: string;
  /** i18n key for the display name, e.g. 'ticketTemplates.templates.marriage.name' */
  name: string;
  /** i18n key for the short description */
  description: string;
  category: 'wedding' | 'celebration' | 'formal' | 'generic';
  /** Self-contained HTML (including a <style> block). Use {{token}} placeholders. */
  html: string;
}

export interface TicketCategory {
  id: string;
  nameKey: string;
  descriptionKey: string;
  /** Direct (non-i18n) label used for custom categories created in the UI */
  label?: string;
}

export interface TicketGroupTheme {
  id: string;
  categoryId: string;
  nameKey: string;
  descriptionKey: string;
  /** Direct (non-i18n) label used for custom themes created in the UI */
  label?: string;
}

export interface TicketTemplateEntry {
  /** Unique catalog id (UI only) */
  id: string;
  /** Design id actually stored on the event (must be an allowed design) */
  designId: string;
  groupThemeId: string;
  type: 'single' | 'couple';
  nameKey: string;
  descriptionKey: string;
  /** Direct (non-i18n) label used for custom templates created in the UI */
  label?: string;
  /** When true, designId refers to a custom template row id (suffixed __single/__couple) */
  custom?: boolean;
}
