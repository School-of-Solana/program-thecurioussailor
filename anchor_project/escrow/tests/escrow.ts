import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("escrow", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;

  // Test accounts
  let sender: anchor.web3.Keypair;
  let recipient: anchor.web3.Keypair;
  let escrowPDA: PublicKey;
  let escrowBump: number;
  const escrowId = new anchor.BN(1);
  const escrowAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

  beforeEach(async () => {
    // Create fresh keypairs for each test
    sender = anchor.web3.Keypair.generate();
    recipient = anchor.web3.Keypair.generate();

    // Airdrop SOL to sender
    const airdropSig = await provider.connection.requestAirdrop(
      sender.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Derive PDA
    [escrowPDA, escrowBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        sender.publicKey.toBuffer(),
        recipient.publicKey.toBuffer(),
        escrowId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
  });

  describe("Happy Paths", () => {
    it("Initializes escrow successfully", async () => {
      const senderBalanceBefore = await provider.connection.getBalance(
        sender.publicKey
      );

      await program.methods
        .initializeEscrow(escrowAmount, escrowId)
        .accounts({
          escrow: escrowPDA,
          sender: sender.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      // Verify escrow account data
      const escrowAccount = await program.account.escrow.fetch(escrowPDA);
      assert.ok(escrowAccount.sender.equals(sender.publicKey));
      assert.ok(escrowAccount.recipient.equals(recipient.publicKey));
      assert.ok(escrowAccount.amount.eq(escrowAmount));
      assert.ok(escrowAccount.escrowId.eq(escrowId));
      assert.ok(escrowAccount.createdAt.toNumber() > 0);
      assert.equal(escrowAccount.bump, escrowBump);

      // Verify sender balance decreased
      const senderBalanceAfter = await provider.connection.getBalance(
        sender.publicKey
      );
      assert.ok(senderBalanceBefore > senderBalanceAfter);

      // Verify escrow PDA has the funds
      const escrowBalance = await provider.connection.getBalance(escrowPDA);
      assert.ok(escrowBalance >= escrowAmount.toNumber());

      console.log("✅ Escrow initialized successfully");
    });

    it("Recipient accepts escrow and receives funds", async () => {
      // Initialize escrow first
      await program.methods
        .initializeEscrow(escrowAmount, escrowId)
        .accounts({
          escrow: escrowPDA,
          sender: sender.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      const recipientBalanceBefore = await provider.connection.getBalance(
        recipient.publicKey
      );

      // Accept escrow
      await program.methods
        .acceptEscrow()
        .accounts({
          escrow: escrowPDA,
          recipient: recipient.publicKey,
          sender: sender.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([recipient])
        .rpc();

      // Verify recipient received funds
      const recipientBalanceAfter = await provider.connection.getBalance(
        recipient.publicKey
      );
      assert.ok(recipientBalanceAfter > recipientBalanceBefore);
      assert.ok(
        recipientBalanceAfter - recipientBalanceBefore >= escrowAmount.toNumber()
      );

      // Verify escrow account is closed
      const escrowAccountInfo = await provider.connection.getAccountInfo(
        escrowPDA
      );
      assert.isNull(escrowAccountInfo);

      console.log("✅ Escrow accepted successfully");
    });

    it("Sender cancels escrow and receives refund", async () => {
      // Initialize escrow first
      await program.methods
        .initializeEscrow(escrowAmount, escrowId)
        .accounts({
          escrow: escrowPDA,
          sender: sender.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      const senderBalanceBefore = await provider.connection.getBalance(
        sender.publicKey
      );

      // Cancel escrow
      await program.methods
        .cancelEscrow()
        .accounts({
          escrow: escrowPDA,
          sender: sender.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      // Verify sender received refund
      const senderBalanceAfter = await provider.connection.getBalance(
        sender.publicKey
      );
      assert.ok(senderBalanceAfter > senderBalanceBefore);

      // Verify escrow account is closed
      const escrowAccountInfo = await provider.connection.getAccountInfo(
        escrowPDA
      );
      assert.isNull(escrowAccountInfo);

      console.log("✅ Escrow cancelled successfully");
    });
  });

  describe("Unhappy Paths", () => {
    it("Fails to initialize escrow with zero amount", async () => {
      try {
        await program.methods
          .initializeEscrow(new anchor.BN(0), escrowId)
          .accounts({
            escrow: escrowPDA,
            sender: sender.publicKey,
            recipient: recipient.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([sender])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "InvalidAmount");
        console.log("✅ Correctly rejected zero amount");
      }
    });

    it("Fails when non-recipient tries to accept escrow", async () => {
      // Initialize escrow first
      await program.methods
        .initializeEscrow(escrowAmount, escrowId)
        .accounts({
          escrow: escrowPDA,
          sender: sender.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      // Try to accept with wrong account (sender instead of recipient)
      const wrongAccount = anchor.web3.Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        wrongAccount.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      try {
        await program.methods
          .acceptEscrow()
          .accounts({
            escrow: escrowPDA,
            recipient: wrongAccount.publicKey,
            sender: sender.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([wrongAccount])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedRecipient");
        console.log("✅ Correctly rejected unauthorized recipient");
      }
    });

    it("Fails when non-sender tries to cancel escrow", async () => {
      // Initialize escrow first
      await program.methods
        .initializeEscrow(escrowAmount, escrowId)
        .accounts({
          escrow: escrowPDA,
          sender: sender.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      // Try to cancel with wrong account
      const wrongAccount = anchor.web3.Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        wrongAccount.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      try {
        await program.methods
          .cancelEscrow()
          .accounts({
            escrow: escrowPDA,
            sender: wrongAccount.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([wrongAccount])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedSender");
        console.log("✅ Correctly rejected unauthorized sender");
      }
    });

    it("Fails to initialize duplicate escrow", async () => {
      // Initialize escrow first
      await program.methods
        .initializeEscrow(escrowAmount, escrowId)
        .accounts({
          escrow: escrowPDA,
          sender: sender.publicKey,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      // Try to initialize again with same parameters
      try {
        await program.methods
          .initializeEscrow(escrowAmount, escrowId)
          .accounts({
            escrow: escrowPDA,
            sender: sender.publicKey,
            recipient: recipient.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([sender])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.toString().includes("already in use"));
        console.log("✅ Correctly rejected duplicate escrow");
      }
    });

    it("Fails to operate on non-existent escrow", async () => {
      const nonExistentEscrowId = new anchor.BN(999);
      const [nonExistentPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          sender.publicKey.toBuffer(),
          recipient.publicKey.toBuffer(),
          nonExistentEscrowId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .acceptEscrow()
          .accounts({
            escrow: nonExistentPDA,
            recipient: recipient.publicKey,
            sender: sender.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([recipient])
          .rpc();
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.ok(error.toString().includes("AccountNotInitialized") || error.toString().includes("account does not exist"));
        console.log("✅ Correctly rejected non-existent escrow");
      }
    });
  });
});