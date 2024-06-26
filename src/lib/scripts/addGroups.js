import groups from './data/groups.json' assert { type: 'json' };
import GroupModel from '$lib/db/models/groups.model';

export const loadGroups = async () => {
	const res = await GroupModel.bulkSave(groups.map((e) => new GroupModel(e)));
	console.log(res);
};
