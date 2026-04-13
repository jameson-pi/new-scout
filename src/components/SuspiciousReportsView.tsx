'use client';

import React, { useState } from 'react';
import { MatchReportAnalysis } from '@/lib/anomalyDetection';
import { semanticColors, neutralColors } from '@/lib/designTokens';

interface SuspiciousReportsViewProps {
  reports: MatchReportAnalysis[];
  showFilters?: boolean;
}

export default function SuspiciousReportsView({
  reports,
  showFilters = true
}: SuspiciousReportsViewProps) {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Filter reports
  const filteredReports = filterSeverity === 'all'
    ? reports
    : reports.filter(r => r.anomalies.severity === filterSeverity);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return semanticColors.error.text;
      case 'high': return '#f59e0b';
      case 'medium': return '#eab308';
      case 'low': return semanticColors.info.text;
      default: return neutralColors.mutedDark;
    }
  };

  const getSeverityBackground = (severity: string) => {
    switch (severity) {
      case 'critical': return semanticColors.error.light;
      case 'high': return 'rgba(245, 158, 11, 0.06)';
      case 'medium': return 'rgba(234, 179, 8, 0.06)';
      case 'low': return semanticColors.info.light;
      default: return 'transparent';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '•';
    }
  };

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: 'var(--foreground)' }}>
            Suspicious Reports Detected
          </h2>
          <p style={{ color: neutralColors.muted, marginTop: '0.5rem' }}>
            {filteredReports.length} anomalies found {filterSeverity !== 'all' && `(${filterSeverity})`}
          </p>
        </div>

        {/* Filter Buttons */}
        {showFilters && (
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(severity => (
              <button
                key={severity}
                onClick={() => setFilterSeverity(severity)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '12px',
                  border: filterSeverity === severity
                    ? `2px solid ${getSeverityColor(severity)}`
                    : '1px solid rgba(255,255,255,0.1)',
                  background: filterSeverity === severity
                    ? getSeverityBackground(severity)
                    : 'transparent',
                  color: filterSeverity === severity
                    ? getSeverityColor(severity)
                    : neutralColors.mutedDark,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                }}
              >
                {severity}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="glass" style={{
          padding: '3rem',
          borderRadius: '28px',
          textAlign: 'center',
          background: semanticColors.success.light,
          border: `1px solid ${semanticColors.success.border}`,
        }}>
          <p style={{ fontSize: '1.1rem', color: semanticColors.success.text, fontWeight: 700 }}>
            ✓ No suspicious reports found!
          </p>
          <p style={{ color: neutralColors.muted, marginTop: '0.5rem' }}>
            All scouting data looks reliable.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredReports.map((report) => (
            <div
              key={report.reportId}
              className="glass"
              style={{
                padding: '1.5rem',
                borderRadius: '24px',
                border: `2px solid ${getSeverityColor(report.anomalies.severity)}`,
                background: getSeverityBackground(report.anomalies.severity),
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
              }}
              onClick={() => setExpandedReport(
                expandedReport === report.reportId ? null : report.reportId
              )}
            >
              {/* Header Row */}
              <div className="flex justify-between items-start" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div className="flex items-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {getSeverityIcon(report.anomalies.severity)}
                    </span>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 950,
                      color: getSeverityColor(report.anomalies.severity),
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}>
                      {report.anomalies.severity} SUSPICION
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--foreground)',
                    marginBottom: '0.25rem',
                  }}>
                    {report.teamKey.replace('frc', 'Team #')} • {report.matchKey}
                  </h3>

                  <p style={{
                    fontSize: '0.9rem',
                    color: neutralColors.muted,
                  }}>
                    Scouted by <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                      {report.scoutId}
                    </span>
                  </p>
                </div>

                {/* Suspicion Score */}
                <div style={{
                  textAlign: 'right',
                  padding: '0.75rem 1rem',
                  background: getSeverityBackground(report.anomalies.severity),
                  borderRadius: '12px',
                  border: `1px solid ${getSeverityColor(report.anomalies.severity)}33`,
                }}>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 950,
                    color: getSeverityColor(report.anomalies.severity),
                  }}>
                    {report.anomalies.score}
                  </div>
                  <div style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    color: neutralColors.mutedDarker,
                    textTransform: 'uppercase',
                  }}>
                    Suspicion Score
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem',
                marginBottom: expandedReport === report.reportId ? '1rem' : 0,
                paddingBottom: expandedReport === report.reportId ? '1rem' : 0,
                borderBottom: expandedReport === report.reportId ? `1px solid ${neutralColors.border}` : 'none',
              }}>
                <div>
                  <p style={{ fontSize: '8px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase' }}>Fuel Scored</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--foreground)' }}>
                    {report.scoutedFuel}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '8px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase' }}>Climb Level</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 950, color: neutralColors.muted }}>
                    {report.scoutedClimb}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '8px', fontWeight: 950, color: neutralColors.mutedDarker, textTransform: 'uppercase' }}>EPA Variance</p>
                  <p style={{
                    fontSize: '1.25rem',
                    fontWeight: 950,
                    color: (report.anomalies.epaVariance ?? 0) > 0
                      ? '#f59e0b'
                      : semanticColors.error.text
                  }}>
                    {report.anomalies.epaVariance ?? 0 > 0 ? '+' : ''}{report.anomalies.epaVariance ?? 0}%
                  </p>
                </div>
              </div>

              {/* Detailed Flags (Expandable) */}
              {expandedReport === report.reportId && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${neutralColors.border}` }}>
                  <p style={{
                    fontSize: '9px',
                    fontWeight: 950,
                    color: neutralColors.mutedDarker,
                    textTransform: 'uppercase',
                    marginBottom: '0.75rem',
                  }}>
                    Detected Issues:
                  </p>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {report.anomalies.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '8px',
                          borderLeft: `3px solid ${getSeverityColor(report.anomalies.severity)}`,
                          fontSize: '0.9rem',
                          color: neutralColors.muted,
                        }}
                      >
                        • {flag}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

