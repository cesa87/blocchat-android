import {ethers} from 'ethers';
import {PublicIdentity} from '@xmtp/react-native-sdk';

/**
 * Converts an ethers Signer to an XMTP React Native SDK Signer.
 */
export function createXMTPSigner(ethersSigner: ethers.Signer) {
  return {
    getIdentifier: async () => {
      const address = await ethersSigner.getAddress();
      return new PublicIdentity(address, 'ETHEREUM');
    },
    signMessage: async (message: string) => {
      const signature = await ethersSigner.signMessage(message);
      return {signature: ethers.getBytes(signature)};
    },
    getChainId: () => undefined,
    getBlockNumber: () => undefined,
    signerType: () => undefined,
  };
}
