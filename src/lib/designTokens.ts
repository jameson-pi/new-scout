/**
 * Design Tokens for Howdy Bots Scout Application
 * Centralized color system ensuring consistency across all UI
 */

// ============================================================
// BRAND COLORS (Primary Palette)
// ============================================================
export const brandColors = {
  primary: {
    brown: '#8a5823',
    brownShade: '#4e3412',
    brownTint: '#ba8a3a',
  },
  secondary: {
    blue: '#2e5174',
    red: '#ac2424',
    white: '#ffe8bf',
  },
  teal: '#00cccc', // Legacy, use sparingly
};

// ============================================================
// SEMANTIC COLORS (States & Meanings)
// ============================================================
export const semanticColors = {
  // Success States
  success: {
    text: '#22c55e',
    background: 'rgba(34, 197, 94, 0.06)',
    border: 'rgba(34, 197, 94, 0.2)',
    light: 'rgba(34, 197, 94, 0.12)',
  },

  // Error/Danger States
  error: {
    text: '#ac2424',
    background: 'rgba(172, 36, 36, 0.06)',
    border: 'rgba(172, 36, 36, 0.2)',
    light: 'rgba(172, 36, 36, 0.12)',
  },

  // Warning/Caution States
  warning: {
    text: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.06)',
    border: 'rgba(245, 158, 11, 0.2)',
    light: 'rgba(245, 158, 11, 0.12)',
  },

  // Info/Neutral States
  info: {
    text: '#3b82f6',
    background: 'rgba(59, 130, 246, 0.06)',
    border: 'rgba(59, 130, 246, 0.2)',
    light: 'rgba(59, 130, 246, 0.12)',
  },

  // Team/Primary States
  primary: {
    text: '#8a5823',
    background: 'rgba(138, 88, 35, 0.06)',
    border: 'rgba(138, 88, 35, 0.2)',
    light: 'rgba(138, 88, 35, 0.12)',
  },

  // Secondary/Accent States
  secondary: {
    text: '#2e5174',
    background: 'rgba(46, 81, 116, 0.06)',
    border: 'rgba(46, 81, 116, 0.2)',
    light: 'rgba(46, 81, 116, 0.12)',
  },
};

// ============================================================
// NEUTRAL COLORS (Typography & Backgrounds)
// ============================================================
export const neutralColors = {
  background: '#0b0d10',
  surface: 'rgba(20, 24, 30, 0.82)',
  foreground: '#e9ecf1',
  muted: '#a5aeb9',
  mutedDark: '#888',
  mutedDarker: '#666',
  border: 'rgba(255, 255, 255, 0.08)',
};

// ============================================================
// DATA VISUALIZATION COLORS
// ============================================================
export const dataVizColors = {
  high: '#22c55e', // Green - high/good values
  medium: '#f59e0b', // Orange - medium/caution values
  low: '#ac2424', // Red - low/poor values
};

// ============================================================
// COLOR FUNCTIONS (Logic for Dynamic Colors)
// ============================================================

/**
 * Get color based on reliability risk level
 */
export function getRiskColor(riskLevel: 'low' | 'medium' | 'high'): string {
  const colorMap = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ac2424',
  };
  return colorMap[riskLevel];
}

/**
 * Get color based on numeric percentage (0-100)
 * Green (high) -> Orange (medium) -> Red (low)
 */
export function getPercentageColor(percentage: number): string {
  if (percentage >= 75) return '#22c55e'; // Green
  if (percentage >= 50) return '#f59e0b'; // Orange
  return '#ac2424'; // Red
}

/**
 * Get color for consensus/agreement level
 */
export function getConsensusColor(consensusPercent: number): string {
  if (consensusPercent >= 75) return '#22c55e'; // Strong agreement
  if (consensusPercent >= 50) return '#f59e0b'; // Moderate agreement
  return '#ac2424'; // Low agreement
}

/**
 * Get accent border color for emphasis
 */
export function getAccentBorderColor(type: 'primary' | 'secondary' | 'warning' | 'error'): string {
  const colorMap = {
    primary: brandColors.primary.brown,
    secondary: brandColors.secondary.blue,
    warning: '#f59e0b',
    error: brandColors.secondary.red,
  };
  return colorMap[type];
}

/**
 * Get semantic color object for a state
 */
export function getSemanticColor(
  state: 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary'
) {
  return semanticColors[state];
}

// ============================================================
// EXPORT PRESETS FOR COMMON PATTERNS
// ============================================================

/**
 * Preset: Text color for labels/muted content
 */
export const labelColor = neutralColors.mutedDark;

/**
 * Preset: Text color for secondary labels
 */
export const secondaryLabelColor = neutralColors.mutedDarker;

/**
 * Preset: Border color for subtle dividers
 */
export const dividerColor = neutralColors.border;

/**
 * Preset: Background for disabled/inactive states
 */
export const disabledBackground = 'rgba(255,255,255,0.03)';

/**
 * Preset: Text color for disabled/inactive states
 */
export const disabledText = neutralColors.mutedDarker;

