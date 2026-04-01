/**
 * Color scale utilities for heatmap visualization
 */

import { scaleSequential } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";
import { rgb } from "d3-color";

/**
 * Creates a D3 color scale for heatmap visualization
 * Uses blue gradient: light blue = low values, dark blue = high values
 *
 * @param values - Array of numeric values to scale
 * @returns D3 sequential scale or null if values are invalid
 */
export function createColorScale(values: number[]) {
  if (!values || values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  // If all values are the same, return null to avoid scale issues
  if (min === max) {
    return null;
  }

  // Create scale with lighter blue gradient
  // Use only the lighter portion of the blues scale (0.2 to 0.7 range)
  // to avoid very dark blues at the high end
  //   return scaleSequential([min, max], interpolateBlues);
  return scaleSequential([min, max], (t: number) => interpolateBlues(t * 0.7));
}

/**
 * Calculates relative luminance of a color to determine text color contrast
 * Uses WCAG formula for luminance calculation
 *
 * @param hexColor - Hex color string (e.g., '#ff5733')
 * @returns Luminance value between 0 (darkest) and 1 (lightest)
 */
function getRelativeLuminance(hexColor: string): number {
  const color = rgb(hexColor);

  if (!color) {
    return 0.5; // Default to medium luminance if parsing fails
  }

  // Convert RGB to relative luminance using WCAG formula
  const rsRGB = color.r / 255;
  const gsRGB = color.g / 255;
  const bsRGB = color.b / 255;

  const r =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determines contrasting text color (black or white) for a given background
 *
 * @param backgroundColor - Hex color string for background
 * @returns '#000000' for light backgrounds, '#ffffff' for dark backgrounds
 */
export function getContrastTextColor(backgroundColor: string): string {
  const luminance = getRelativeLuminance(backgroundColor);

  // Use white text for dark backgrounds (luminance < 0.5)
  // Use black text for light backgrounds (luminance >= 0.5)
  return luminance < 0.5 ? "#ffffff" : "#000000";
}

/**
 * Gets both background and text colors for a heatmap cell
 *
 * @param value - Numeric value to color
 * @param scale - D3 sequential scale (can be null)
 * @returns Object with backgroundColor and color properties
 */
export function getHeatmapColors(
  value: number,
  scale: ReturnType<typeof createColorScale>,
): { backgroundColor: string; color: string } {
  if (!scale) {
    return {
      backgroundColor: "transparent",
      color: "#3c4043",
    };
  }

  const backgroundColor = scale(value);
  const color = getContrastTextColor(backgroundColor);

  return { backgroundColor, color };
}
