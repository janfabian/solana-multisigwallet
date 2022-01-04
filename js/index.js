import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const programId = "5FpL8Pq6ahy8dh7ydXqfYrJYCiKDHrwcGFGtRoZ1t9DA";

(async () => {
  const connection = new Connection("http://localhost:8899", "confirmed");

  const wallet = Keypair.generate();
  const airdropSignature = await connection.requestAirdrop(
    wallet.publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  const programKey = new PublicKey(programId);

  // this your turn to figure out
  // how to create this instruction
  const instruction = new TransactionInstruction({
    keys: [],
    data: Buffer.from("FOO"),
    programId: programKey,
  });

  const hash = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [wallet]
  );

  const res = await connection.getTransaction(hash);

  console.log(res);
})();
