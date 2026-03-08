import { getEventTeamList, getUniqueScouters } from '@/lib/data';
import { getEventTeams } from '@/lib/tba';
import PitScoutForm from '@/app/pit-scout/PitScoutForm';

export default async function PitScoutPage({ searchParams }: { searchParams: Promise<{ event?: string; team?: string }> }) {
    const { event, team } = await searchParams;
    const eventKey = event || '2026txcle';

    const [tbaTeams, scouters] = await Promise.all([
        getEventTeams(eventKey),
        getUniqueScouters(eventKey),
    ]);

    const roster = await getEventTeamList(eventKey, tbaTeams);

    return (
        <PitScoutForm
            eventKey={eventKey}
            roster={roster}
            initialScouters={scouters}
            preselectedTeam={team}
        />
    );
}

