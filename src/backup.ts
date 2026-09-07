import { REST } from '@discordjs/rest';
import { Routes, type APIAttachment, type APIChannel, type APIMessage, type RESTGetAPIChannelResult } from 'discord-api-types/v10';

interface Progress {
	channel_id: string;
	last_message_id: string;
}

const backup = async (env: Env) => {
	const start = new Date();
	console.log(`backup start ${start}`);
	const discord = new REST({
		version: '10',
	}).setToken(env.DISCORD_BOT_TOKEN);

	const progress = await getProgress(env);
	for (const prog of progress) {
		await backupChannel(discord, prog, env);
	}
	const end = new Date();
	const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
	console.log(`backup end ${end}, job time = ${duration}`);
};

const getProgress = async (env: Env) => {
	const results = await env.PROGRESS.prepare('select * from backup_state').all();
	return results['results'] as unknown as Progress[];
};

const backupChannel = async (discord: REST, prog: Progress, env: Env) => {
	const channel = (await discord.get(Routes.channel(prog.channel_id))) as APIChannel;
	console.log(`start bacup job in ${channel.name}[${channel.id}]`);

	const messages = (await discord.get(Routes.channelMessages(prog.channel_id), {
		query: new URLSearchParams({
			after: prog.last_message_id,
			limit: '1',
		}),
	})) as APIMessage[];

	for (const message of messages) {
		for (const attachment of message.attachments) {
			await backupAttachment(env, prog.channel_id, message, attachment);
		}
		await env.PROGRESS.exec(`update backup_state set last_message_id = '${message.id}' where channel_id = '${prog.channel_id}'`);
	}
};

async function backupAttachment(env: Env, channelId: string, message: APIMessage, attachment: APIAttachment) {
	// 画像だけ
	if (!attachment.content_type?.startsWith('image/')) {
		return;
	}

	const response = await fetch(attachment.url);

	if (!response.ok) {
		throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error('Attachment response has no body');
	}
	const key = `${channelId}/${message.id}/${attachment.id}-${attachment.filename}`;
	const contentType = response.headers.get('content-type') ?? attachment.content_type ?? 'application/octet-stream';
	return env.BUCKET.put(key, response.body, {
		httpMetadata: {
			contentType,
		},

		customMetadata: {
			discordChannelId: channelId,
			discordMessageId: message.id,
			discordAttachmentId: attachment.id,
			originalFilename: attachment.filename,
		},
	});
}

export { backup };
