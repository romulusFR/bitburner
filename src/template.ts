import { NS, AutocompleteData } from "@ns";

export async function main(ns: NS): Promise<void> {
  const args = ns.flags([
    ["host", ns.getHostname()],
    ["help", false],
  ]);

  if (args.help) {
    ns.tprint("This a template demo script");
    const params = Object.entries(args)
      .filter(([name]) => !["_", "help"].includes(name))
      .map(([name, value]) => `--${name} ${value}`)
      .join(" ");
    ns.tprint(`Usage: run ${ns.getScriptName()} ${params}`);
    return;
  }

  const { version } = ns.ui.getGameInfo();
  ns.tprint(`Hello Remote API (v. ${version})! Listing '${args.host}' from ${ns.getHostname()}`);
  const infos = ns.getServer(args.host as string);
  ns.tprint(`Host '${args.host}'\n ${JSON.stringify(infos, undefined, 2)}`);
}

export function autocomplete(data: AutocompleteData, _args: [string, string | number | boolean | string[]][]) {
  return [...data.servers];
}
