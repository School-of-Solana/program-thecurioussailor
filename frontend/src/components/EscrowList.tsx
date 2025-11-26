import { useEffect, useState } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import { EscrowCard } from './EscrowCard';
import idl from '../idl/escrow.json';

export function EscrowList() {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEscrows = async () => {
    if (!anchorWallet) return;

    try {
      setLoading(true);
      const provider = new AnchorProvider(
        connection,
        anchorWallet,
        { commitment: 'confirmed', preflightCommitment: 'confirmed' }
      );
      setProvider(provider);
      const program = new Program(idl as any, provider);

      // Fetch all escrow accounts
      const allEscrows = await (program.account as any).escrow.all();
      
      // Filter escrows where user is sender or recipient
      const userEscrows = allEscrows.filter(
        (escrow: any) =>
          escrow.account.sender.equals(anchorWallet.publicKey) ||
          escrow.account.recipient.equals(anchorWallet.publicKey)
      );

      setEscrows(userEscrows);
    } catch (error) {
      console.error('Error fetching escrows:', error);
      setEscrows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrows();
  }, [anchorWallet?.publicKey, connection]);

  if (!anchorWallet) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-xl">Connect your wallet to view escrows</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-xl">Loading escrows...</p>
      </div>
    );
  }

  if (escrows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white text-xl">No escrows found</p>
        <p className="text-white/70 mt-2">Create your first escrow above!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">Your Escrows</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {escrows.map((escrow) => (
          <EscrowCard
            key={escrow.publicKey.toString()}
            escrow={escrow}
            onAction={fetchEscrows}
          />
        ))}
      </div>
    </div>
  );
}