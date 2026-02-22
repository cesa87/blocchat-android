import {ethers} from 'ethers';

/**
 * Converts an ethers Signer to an XMTP React Native SDK Signer.
 * The RN SDK signer shape differs slightly from the browser SDK.
 */
export function createXMTPSigner(ethersSigner: ethers.Signer) {
  return {
    getIdentifier: async () => {
      const address = await ethersSigner.getAddress();
      return {
        identifier: address,
        identifierKind: 'ETHEREUM' as const,
      };
    },
    signMessage: async (message: string) => {
      const signature = await ethersSigner.signMessage(message);
      return {signature: ethers.getBytes(signature)};
    },
  };
}
