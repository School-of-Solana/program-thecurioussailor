use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("E3vCXr3vKNbEghBfXtcSM87Qd72h5JebBE2hp1gxWy3e");

#[program]
pub mod escrow {
    use super::*;

    /// Initialize a new escrow account
    /// Sender deposits SOL into an escrow PDA for a specific recipient
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        amount: u64,
        escrow_id: u64,
    ) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);

        // Transfer SOL from sender to escrow PDA FIRST (before mutable borrow)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.sender.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
        )?;

        // NOW we can mutably borrow and set the escrow data
        let escrow = &mut ctx.accounts.escrow;
        escrow.sender = ctx.accounts.sender.key();
        escrow.recipient = ctx.accounts.recipient.key();
        escrow.amount = amount;
        escrow.escrow_id = escrow_id;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;

        msg!("Escrow created! Sender: {}, Recipient: {}, Amount: {} lamports", 
            escrow.sender, escrow.recipient, amount);

        Ok(())
    }

    /// Accept escrow - recipient claims the funds
    pub fn accept_escrow(ctx: Context<AcceptEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let amount = escrow.amount;
        
        // Manually transfer lamports from escrow PDA to recipient
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += amount;

        msg!("Escrow accepted! Recipient {} received {} lamports", 
            ctx.accounts.recipient.key(), amount);

        Ok(())
    }
    /// Cancel escrow - sender gets refund
    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let amount = escrow.amount;

        // Manually transfer lamports from escrow PDA back to sender
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.sender.to_account_info().try_borrow_mut_lamports()? += amount;

        msg!("Escrow cancelled! Sender {} refunded {} lamports", 
            ctx.accounts.sender.key(), amount);

        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
#[instruction(amount: u64, escrow_id: u64)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", sender.key().as_ref(), recipient.key().as_ref(), &escrow_id.to_le_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// CHECK: This is safe because we only use it as a reference for the PDA seed and recipient
    pub recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.sender.as_ref(), escrow.recipient.as_ref(), &escrow.escrow_id.to_le_bytes()],
        bump = escrow.bump,
        has_one = recipient @ EscrowError::UnauthorizedRecipient,
        close = sender
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(mut)]
    pub recipient: Signer<'info>,
    
    /// CHECK: This is the original sender who will receive rent refund
    #[account(mut)]
    pub sender: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.sender.as_ref(), escrow.recipient.as_ref(), &escrow.escrow_id.to_le_bytes()],
        bump = escrow.bump,
        has_one = sender @ EscrowError::UnauthorizedSender,
        close = sender
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// Data Structures

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub sender: Pubkey,       // 32 bytes
    pub recipient: Pubkey,    // 32 bytes
    pub amount: u64,          // 8 bytes
    pub escrow_id: u64,       // 8 bytes
    pub created_at: i64,      // 8 bytes
    pub bump: u8,             // 1 byte
}

// Error Codes

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    
    #[msg("Only the recipient can accept this escrow")]
    UnauthorizedRecipient,
    
    #[msg("Only the sender can cancel this escrow")]
    UnauthorizedSender,
}