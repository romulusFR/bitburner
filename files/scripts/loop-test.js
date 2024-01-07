const reportChannel = 20

/** @param {NS} ns */
export async function main(ns) {
	if (!ns.args.length)
		throw new Error(`args[0] needed`)
	const target = ns.args[0];
	const waitLoop = (ns.args.length >= 2) ? ns.args[1] : 0
	const waitInit = (ns.args.length >= 3) ? ns.args[2] : 0
	const loop = (ns.args.length >= 4) ? ns.args[3] : Infinity

	ns.tail()
	ns.clearLog()
	let count = 0

	const handle = ns.getPortHandle(reportChannel);
	const message = { host: ns.getHostname(), script: ns.getScriptName(), args: ns.args, target }

	handle.write(JSON.stringify({ ...message, action: "hack", status: "start", value: String(loop) }))
	ns.atExit(() => handle.write(JSON.stringify({ ...message, action: "hack", status: "stop", value: count })))

	await ns.sleep(waitInit);
	do {
		await ns.sleep(waitLoop);
		const moneyHacked = await ns.hack(target);
		// handle.write(JSON.stringify({ ...message, action: "hack", value: moneyHacked, count }))
	} while (++count < loop)

}