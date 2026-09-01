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
  // Session tokens for boarding-pass template (up to 6 sessions)
  session_1_datetime: string;
  session_1_location: string;
  session_2_datetime: string;
  session_2_location: string;
  session_3_datetime: string;
  session_3_location: string;
  session_4_datetime: string;
  session_4_location: string;
  session_5_datetime: string;
  session_5_location: string;
  session_6_datetime: string;
  session_6_location: string;
}

export interface TicketTemplateDef {
  id: string;
  name: string;
  description: string;
  category: 'marriage' | 'anniversary' | 'gala' | 'simple';
  /** Self-contained HTML (including a <style> block). Use {{token}} placeholders. */
  html: string;
}

export interface TicketCategory {
  id: string;
  nameKey: string;
  descriptionKey: string;
  /** Direct (non-i18n) label used for custom categories created in the UI */
  label?: string;
  /** When true, this category only exists due to a custom template row */
  custom?: boolean;
}

export interface TicketGroupTheme {
  id: string;
  categoryId: string;
  nameKey: string;
  descriptionKey: string;
  /** Direct (non-i18n) label used for custom themes created in the UI */
  label?: string;
  /** When true, this theme is a pseudo-theme for a custom template row */
  custom?: boolean;
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
