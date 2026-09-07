import { REST } from '@discordjs/rest';
import { Routes, type APIMessage, type RESTGetAPIChannelResult } from 'discord-api-types/v10';

interface Progress {
	channel_id: string;
	last_message_id: string;
}

const backup = async (env: Env) => {
	const discord = new REST({
		version: '10',
	}).setToken(env.DISCORD_BOT_TOKEN);

	const progress = await getProgress(env);
	for (const prog of progress) {
		const messages = (await discord.get(Routes.channelMessages(prog.channel_id), {
			query: new URLSearchParams({
				after: prog.last_message_id,
				limit: '1',
			}),
		})) as APIMessage[];

		for (const message of messages) {
			message.attachments.forEach((attachment) => {
				console.log(attachment.filename);
			});
		}
	}
};

const getProgress = async (env: Env) => {
	const results = await env.PROGRESS.prepare('select * from backup_state').all();
	return results['results'] as unknown as Progress[];
};

const backupInChannel = (discord: REST) => {};

export { backup };
