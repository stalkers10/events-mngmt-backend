/**
 * Returns true for any fixed 960px-wide landscape ticket design.
 * These designs must render inside an iframe with a 960px viewport —
 * html2canvas clips and misrenders writing-mode/transform on them.
 */
export function isBoardingPassDesign(designId: string): boolean {
  return [
    'boarding-single',
    'boarding-couple',
    'anniversary-single',
    'anniversary-couple',
    'simple-single',
    'simple-couple',
  ].includes(designId);
}
