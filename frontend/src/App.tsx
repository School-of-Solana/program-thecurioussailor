import { useMemo, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Toaster } from 'sonner';
import { WalletButton } from './components/WalletButton';
import { CreateEscrow } from './components/CreateEscrow';
import { EscrowList } from './components/EscrowList';
import { RPC_ENDPOINT } from './utils/constants';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const endpoint = RPC_ENDPOINT;

  // Empty array lets wallet-standard auto-detect wallets (modern approach)
  const wallets = useMemo(() => [], []);

  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
            <Toaster position="top-right" richColors />
            
            <div className="container mx-auto px-4 py-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  🔒 Solana Escrow
                </h1>
                <WalletButton />
              </div>

              {/* Main Content */}
              <div className="max-w-2xl mx-auto mb-12">
                <CreateEscrow onEscrowCreated={() => setRefreshKey(k => k + 1)} />
              </div>

              {/* Escrows List */}
              <div key={refreshKey}>
                <EscrowList />
              </div>
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;