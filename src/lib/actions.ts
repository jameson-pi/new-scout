'use server';

import fs from 'fs';
import path from 'path';

export async function saveScoutReport(report: any) {
    try {
        const filePath = path.join(process.cwd(), 'public', '2025txwac.csv');

        // Calculate derived fields
        const totalAuto = (report.auto.l1 * 3) + (report.auto.l2 * 4) + (report.auto.l3 * 6) + (report.auto.l4 * 7) + (report.auto.processor * 6) + (report.auto.net * 4) + (report.auto.moved ? 3 : 0);
        const totalTele = (report.tele.l1 * 2) + (report.tele.l2 * 3) + (report.tele.l3 * 4) + (report.tele.l4 * 5) + (report.tele.processor * 6) + (report.tele.net * 4);
        const teleopBetter = totalTele > totalAuto ? 1 : 0;

        // Primary Key components: 10062-2025txwac_qm13-red2-Lekha S
        const primaryKey = `${report.team.replace('frc', '')}-${report.match}-scout-${report.scouter}`;

        // Map to exact CSV columns
        const row = [
            primaryKey,
            report.team.replace('frc', ''),
            '2025txwac',
            report.match,
            'scout', // driver_station
            'qm',
            report.match.split('_qm').pop(),
            totalAuto,
            totalTele,
            teleopBetter,
            report.auto.moved ? 'Yes' : 'No',
            report.auto.l1,
            report.auto.l2,
            report.auto.l3,
            report.auto.l4,
            0, // auto_coral_floor
            0, // auto_coral_station
            0, // auto_algae_removed
            report.auto.processor,
            report.auto.net,
            report.tele.l1,
            report.tele.l2,
            report.tele.l3,
            report.tele.l4,
            report.coral_source === 'Floor' || report.coral_source === 'Both' ? 1 : 0, // tele_coral_floor
            report.coral_source === 'Station' || report.coral_source === 'Both' ? 1 : 0, // tele_coral_station
            report.algae_removed || 0, // tele_algae_removed
            report.tele.processor,
            report.tele.net,
            report.tele.climb,
            report.climb_speed || 'N/A', // tele_climb_speed
            'No', // tele_shuttler
            0, // tele_human_barge
            0, // tele_human_barge_miss
            report.defender_rating || 3, // defender_rating
            report.mech_failure ? 'Yes' : 'No', // mech_failure
            report.scouter,
            report.notes || 'Automated Scout Submission' // other_notes
        ].join(',');

        fs.appendFileSync(filePath, '\n' + row);
        return { success: true };
    } catch (e) {
        console.error("Failed to save report:", e);
        return { success: false, error: String(e) };
    }
}
