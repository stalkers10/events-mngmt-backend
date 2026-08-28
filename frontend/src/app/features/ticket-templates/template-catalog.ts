import { TicketCategory, TicketGroupTheme, TicketTemplateEntry } from './ticket-template.types';
import { classicTemplateHtml } from './templates/classic.template';
import { marriageTemplateHtml } from './templates/marriage.template';
import { anniversaryTemplateHtml } from './templates/anniversary.template';
import { ceremonyTemplateHtml } from './templates/ceremony.template';
import { boardingCoupleTemplateHtml, boardingSingleTemplateHtml } from './templates/boarding-pass.template';

/**
 * The built-in designs. The stored template id on an event is one of these keys.
 * New designer HTML is added here (and to the backend allow-list in
 * EventsService.setTicketTemplates). The per-type/per-theme catalog below
 * references these by `designId`.
 */
export const DESIGNS: Record<string, string> = {
  classic: classicTemplateHtml,
  marriage: marriageTemplateHtml,
  anniversary: anniversaryTemplateHtml,
  ceremony: ceremonyTemplateHtml,
  'boarding-single': boardingSingleTemplateHtml,
  'boarding-couple': boardingCoupleTemplateHtml,
};

export const ALLOWED_DESIGN_IDS = Object.keys(DESIGNS);

export function getTemplateHtml(designId: string): string {
  return DESIGNS[designId] ?? DESIGNS['classic'];
}

/** Fixed canvas width used by the gallery and PDF renderer for each base design. */
export function getTemplateNaturalWidth(designId: string): number {
  return designId === 'boarding-single' || designId === 'boarding-couple' ? 960 : 360;
}

export const CATEGORIES: TicketCategory[] = [
  { id: 'marriage', nameKey: 'ticketTemplates.categories.marriage.name', descriptionKey: 'ticketTemplates.categories.marriage.description' },
  { id: 'anniversary', nameKey: 'ticketTemplates.categories.anniversary.name', descriptionKey: 'ticketTemplates.categories.anniversary.description' },
  { id: 'gala', nameKey: 'ticketTemplates.categories.gala.name', descriptionKey: 'ticketTemplates.categories.gala.description' },
  { id: 'simple', nameKey: 'ticketTemplates.categories.simple.name', descriptionKey: 'ticketTemplates.categories.simple.description' },
];

export const GROUP_THEMES: TicketGroupTheme[] = [
  { id: 'mar-elegant', categoryId: 'marriage', nameKey: 'ticketTemplates.themes.elegantBlush.name', descriptionKey: 'ticketTemplates.themes.elegantBlush.description' },
  { id: 'mar-classic', categoryId: 'marriage', nameKey: 'ticketTemplates.themes.classicRomance.name', descriptionKey: 'ticketTemplates.themes.classicRomance.description' },
  { id: 'mar-boarding', categoryId: 'marriage', nameKey: '', descriptionKey: '', label: 'Boarding Pass Romance' },
  { id: 'ann-golden', categoryId: 'anniversary', nameKey: 'ticketTemplates.themes.goldenYears.name', descriptionKey: 'ticketTemplates.themes.goldenYears.description' },
  { id: 'ann-modern', categoryId: 'anniversary', nameKey: 'ticketTemplates.themes.modernLove.name', descriptionKey: 'ticketTemplates.themes.modernLove.description' },
  { id: 'gala-midnight', categoryId: 'gala', nameKey: 'ticketTemplates.themes.midnightGala.name', descriptionKey: 'ticketTemplates.themes.midnightGala.description' },
  { id: 'gala-charity', categoryId: 'gala', nameKey: 'ticketTemplates.themes.charityBall.name', descriptionKey: 'ticketTemplates.themes.charityBall.description' },
  { id: 'simple-minimal', categoryId: 'simple', nameKey: 'ticketTemplates.themes.minimal.name', descriptionKey: 'ticketTemplates.themes.minimal.description' },
  { id: 'simple-essential', categoryId: 'simple', nameKey: 'ticketTemplates.themes.essential.name', descriptionKey: 'ticketTemplates.themes.essential.description' },
];

// Maps each theme to the base design used for its single & couple templates.
const THEME_DESIGN: Record<string, string> = {
  'mar-elegant': 'marriage',
  'mar-classic': 'marriage',
  'ann-golden': 'anniversary',
  'ann-modern': 'anniversary',
  'gala-midnight': 'ceremony',
  'gala-charity': 'ceremony',
  'simple-minimal': 'classic',
  'simple-essential': 'classic',
};

