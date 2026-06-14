/**
 * UI utility functions
 */

import { ASSETS_URL } from '../core/wp';

const ASSETS_PATH = ASSETS_URL;

/**
 * Returns the CSS class for the info button based on whether it's active
 * @param active - Whether the info panel is currently open
 * @returns CSS class string
 */
export const infoBtnClass = (active: boolean): string =>
  `absolute top-3 right-3 z-10 p-1 rounded-full transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-blue-600 border border-slate-200'}`;

/**
 * Resolves an image path to a full URL
 * - Leaves absolute URLs and root-relative paths unchanged
 * - Uses relative paths as-is (no longer prepends assets path by default)
 * - Allows admin to load full URLs directly
 * @param src - The image source path
 * @returns The resolved image URL
 */
export const resolveImage = (src: string): string => src;
