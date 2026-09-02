import { TicketCategory, TicketGroupTheme, TicketTemplateEntry } from './ticket-template.types';
import { classicTemplateHtml } from './templates/classic.template';
import { marriageTemplateHtml } from './templates/marriage.template';
import { ceremonyTemplateHtml } from './templates/ceremony.template';
import { boardingCoupleTemplateHtml, boardingSingleTemplateHtml } from './templates/boarding-pass.template';
import { anniversarySingleTemplateHtml, anniversaryCoupleTemplateHtml } from './templates/anniversary.template';
import { simpleSingleTemplateHtml, simpleCoupleTemplateHtml } from './templates/simple.template';
import { midnightGalaSingleTemplateHtml, midnightGalaCoupleTemplateHtml } from './templates/midnight-gala.template';

/**
 * The built-in designs. The stored template id on an event is one of these keys.
 * anniversary and classic/simple are kept in DESIGNS so existing events that
 * already reference them still render correctly, but they are removed from the
 * picker catalog below.
 */
export const DESIGNS: Record<string, string> = {
  classic: classicTemplateHtml,
  marriage: marriageTemplateHtml,
  ceremony: ceremonyTemplateHtml,
  'boarding-single': boardingSingleTemplateHtml,
  'boarding-couple': boardingCoupleTemplateHtml,
  'anniversary-single': anniversarySingleTemplateHtml,
  'anniversary-couple': anniversaryCoupleTemplateHtml,
  'simple-single': simpleSingleTemplateHtml,
  'simple-couple': simpleCoupleTemplateHtml,
  'midnight-single': midnightGalaSingleTemplateHtml,
  'midnight-couple': midnightGalaCoupleTemplateHtml,
};

export const ALLOWED_DESIGN_IDS = Object.keys(DESIGNS);

export function getTemplateHtml(designId: string): string {
  return DESIGNS[designId] ?? DESIGNS['classic'];
}

/** Fixed canvas width used by the gallery and PDF renderer for each base design. */
export function getTemplateNaturalWidth(designId: string): number {
  const wide = ['boarding-single', 'boarding-couple', 'anniversary-single', 'anniversary-couple', 'simple-single', 'simple-couple', 'midnight-single', 'midnight-couple'];
  return wide.includes(designId) ? 960 : 360;
}

export const CATEGORIES: TicketCategory[] = [
  { id: 'marriage', nameKey: 'ticketTemplates.categories.marriage.name', descriptionKey: 'ticketTemplates.categories.marriage.description' },
  { id: 'anniversary', nameKey: 'ticketTemplates.categories.anniversary.name', descriptionKey: 'ticketTemplates.categories.anniversary.description' },
  { id: 'gala', nameKey: 'ticketTemplates.categories.gala.name', descriptionKey: 'ticketTemplates.categories.gala.description' },
  { id: 'simple', nameKey: 'ticketTemplates.categories.simple.name', descriptionKey: 'ticketTemplates.categories.simple.description' },
];

export const GROUP_THEMES: TicketGroupTheme[] = [
  { id: 'mar-boarding', categoryId: 'marriage', nameKey: '', descriptionKey: '', label: 'Boarding Pass Romance' },
  { id: 'ann-golden', categoryId: 'anniversary', nameKey: 'ticketTemplates.themes.goldenYears.name', descriptionKey: 'ticketTemplates.themes.goldenYears.description' },
  { id: 'gala-midnight', categoryId: 'gala', nameKey: 'ticketTemplates.themes.midnightGala.name', descriptionKey: 'ticketTemplates.themes.midnightGala.description' },
  { id: 'simple-essential', categoryId: 'simple', nameKey: 'ticketTemplates.themes.essential.name', descriptionKey: 'ticketTemplates.themes.essential.description' },
];

// Maps each theme to the base design used for its single & couple templates.
const THEME_DESIGN: Record<string, { single: string; couple: string }> = {
  'mar-boarding':   { single: 'boarding-single',     couple: 'boarding-couple' },
  'ann-golden':     { single: 'anniversary-single',  couple: 'anniversary-couple' },
  'gala-midnight':  { single: 'midnight-single',  couple: 'midnight-couple' },
  'simple-essential':{ single: 'simple-single',      couple: 'simple-couple' },
};

export const TEMPLATES: TicketTemplateEntry[] = GROUP_THEMES.flatMap((theme) => {
  const design = THEME_DESIGN[theme.id] ?? { single: 'classic', couple: 'classic' };
  return [
    {
      id: `${theme.id}-single`,
      designId: design.single,
      groupThemeId: theme.id,
      type: 'single',
      nameKey: 'ticketTemplates.types.single',
      descriptionKey: 'ticketTemplates.types.singleDesc',
    },
    {
      id: `${theme.id}-couple`,
      designId: design.couple,
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
        custom: true,
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
      custom: true,
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
