import { CRON_SECRET } from '$env/static/private';
import connectDB from '$lib/db/connection';
import EventModel from '$lib/db/models/events.model';
import GroupModel from '$lib/db/models/groups.model';
import { eventParser } from '$lib/utils/event-parser';
import { googleCalAPICall } from '$lib/utils/google-cal-api-cal';
import { geocode } from '$lib/utils/geocode';
import type { Group } from '$lib/types/group.d.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${CRON_SECRET}`) {
		return new Response('You Shall Not Pass!', { status: 401 });
	}

	await connectDB();

	// Fetch groups and their calendar IDs
	const groups = await GroupModel.find({}, 'group calID _id').lean();

	const fetchedEventsPromises = groups.map(async (group) => {
		const events = await googleCalAPICall(group as unknown as Group);
		return Promise.all(events.map((event) => geocode(event)));
	});

	try {
		const fetchedAndGeocodedEvents = (await Promise.all(fetchedEventsPromises)).flat();
		const parsedEvents = fetchedAndGeocodedEvents.map(eventParser);

		await EventModel.collection.drop();
		// Insert the new events
		await EventModel.insertMany(parsedEvents);

		return new Response(JSON.stringify({ message: 'Events updated successfully' }), {
			status: 200
		});
	} catch (error) {
		console.error('Failed to update events:', error);
		return new Response(JSON.stringify({ error: 'Failed to update events' }), { status: 500 });
	}
};
