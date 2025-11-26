import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import { useState } from 'react';
import { toast } from 'sonner';
import idl from '../idl/escrow.json';

interface EscrowCardProps {
  escrow: any;
  onAction: () => void;
}

export function EscrowCard({ escrow, onAction }: EscrowCardProps) {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);

  const isSender = anchorWallet?.publicKey?.equals(escrow.account.sender);
  const isRecipient = anchorWallet?.publicKey?.equals(escrow.account.recipient);

  const handleAccept = async () => {
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

      const txSignature = await program.methods
        .acceptEscrow()
        .accounts({
          escrow: escrow.publicKey,
          recipient: anchorWallet.publicKey,
          sender: escrow.account.sender,
        })
        .rpc();

      toast.success(`Escrow accepted! TX: ${txSignature.slice(0, 8)}...`);
      onAction();
    } catch (error: any) {
      console.error('Error accepting escrow:', error);
      toast.error(`Error: ${error.message || 'Failed to accept'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
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

      const txSignature = await program.methods
        .cancelEscrow()
        .accounts({
          escrow: escrow.publicKey,
          sender: anchorWallet.publicKey,
        })
        .rpc();

      toast.success(`Escrow cancelled! TX: ${txSignature.slice(0, 8)}...`);
      onAction();
    } catch (error: any) {
      console.error('Error cancelling escrow:', error);
      toast.error(`Error: ${error.message || 'Failed to cancel'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">Amount</p>
            <p className="text-2xl font-bold text-gray-800">
              {(escrow.account.amount.toNumber() / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isSender ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {isSender ? 'SENT' : 'RECEIVED'}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">From</p>
          <p className="text-xs font-mono text-gray-700 break-all">
            {escrow.account.sender.toBase58()}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">To</p>
          <p className="text-xs font-mono text-gray-700 break-all">
            {escrow.account.recipient.toBase58()}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-sm text-gray-700">
            {new Date(escrow.account.createdAt.toNumber() * 1000).toLocaleString()}
          </p>
        </div>

        {isRecipient && (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-md font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Processing...' : 'Accept Escrow'}
          </button>
        )}

        {isSender && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 rounded-md font-semibold hover:bg-red-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Processing...' : 'Cancel Escrow'}
          </button>
        )}
      </div>
    </div>
  );
}