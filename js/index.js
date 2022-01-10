import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bignum from "bignum";
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
        ["m", "u8"],
        ["is_initialized", "u8"],
        ["signer1", [32]],
        ["signer2", [32]],
        ["signer3", [32]],
      ],
    },
  ],
]);

(async () => {
  const connection = new Connection("http://localhost:8899", "confirmed");

  const wallet = Keypair.generate();
  const airdropSignature = await connection.requestAirdrop(
    wallet.publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  const programKey = new PublicKey(programId);

  const signer1 = Keypair.generate().publicKey;
  const signer2 = Keypair.generate().publicKey;
  const signer3 = Keypair.generate().publicKey;
  const m = 2;
  const WALLET_SIZE = borsh.serialize(
    MultisigWalletSchema,
    new MultisigWallet({
      m: m,
      signer1: signer1.toBytes(),
      signer2: signer2.toBytes(),
      signer3: signer3.toBytes(),
    })
  ).length;

  const lamports = await connection.getMinimumBalanceForRentExemption(
    WALLET_SIZE
  );

  // console.log({ lamports });

  const transferAcc = new Keypair();

  console.log(transferAcc.publicKey.toBase58());
  const transferAccPubKey = transferAcc.publicKey;

  const transaction_1 = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: transferAccPubKey,
      space: WALLET_SIZE,
      lamports: lamports + 1000,
      programId: programKey,
    })
  );

  // Complete this function call with the expected arguments.
  const hash_1 = await sendAndConfirmTransaction(connection, transaction_1, [
    wallet,
    transferAcc,
  ]);

  // console.log({ hash_1, transferAccPubKey });

  const r = await connection.getTransaction(hash_1);

  // console.log(r);

  const instruction = new TransactionInstruction({
    keys: [
      {
        pubkey: transferAccPubKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: signer1,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: signer2,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: signer3,
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.from([
      1,
      ...new Uint8Array(bignum(10).toBuffer({ endian: "little", size: 8 })),
      ...signer1.toBytes(),
    ]),
    programId: programKey,
  });

  const hash = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [wallet]
  );

  const res = await connection.getTransaction(hash);

  console.log(res);
  console.log({
    signer1: signer1.toBase58(),
    signer2: signer2.toBase58(),
    signer3: signer3.toBase58(),
  });
})();
