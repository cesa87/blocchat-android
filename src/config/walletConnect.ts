import '@walletconnect/react-native-compat';
import {createAppKit} from '@reown/appkit-react-native';
import {EthersAdapter} from '@reown/appkit-ethers-react-native';
import {mainnet, base} from 'viem/chains';
import {storage} from './StorageUtil';

// WalletConnect Project ID — same as web app
const projectId = 'eb5557f89dc809302437294c1e269ec9';

const ethersAdapter = new EthersAdapter();

export const appKit = createAppKit({
  projectId,
  adapters: [ethersAdapter],
  networks: [base, mainnet],
  defaultNetwork: base,
  storage,
  metadata: {
    name: 'BlocChat',
    description: 'Web3 Messaging & Commerce Platform',
    url: 'https://app.blocchat.xyz',
    icons: ['https://app.blocchat.xyz/vite.svg'],
    redirect: {
      native: 'blocchat://',
      universal: 'https://app.blocchat.xyz',
    },
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
});

export {ethersAdapter};
