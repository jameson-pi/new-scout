/**
 * Anomaly Detection for Scouting Reports
 *
 * Identifies suspicious reports by comparing scout data against:
 * - EPA (Expected Performance Average)
 * - TBA match data
 * - Team statistical baselines
 * - Outlier detection (Z-score analysis)
 */

import { ScoutReport } from './types/scouting';

export interface AnomalyFlags {
  score: number; // 0-100, higher = more suspicious
  flags: string[]; // List of detected issues
  severity: 'low' | 'medium' | 'high' | 'critical';
  epaVariance?: number; // Percentage above/below EPA
  tbaVariance?: number; // Percentage above/below TBA
}

export interface MatchReportAnalysis {
  reportId: string;
  scoutId: string;
  teamKey: string;
  matchKey: string;
  scoutedFuel: number;
  scoutedClimb: string;
  anomalies: AnomalyFlags;
}

// ============================================================
// CORE DETECTION FUNCTIONS
// ============================================================

/**
 * Detect if a scouting report is statistically suspicious
 */
export function analyzeReport(
  report: ScoutReport,
  teamEPA: number,
  tbaMatchData: Record<string, unknown>,
  teamStats: {
    avgFuel: number;
    stdDevFuel: number;
    avgClimb: number;
    maxFuel: number;
    minFuel: number;
  }
): AnomalyFlags {
  const flags: string[] = [];
  let suspicionScore = 0;

  // Extract scouted values
  const scoutedFuel = (report.data.auto.fuel_scored || 0) + (report.data.teleop.fuel_scored || 0);
  const scoutedClimbLevel = report.data.teleop.climb_level;

  // ============================================================
  // CHECK 1: EPA Variance (Most Important)
  // ============================================================
  const epaVariance = ((scoutedFuel - teamEPA) / teamEPA) * 100;

  if (scoutedFuel > teamEPA * 1.8) {
    flags.push(`Fuel scored ${((scoutedFuel / teamEPA) * 100).toFixed(0)}% of EPA (unusually high)`);
    suspicionScore += 25; // High suspicion
  } else if (scoutedFuel < teamEPA * 0.2) {
    flags.push(`Fuel scored only ${((scoutedFuel / teamEPA) * 100).toFixed(0)}% of EPA (unusually low)`);
    suspicionScore += 15; // Medium suspicion
  }

  // ============================================================
  // CHECK 2: Z-Score Outlier Detection
  // ============================================================
  if (teamStats.stdDevFuel > 0) {
    const zScore = Math.abs((scoutedFuel - teamStats.avgFuel) / teamStats.stdDevFuel);

    if (zScore > 3) {
      flags.push(`Outlier detected: ${zScore.toFixed(1)} standard deviations from team average`);
      suspicionScore += 30; // Critical
    } else if (zScore > 2.5) {
      flags.push(`Extreme value: ${zScore.toFixed(1)} std devs from average`);
      suspicionScore += 20;
    }
  }

  // ============================================================
  // CHECK 3: Impossible Values
  // ============================================================
  if (scoutedFuel > teamStats.maxFuel * 1.5 && teamStats.maxFuel > 0) {
    flags.push(`Exceeds team's max recorded fuel by 50%`);
    suspicionScore += 35; // Very suspicious
  }

  if (scoutedFuel < 0) {
    flags.push(`Negative fuel score recorded`);
    suspicionScore += 40; // Critical error
  }

  // ============================================================
  // CHECK 4: Mechanical Failure Inconsistency
  // ============================================================
  if (report.data.mech_failure && scoutedFuel > teamEPA * 0.7) {
    flags.push(`Mechanical failure reported but fuel scored at ${((scoutedFuel / teamEPA) * 100).toFixed(0)}% of EPA`);
    suspicionScore += 20; // Inconsistent
  }

  // ============================================================
  // CHECK 5: Climb Level vs Fuel Consistency
  // ============================================================
  const highClimb = scoutedClimbLevel === 'Level3' || scoutedClimbLevel === 'Level2';
  const lowFuel = scoutedFuel < teamStats.avgFuel * 0.3;

  if (highClimb && lowFuel && teamStats.avgFuel > 0) {
    flags.push(`High climb reported with unusually low fuel score`);
    suspicionScore += 12; // Mildly suspicious
  }

  // ============================================================
  // CHECK 6: Perfect or Zero Values
  // ============================================================
  if (scoutedFuel === 0 && !report.data.mech_failure) {
    flags.push(`Zero fuel reported with no mechanical failure noted`);
    suspicionScore += 8; // Slightly suspicious
  }

  if (scoutedFuel === teamStats.maxFuel && scoutedFuel > 0) {
    flags.push(`Fuel score matches team's max recorded value exactly`);
    suspicionScore += 5; // Minor flag
  }

  // ============================================================
  // CHECK 7: Scouter Bias Detection
  // ============================================================
  if (scoutedFuel > teamEPA * 2.5) {
    flags.push(`Potential scouter inflation bias: reporting extreme highs`);
    suspicionScore += 15;
  }

  // ============================================================
  // Determine Severity
  // ============================================================
  let severity: 'low' | 'medium' | 'high' | 'critical';
  if (suspicionScore >= 60) severity = 'critical';
  else if (suspicionScore >= 45) severity = 'high';
  else if (suspicionScore >= 25) severity = 'medium';
  else severity = 'low';

  // Cap score at 100
  suspicionScore = Math.min(100, suspicionScore);

  return {
    score: suspicionScore,
    flags,
    severity,
    epaVariance: Math.round(epaVariance),
    tbaVariance: 0 // Can be calculated if TBA match data is available
  };
}

