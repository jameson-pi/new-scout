import { getMissionData } from '@/lib/data';
import { getStatboticsTeamEvent } from '@/lib/statbotics';
import { getAllSuspiciousReports } from '@/lib/anomalyDetection';
import SuspiciousReportsView from '@/components/SuspiciousReportsView';
import Link from 'next/link';

export default async function AnomalyDetectionPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;

  // Load data
  const { reports, tbaMatches } = await getMissionData(eventKey);

  // Get EPA for all teams
  const teamKeys = [...new Set(reports.map(r => r.teamKey))];
  const epaMap: Record<string, number> = {};

  for (const teamKey of teamKeys) {
    try {
      const teamNum = parseInt(teamKey.replace('frc', ''));
      const sbData = await getStatboticsTeamEvent(teamNum, eventKey);
      epaMap[teamKey] = sbData?.epa?.norm || 50;
    } catch {
      epaMap[teamKey] = 50; // Default if Statbotics fails
    }
  }

  // Detect anomalies
  const suspiciousReports = getAllSuspiciousReports(
    reports,
    epaMap,
    tbaMatches,
    20 // Show reports with suspicion score >= 20
  );

  return (
    <main className="page-shell responsive-padding">
      <div className="page-content" style={{ maxWidth: '1200px', gap: '4rem' }}>

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end reveal" style={{ gap: '2rem' }}>
          <div className="page-header">
            <Link href={`/event/${eventKey}`} className="page-back-link">
              ← Back to event dashboard
            </Link>
            <h1 className="text-gradient page-title">
              Anomaly<span className="text-primary">Detection</span>
            </h1>
            <p className="page-subtitle">Identify suspicious scouting reports with AI-powered analysis</p>
          </div>
        </header>

        {/* Statistics */}
        <section className="reveal delay-1">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="glass" style={{
              padding: '1.75rem',
              borderRadius: '28px',
              background: 'rgba(172, 36, 36, 0.06)',
              border: '1px solid rgba(172, 36, 36, 0.2)',
            }}>
              <p style={{ fontSize: '9px', fontWeight: 950, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Critical</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--foreground)' }}>
                {suspiciousReports.filter(r => r.anomalies.severity === 'critical').length}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#a5aeb9', marginTop: '0.25rem' }}>
                Reports requiring immediate review
              </p>
            </div>

            <div className="glass" style={{
              padding: '1.75rem',
              borderRadius: '28px',
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}>
              <p style={{ fontSize: '9px', fontWeight: 950, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>High</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--foreground)' }}>
                {suspiciousReports.filter(r => r.anomalies.severity === 'high').length}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#a5aeb9', marginTop: '0.25rem' }}>
                Likely anomalies detected
              </p>
            </div>

            <div className="glass" style={{
              padding: '1.75rem',
              borderRadius: '28px',
              background: 'rgba(46, 81, 116, 0.06)',
              border: '1px solid rgba(46, 81, 116, 0.2)',
            }}>
              <p style={{ fontSize: '9px', fontWeight: 950, color: 'var(--secondary-blue)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Scanned</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--foreground)' }}>
                {reports.length}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#a5aeb9', marginTop: '0.25rem' }}>
                Scouting reports analyzed
              </p>
            </div>
          </div>
        </section>

        {/* Main View */}
        <section className="reveal delay-2">
          <SuspiciousReportsView reports={suspiciousReports} showFilters={true} />
        </section>

        {/* Information Card */}
        <section className="reveal delay-3" style={{
          background: 'rgba(46, 81, 116, 0.06)',
          border: '1px solid rgba(46, 81, 116, 0.2)',
          borderRadius: '28px',
          padding: '2rem',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 950, color: 'var(--foreground)', marginBottom: '1rem' }}>
            How Anomaly Detection Works
          </h3>
          <div style={{ display: 'grid', gap: '1rem', color: 'var(--muted)' }}>
            <p>
              <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>EPA Comparison:</span> Reports are flagged if fuel scores deviate significantly from team EPA (±80% threshold).
            </p>
            <p>
              <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Statistical Analysis:</span> Z-score outlier detection identifies reports outside normal team performance distribution.
            </p>
            <p>
              <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Consistency Checks:</span> Flags mechanical failures with high fuel scores, or climb levels mismatched with fuel performance.
            </p>
            <p>
              <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Scouter Bias Detection:</span> Identifies potential inflated or deflated reporting patterns by individual scouts.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}

