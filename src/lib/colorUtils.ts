/**
 * Color Utility Components & Helpers
 * Reusable patterns for consistent color usage across the app
 */

import {
  semanticColors,
  neutralColors,
  getRiskColor,
  getPercentageColor,
  getConsensusColor,
  labelColor,
  secondaryLabelColor,
} from '@/lib/designTokens';

// ============================================================
// COLOR STYLE GENERATORS
// ============================================================

/**
 * Get style object for a labeled value with color
 */
export function getLabeledValueStyles(color: string) {
  return {
    label: {
      fontSize: '9px',
      fontWeight: 900,
      color: labelColor,
      textTransform: 'uppercase' as const,
    },
    value: {
      fontSize: '2rem',
      fontWeight: 950,
      color,
    },
  };
}

/**
 * Get style object for a small metric label
 */
export function getMetricLabelStyles() {
  return {
    fontSize: '10px',
    fontWeight: 950,
    color: neutralColors.mutedDark,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    marginBottom: '1.5rem',
  };
}

/**
 * Get style object for secondary text
 */
export function getSecondaryTextStyles() {
  return {
    fontSize: '0.9rem',
    color: neutralColors.mutedDark,
  };
}

/**
 * Get style object for progress bar
 */
export function getProgressBarStyles(fillColor: string) {
  return {
    container: {
      height: '8px',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '4px',
    },
    fill: {
      height: '100%',
      background: fillColor,
      borderRadius: '4px',
    },
  };
}

/**
 * Get style object for section card with accent
 */
export function getAccentCardStyles(accentColor: string, accentType: 'left' | 'top' = 'top') {
  return {
    padding: '2rem',
    borderRadius: '30px',
    ...(accentType === 'left'
      ? {
          borderLeft: `3px solid ${accentColor}`,
          paddingLeft: '1rem',
        }
      : {
          borderTop: `4px solid ${accentColor}`,
          paddingTop: '0.5rem',
        }),
  };
}

/**
 * Get style object for badge with semantic state
 */
export function getBadgeStyles(state: 'success' | 'error' | 'warning' | 'info') {
  const colors = semanticColors[state];
  return {
    display: 'inline-block',
    background: colors.light,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    padding: '0.4rem 0.8rem',
    borderRadius: '8px',
    fontSize: '8px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
  };
}

// ============================================================
// CONSISTENCY CHECKERS (For Development)
// ============================================================

/**
 * List all hardcoded colors that should be replaced with tokens
 * Use this to identify areas that need refactoring
 */
export const hardcodedColorPatterns = {
  grays: ['#888', '#666', '#444', '#555'],
  greens: ['#22c55e'],
  reds: ['#ac2424', '#ef4444'],
  oranges: ['#f59e0b', '#eab308'],
  blues: ['#3b82f6'],
};

/**
 * Example: Map a hardcoded color to its semantic token
 */
export function findTokenForColor(hexColor: string) {
  const colorMap: Record<string, string> = {
    '#22c55e': 'semanticColors.success.text',
    '#ac2424': 'semanticColors.error.text',
    '#f59e0b': 'semanticColors.warning.text',
    '#3b82f6': 'semanticColors.info.text',
    '#888': 'neutralColors.mutedDark',
    '#666': 'neutralColors.mutedDarker',
    '#a5aeb9': 'neutralColors.muted',
  };
  return colorMap[hexColor] || 'Unknown token';
}

