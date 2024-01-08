import { NS, AutocompleteData, ToastVariant } from "@ns";

export async function main(ns: NS) {
  const args = ns.flags([
    ["host", ns.getHostname()],
    ["money", 0.75],
    ["security", 5],
    ["hack", true],
    ["help", false],
  ]);

  if (args.help) {
    ns.tprint("This script launch simple weak/grow/hack loop.");
    const params = Object.entries(args)
      .filter(([name]) => !["_", "help"].includes(name))
      .map(([name, value]) => `--${name} ${value}`)
      .join(" ");
    ns.tprint(`Usage: run ${ns.getScriptName()} ${params}`);
    return;
  }

  const { host: hostname, money: maxMoneyFactor, security: minSecurityDelta, hack: doHack } = args;
  const moneyThreshold = (await ns.getServerMaxMoney(hostname as string)) * (maxMoneyFactor as number);
  const securityThreshold = (await ns.getServerMinSecurityLevel(hostname as string)) + (minSecurityDelta as number);

  if (moneyThreshold === 0) {
    ns.toast(`Nothing to hack on ${hostname}`, "warning");
    return;
  }

  // Infinite loop that continously hacks/grows/weakens the target server
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if ((await ns.getServerSecurityLevel(hostname as string)) > securityThreshold) {
      // If the server's security level is above our threshold, weaken it
      await ns.weaken(hostname as string);
    } else if ((await ns.getServerMoneyAvailable(hostname as string)) < moneyThreshold) {
      // If the server's money is less than our threshold, grow it
      await ns.grow(hostname as string);
    } else {
      // Otherwise, hack it or sleep for 1 sec
      if (doHack) await ns.hack(hostname as string);
      else await ns.sleep(1000);
    }
  }
}

export function autocomplete(data, args) {
  return [...data.servers];
}
