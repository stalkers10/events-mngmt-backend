/**
 * Boarding-pass design helpers.
 *
 * The old approach fetched raw HTML files from the server and patched them
 * with regex. That has been replaced: the designs now live entirely in
 * boarding-pass.template.ts as compiled TypeScript template literals with
 * {{token}} placeholders, and are rendered through the same renderTemplateHtml
 * pipeline as every other static design.
 *
 * This file is kept only to export the `isBoardingPassDesign` helper that
 * ticket-template-host.component.ts uses to set the 960 px iframe viewport.
 */

export function isBoardingPassDesign(designId: string): boolean {
  return designId === 'boarding-single' || designId === 'boarding-couple';
}