// ============================================================
// BATCH ANALYSIS
// ============================================================

/**
 * Analyze all reports for a team and flag suspicious ones
 */
export function flagSuspiciousReports(
  reports: ScoutReport[],
  teamKey: string,
  teamEPA: number,
  tbaMatches: Record<string, unknown>
): MatchReportAnalysis[] {
  // Calculate team statistics from reports
  const teamReports = reports.filter(r => r.teamKey === teamKey);

  if (teamReports.length === 0) {
    return [];
  }

  const fuelScores = teamReports.map(r =>
    (r.data.auto.fuel_scored || 0) + (r.data.teleop.fuel_scored || 0)
  );

  const avgFuel = fuelScores.reduce((a, b) => a + b, 0) / fuelScores.length;
  const stdDevFuel = Math.sqrt(
    fuelScores.reduce((sq, n) => sq + Math.pow(n - avgFuel, 2), 0) / fuelScores.length
  );

  const teamStats = {
    avgFuel,
    stdDevFuel,
    avgClimb: 0,
    maxFuel: Math.max(...fuelScores, teamEPA * 1.2),
    minFuel: Math.min(...fuelScores, 0),
  };

  // Analyze each report
  return teamReports.map((report, idx) => {
    const anomalies = analyzeReport(report, teamEPA, tbaMatches, teamStats);

    return {
      reportId: `${teamKey}_${report.matchKey}_${idx}`,
      scoutId: report.scoutId,
      teamKey,
      matchKey: report.matchKey,
      scoutedFuel: (report.data.auto.fuel_scored || 0) + (report.data.teleop.fuel_scored || 0),
      scoutedClimb: report.data.teleop.climb_level,
      anomalies,
    };
  });
}

/**
 * Get all suspicious reports across an event
 */
export function getAllSuspiciousReports(
  reports: ScoutReport[],
  teamEPAMap: Record<string, number>,
  tbaMatches: Record<string, unknown>,
  minSuspicionScore: number = 30
): MatchReportAnalysis[] {
  const allAnalysis: MatchReportAnalysis[] = [];

  // Group reports by team
  const teamKeys = [...new Set(reports.map(r => r.teamKey))];

  for (const teamKey of teamKeys) {
    const epa = teamEPAMap[teamKey] || 50; // Default EPA if not found
    const analysis = flagSuspiciousReports(reports, teamKey, epa, tbaMatches);

    // Filter to only suspicious ones
    const suspicious = analysis.filter(a => a.anomalies.score >= minSuspicionScore);
    allAnalysis.push(...suspicious);
  }

  // Sort by suspicion score (highest first)
  return allAnalysis.sort((a, b) => b.anomalies.score - a.anomalies.score);
}

// ============================================================
// HELPER: Get Suspicion Summary
// ============================================================

export function getSuspicionSummary(anomalies: AnomalyFlags): string {
  if (anomalies.severity === 'critical') {
    return `🚨 CRITICAL: ${anomalies.flags[0] || 'Very suspicious data'}`;
  }
  if (anomalies.severity === 'high') {
    return `⚠️ HIGH: ${anomalies.flags[0] || 'Likely anomaly'}`;
  }
  if (anomalies.severity === 'medium') {
    return `⚡ MEDIUM: ${anomalies.flags[0] || 'Possible anomaly'}`;
  }
  return `ℹ️ LOW: ${anomalies.flags[0] || 'Minor variation'}`;
}

