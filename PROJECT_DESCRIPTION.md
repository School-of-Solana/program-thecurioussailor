# Project Description

**Deployed Frontend URL:** https://frontend-wheat-omega-64.vercel.app/

**Solana Program ID:** E3vCXr3vKNbEghBfXtcSM87Qd72h5JebBE2hp1gxWy3e

## Project Overview

### Description
A decentralized escrow application built on Solana that enables secure peer-to-peer SOL transfers. Users can lock SOL in an escrow for a specific recipient, who can then accept the funds. If the recipient doesn't accept, the sender can cancel and get a refund. The program uses PDAs to securely hold funds without requiring trust between parties.

### Key Features

- **Create Escrow**: Lock SOL in a secure escrow account for a specific recipient
- **Accept Escrow**: Recipients can claim their funds from escrow
- **Cancel Escrow**: Senders can cancel and get refunded before acceptance
- **View Escrows**: See all escrows you've sent or received with status badges
- **Trustless Transactions**: No middleman needed - the blockchain enforces the rules

### How to Use the dApp

1. **Connect Wallet** - Click "Select Wallet" and connect your Phantom wallet (set to Devnet)
2. **Create Escrow**: 
   - Enter the recipient's Solana wallet address
   - Enter the amount of SOL to lock
   - Click "Create Escrow" and approve the transaction in Phantom
3. **Accept Escrow** (as recipient):
   - Connect with the recipient wallet
   - Find the escrow in "Your Escrows" (shows "RECEIVED" badge)
   - Click "Accept Escrow" to claim the funds
4. **Cancel Escrow** (as sender):
   - Find your sent escrow in "Your Escrows" (shows "SENT" badge)
   - Click "Cancel Escrow" to get your SOL back

## Program Architecture

The Escrow dApp uses a simple architecture with one main account type (Escrow PDA) and three instructions. When a user creates an escrow, SOL is transferred to a Program Derived Address that only the program can control. The recipient can accept (transferring SOL to themselves) or the sender can cancel (getting their SOL back).

### PDA Usage

The program uses Program Derived Addresses to create deterministic escrow accounts for each transaction.

**PDAs Used:**
- **Escrow PDA**: Derived from seeds `["escrow", sender_pubkey, recipient_pubkey, escrow_id]`. This ensures each escrow has a unique, deterministic address. The escrow_id (timestamp) allows multiple escrows between the same sender and recipient.

### Program Instructions

**Instructions Implemented:**
- **initialize_escrow**: Creates a new escrow account, transfers SOL from sender to the escrow PDA. Validates amount > 0.
- **accept_escrow**: Transfers SOL from escrow PDA to recipient, closes the account. Only callable by the designated recipient (enforced by `has_one` constraint).
- **cancel_escrow**: Refunds SOL from escrow PDA to sender, closes the account. Only callable by the original sender (enforced by `has_one` constraint).

### Account Structure

```rust
#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub sender: Pubkey,       // The wallet that created the escrow (32 bytes)
    pub recipient: Pubkey,    // The designated recipient (32 bytes)
    pub amount: u64,          // Amount of lamports in escrow (8 bytes)
    pub escrow_id: u64,       // Unique identifier for this escrow (8 bytes)
    pub created_at: i64,      // Unix timestamp of creation (8 bytes)
    pub bump: u8,             // PDA bump seed (1 byte)
}
```

## Testing

### Test Coverage
Comprehensive test suite covering all instructions with both successful operations and error conditions to ensure program security and reliability.

**Happy Path Tests:**
- **Initialize Escrow**: Successfully creates escrow with correct values and transfers SOL from sender to PDA
- **Accept Escrow**: Recipient successfully claims funds, escrow account closes, rent returned to sender
- **Cancel Escrow**: Sender successfully gets refund, escrow account closes

**Unhappy Path Tests:**
- **Zero Amount**: Rejects escrow creation with 0 SOL (InvalidAmount error)
- **Unauthorized Accept**: Non-recipient cannot accept escrow (UnauthorizedRecipient error)
- **Unauthorized Cancel**: Non-sender cannot cancel escrow (UnauthorizedSender error)
- **Duplicate Escrow**: Cannot create escrow with same PDA seeds (account already in use)
- **Non-existent Escrow**: Operations fail on non-existent accounts (AccountNotInitialized error)

### Running Tests
```bash
cd anchor_project/escrow
yarn install
anchor test
```

### Additional Notes for Evaluators

This escrow dApp demonstrates key Solana development concepts:
- **PDA usage** for secure fund custody without private keys
- **Proper authorization** using `has_one` constraints
- **Manual lamport manipulation** for transfers from data-bearing accounts (cannot use system_program::transfer from accounts with data)
- **Account closure** with automatic rent return to sender via `close` constraint
- **Custom error codes** for meaningful error messages

The frontend is built with:
- React 19 + TypeScript + Vite
- Tailwind CSS for styling
- @solana/wallet-adapter-react for wallet connection
- @coral-xyz/anchor for program interaction
- Sonner for toast notifications

The program uses wallet-standard auto-detection (empty wallets array) for better compatibility with React 19 and modern wallet adapters.
