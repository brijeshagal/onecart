// Farcaster Auth Kit Configuration
export const getFarcasterConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return {
      relay: "https://relay.farcaster.xyz",
      domain: "localhost:3000",
      siweUri: "http://localhost:3000/register",
      rpcUrl: "https://mainnet.optimism.io",
    };
  }
  
  // Production configuration
  return {
    relay: "https://relay.farcaster.xyz",
    domain: "onecart-phi.vercel.app",
    siweUri: "https://onecart-phi.vercel.app/register",
    rpcUrl: "https://mainnet.optimism.io",
  };
};
