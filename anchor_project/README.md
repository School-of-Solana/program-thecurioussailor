# Escrow Anchor Program

A decentralized escrow smart contract built on Solana using the Anchor framework.

## Program ID

`E3vCXr3vKNbEghBfXtcSM87Qd72h5JebBE2hp1gxWy3e` (Devnet)

## Features

- **Create Escrow**: Lock SOL for a specific recipient
- **Accept Escrow**: Recipient claims the funds
- **Cancel Escrow**: Sender gets refund before acceptance

## Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_escrow` | Creates escrow PDA and deposits SOL |
| `accept_escrow` | Transfers SOL to recipient, closes account |
| `cancel_escrow` | Refunds SOL to sender, closes account |

## Running Tests

```bash
cd escrow
yarn install
anchor test
```

## Deployment

```bash
solana config set --url devnet
anchor build
anchor deploy
```
