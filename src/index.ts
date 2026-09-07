import { backup } from './backup';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		ctx.waitUntil(backup(env));

		return new Response('Accepted', {
			status: 202,
		});
	},
} satisfies ExportedHandler<Env>;
