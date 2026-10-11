import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { defineChain, getAddress, type Address } from "viem";
import { getAccount, watchAccount } from "wagmi/actions";
import { NETWORK } from "./chain";

export const REOWN_PROJECT_ID =
  (import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined)?.trim() ||
  (import.meta.env.VITE_PROJECT_ID as string | undefined)?.trim() ||
  "5f50ddf3aa17cc1fb435598a4eada801";

const arc = defineChain({
  id: NETWORK.chainId,
  name: NETWORK.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [NETWORK.rpc] },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: NETWORK.explorer },
  },
});

const metadata = {
  name: "Beacon",
  description: "USDC firewall for AI agents on Arc. The agent signs. The executor cannot change the payment.",
  url: typeof window !== "undefined" ? window.location.origin : "https://beacon-arc-one.vercel.app",
  icons: ["https://beacon-arc-one.vercel.app/favicon.png"],
};

export const networks = [arc] as unknown as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  projectId: REOWN_PROJECT_ID,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: arc as unknown as AppKitNetwork,
  projectId: REOWN_PROJECT_ID,
  metadata,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#39e08a",
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

export function waitForWagmiAddress(timeoutMs = 120_000): Promise<Address> {
  const config = wagmiConfig;
  const current = getAccount(config);
  if (current.address) return Promise.resolve(getAddress(current.address));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unwatch();
      reject(new Error("Wallet connection cancelled or timed out."));
    }, timeoutMs);

    const unwatch = watchAccount(config, {
      onChange(account) {
        if (account.address) {
          clearTimeout(timer);
          unwatch();
          resolve(getAddress(account.address));
        }
      },
    });
  });
}
