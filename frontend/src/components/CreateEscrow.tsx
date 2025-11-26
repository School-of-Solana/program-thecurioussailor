import { useState } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, BN, setProvider } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import { PROGRAM_ID } from '../utils/constants';
import idl from '../idl/escrow.json';

export function CreateEscrow({ onEscrowCreated }: { onEscrowCreated: () => void }) {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const createEscrow = async () => {
    console.log('Wallet status:', {
      anchorWallet: !!anchorWallet,
      publicKey: anchorWallet?.publicKey?.toString(),
    });

    if (!anchorWallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!recipient || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      
      // Validate recipient address
      const recipientPubkey = new PublicKey(recipient);
      
      // Setup provider and set as default
      const provider = new AnchorProvider(
        connection,
        anchorWallet,
        { commitment: 'confirmed', preflightCommitment: 'confirmed' }
      );
      setProvider(provider);
      
      const program = new Program(idl as any, provider);

      // Generate unique escrow ID
      const escrowId = Date.now();
      const amountLamports = parseFloat(amount) * LAMPORTS_PER_SOL;

      // Derive PDA
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          anchorWallet.publicKey.toBuffer(),
          recipientPubkey.toBuffer(),
          Buffer.from(new Uint8Array(new BigInt64Array([BigInt(escrowId)]).buffer)),
        ],
        PROGRAM_ID
      );

      console.log('Sending transaction to escrow:', escrowPDA.toString());

      // Use Anchor's rpc() method directly
      const txSignature = await program.methods
        .initializeEscrow(
          new BN(amountLamports),
          new BN(escrowId)
        )
        .accounts({
          escrow: escrowPDA,
          sender: anchorWallet.publicKey,
          recipient: recipientPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(`Escrow created! TX: ${txSignature.slice(0, 8)}...`);
      setRecipient('');
      setAmount('');
      onEscrowCreated();
    } catch (error: any) {
      console.error('Error creating escrow:', error);
      toast.error(`Error: ${error.message || 'Failed to create escrow'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Create New Escrow</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter recipient's public key"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (SOL)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={createEscrow}
          disabled={loading || !anchorWallet}
          className="w-full bg-purple-600 text-white py-3 rounded-md font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Creating...' : 'Create Escrow'}
        </button>
      </div>
    </div>
  );
}