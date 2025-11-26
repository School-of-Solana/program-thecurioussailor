import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  return (
    <div className="flex justify-end p-4">
      <WalletMultiButton />
    </div>
  );
}