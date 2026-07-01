import { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "wallet"],
  appearance: {
    theme: "light",
    accentColor: "#2563eb",
    logo: "/icon-192.png",
  },
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
  },
};