export const TEMPLATES: TicketTemplateEntry[] = GROUP_THEMES.flatMap((theme) => {
  const designId = THEME_DESIGN[theme.id] ?? 'classic';
  return [
    {
      id: `${theme.id}-single`,
      designId: theme.id === 'mar-boarding' ? 'boarding-single' : designId,
      groupThemeId: theme.id,
      type: 'single',
      nameKey: 'ticketTemplates.types.single',
      descriptionKey: 'ticketTemplates.types.singleDesc',
    },
    {
      id: `${theme.id}-couple`,
      designId: theme.id === 'mar-boarding' ? 'boarding-couple' : designId,
      groupThemeId: theme.id,
      type: 'couple',
      nameKey: 'ticketTemplates.types.couple',
      descriptionKey: 'ticketTemplates.types.coupleDesc',
    },
  ];
});

export function getCategories(): TicketCategory[] {
  return CATEGORIES;
}

export function getGroupThemesByCategory(categoryId: string): TicketGroupTheme[] {
  return GROUP_THEMES.filter((t) => t.categoryId === categoryId);
}

export function getTemplatesByGroupTheme(themeId: string, type?: 'single' | 'couple'): TicketTemplateEntry[] {
  return TEMPLATES.filter((t) => t.groupThemeId === themeId && (!type || t.type === type));
}

export function getCategory(categoryId: string): TicketCategory | undefined {
  return CATEGORIES.find((c) => c.id === categoryId);
}

export function getGroupTheme(themeId: string): TicketGroupTheme | undefined {
  return GROUP_THEMES.find((t) => t.id === themeId);
}

export function isStaticDesign(designId: string): boolean {
  return Object.prototype.hasOwnProperty.call(DESIGNS, designId);
}

export function isCustomDesign(designId: string): boolean {
  return !isStaticDesign(designId) && designId.includes('__');
}

/**
 * Returns the stored HTML for a design id. For custom designs (id of the form
 * `<rowId>__single` / `<rowId>__couple`) the matching custom row is looked up
 * in the provided list. Falls back to the classic design.
 */
export function getHtmlForDesign(designId: string, custom: any[] = []): string {
  if (isStaticDesign(designId)) return DESIGNS[designId];
  const match = designId.match(/^(.+?)__(single|couple)$/);
  if (!match) return DESIGNS['classic'];
  const row = custom.find((t) => t.id === match[1]);
  if (!row) return DESIGNS['classic'];
  return match[2] === 'couple' ? row.couple_html : row.single_html;
}

/**
 * Merged category list: the static CATEGORIES plus any category that only
 * exists on custom templates. Custom categories use a direct `label`.
 */
export function getMergedCategories(custom: any[] = []): TicketCategory[] {
  const merged = [...CATEGORIES];
  const known = new Set(merged.map((c) => c.id));
  for (const row of custom) {
    if (row.category && !known.has(row.category)) {
      known.add(row.category);
      merged.push({
        id: row.category,
        nameKey: '',
        descriptionKey: '',
        label: row.category,
      });
    }
  }
  return merged;
}

/**
 * Merged group-theme list: the static GROUP_THEMES plus one pseudo theme per
 * custom template row (each row carries a single + couple template).
 */
export function getMergedGroupThemes(custom: any[] = []): TicketGroupTheme[] {
  const merged = [...GROUP_THEMES];
  for (const row of custom) {
    merged.push({
      id: `custom-${row.id}`,
      categoryId: row.category,
      nameKey: '',
      descriptionKey: '',
      label: row.theme_name,
    });
  }
  return merged;
}

export function getMergedTemplates(custom: any[] = []): TicketTemplateEntry[] {
  const merged = [...TEMPLATES];
  for (const row of custom) {
    merged.push(
      {
        id: `${row.id}-single`,
        designId: `${row.id}__single`,
        groupThemeId: `custom-${row.id}`,
        type: 'single',
        nameKey: 'ticketTemplates.types.single',
        descriptionKey: 'ticketTemplates.types.singleDesc',
        label: row.theme_name,
        custom: true,
      },
      {
        id: `${row.id}-couple`,
        designId: `${row.id}__couple`,
        groupThemeId: `custom-${row.id}`,
        type: 'couple',
        nameKey: 'ticketTemplates.types.couple',
        descriptionKey: 'ticketTemplates.types.coupleDesc',
        label: row.theme_name,
        custom: true,
      }
    );
  }
  return merged;
}
