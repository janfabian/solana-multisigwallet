import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Token } from "@solana/spl-token";

import borsh from "borsh";

const programId = "5FpL8Pq6ahy8dh7ydXqfYrJYCiKDHrwcGFGtRoZ1t9DA";
class MultisigWallet {
  signer1 = new Uint8Array(32);
  signer2 = new Uint8Array(32);
  signer3 = new Uint8Array(32);
  constructor(fields = undefined) {
    if (fields) {
      this.signer1 = fields.signer1 || this.signer1;
      this.signer2 = fields.signer2 || this.signer2;
      this.signer3 = fields.signer3 || this.signer3;
    }
  }
}
const MultisigWalletSchema = new Map([
  [
    MultisigWallet,
    {
      kind: "struct",
      fields: [
        ["signer1", [32]],
        ["signer2", [32]],
      ],
    },
  ],
]);

(async () => {
  const connection = new Connection("http://localhost:8899", "confirmed");

  const signer1 = Keypair.generate();
  const airdropSignature1 = await connection.requestAirdrop(
    signer1.publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature1);

  const signer2 = Keypair.generate();
  const airdropSignature2 = await connection.requestAirdrop(
    signer2.publicKey,
    LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(airdropSignature2);
  const signer3 = Keypair.generate();
  const airdropSignature3 = await connection.requestAirdrop(
    signer3.publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature3);

  const lamports_needed_for_nonce_acc =
    await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);

  const nonce_pair = Keypair.generate();

  const t = SystemProgram.createNonceAccount({
    authorizedPubkey: signer1.publicKey,
    fromPubkey: signer1.publicKey,
    noncePubkey: nonce_pair.publicKey,
    lamports: lamports_needed_for_nonce_acc,
  });

  const h = await sendAndConfirmTransaction(connection, t, [
    signer1,
    nonce_pair,
  ]);
  console.log(h);

  const nonce = await connection.getNonce(nonce_pair.publicKey);

  const instr = SystemProgram.transfer({
    fromPubkey: signer1.publicKey,
    toPubkey: signer2.publicKey,
    lamports: 1000,
  });

  const t2 = new Transaction();

  t2.nonceInfo = {
    nonce: nonce.nonce,
    nonceInstruction: instr,
  };

  await sendAndConfirmTransaction(connection, t2, [signer1]);

  console.log({
    signer1: signer1.publicKey.toBase58(),
    signer2: signer2.publicKey.toBase58(),
    signer3: signer3.publicKey.toBase58(),
  });

  //   const programKey = new PublicKey(programId);
})();
