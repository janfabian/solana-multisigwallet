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
import {
  MultisigWallet,
  MultisigWalletSchema,
  MultisigWalletRequestSchema,
  MultisigWalletRequest,
} from "./state.js";

const PROGRAM_ID = "6YYczekdYrXv6KNU4eGRjsUe4yr2XdPKarrm8gQDTDWt";

const generate_signers = () => {
  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  return [signer1, signer2, signer3];
};

/**
 *
 * @param {import("@solana/web3.js").Connection} connection
 */
const create_init_wallet_account = async (
  connection,
  [signer1, signer2, signer3],
  required_amount_of_signs,
  payer,
  programKey
) => {
  const wallet_size = borsh.serialize(
    MultisigWalletSchema,
    new MultisigWallet({
      m: required_amount_of_signs,
      signer1: signer1.publicKey.toBytes(),
      signer2: signer2.publicKey.toBytes(),
      signer3: signer3.publicKey.toBytes(),
    })
  ).length;

  const lamports = await connection.getMinimumBalanceForRentExemption(
    wallet_size
  );

  const transferAcc = new Keypair();

  const transferAccPubKey = transferAcc.publicKey;

  const transaction_1 = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: transferAccPubKey,
      space: wallet_size,
      lamports: lamports,
      programId: programKey,
    })
  );

  return [
    transferAccPubKey,
    await sendAndConfirmTransaction(connection, transaction_1, [
      payer,
      transferAcc,
    ]),
  ];
};

const create_init_wallet_transaction = (
  transferAccPubKey,
  [signer1, signer2, signer3],
  required_amount_of_signs,
  programKey
) => {
  const instruction = new TransactionInstruction({
    keys: [
      {
        pubkey: transferAccPubKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: signer1.publicKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: signer2.publicKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: signer3.publicKey,
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.from([
      0,
      required_amount_of_signs,
      // ...new Uint8Array(bignum(10).toBuffer({ endian: "little", size: 8 })),
      // ...signer1.toBytes(),
    ]),
    programId: programKey,
  });

  const t = new Transaction().add(instruction);

  return t;
};

/**
 *
 * @param {import("@solana/web3.js").Connection} connection
 */
const create_request_account = async (
  connection,
  amount,
  receiver,
  payer,
  programKey
) => {
  const request_size = borsh.serialize(
    MultisigWalletRequestSchema,
    new MultisigWalletRequest({
      amount: amount,
      receiver: receiver.publicKey.toBytes(),
    })
  ).length;

  const lamports = await connection.getMinimumBalanceForRentExemption(
    request_size
  );

  console.log("lamports request ", lamports);

  const request_acc = new Keypair();

  const request_acc_pubkey = request_acc.publicKey;

  const transaction_1 = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: request_acc_pubkey,
      space: request_size,
      lamports: lamports,
      programId: programKey,
    })
  );

  return [
    request_acc_pubkey,
    await sendAndConfirmTransaction(connection, transaction_1, [
      payer,
      request_acc,
    ]),
  ];
};

const create_request_transaction = (
  transferAccPubKey,
  requestAccPubkey,
  signer,
  receiver,
  amount,
  programKey
) => {
  const instruction = new TransactionInstruction({
    keys: [
      {
        pubkey: transferAccPubKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: requestAccPubkey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: signer,
        isSigner: true,
        isWritable: false,
      },
    ],
    data: Buffer.from([
      1,
      ...new Uint8Array(bignum(amount).toBuffer({ endian: "little", size: 8 })),
      ...receiver.toBytes(),
    ]),
    programId: programKey,
  });

  const t = new Transaction().add(instruction);

  return t;
};

(async () => {
  const connection = new Connection("http://localhost:8899", "confirmed");

  const payer = Keypair.generate();
  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  const programKey = new PublicKey(PROGRAM_ID);

  const required_amount_of_signs = 2;
  const [signer1, signer2, signer3] = generate_signers();

  const [transferAccPubKey] = await create_init_wallet_account(
    connection,
    [signer1, signer2, signer3],
    required_amount_of_signs,
    payer,
    programKey
  );

  const init_wallet_transaction = create_init_wallet_transaction(
    transferAccPubKey,
    [signer1, signer2, signer3],
    required_amount_of_signs,
    programKey
  );

  const hash = await sendAndConfirmTransaction(
    connection,
    init_wallet_transaction,
    [payer]
  );

  const res = await connection.getTransaction(hash);

  console.log(res);
  // console.log({
  //   signer1: signer1.publicKey.toBase58(),
  //   signer2: signer2.publicKey.toBase58(),
  //   signer3: signer3.publicKey.toBase58(),
  // });

  const amount = 100000;
  const receiver = new Keypair();
  const [requestAccount] = await create_request_account(
    connection,
    amount,
    receiver,
    payer,
    programKey
  );

  const request_transaction = create_request_transaction(
    transferAccPubKey,
    requestAccount,
    signer1.publicKey,
    receiver.publicKey,
    amount,
    programKey
  );

  const hash_request_transaction = await sendAndConfirmTransaction(
    connection,
    request_transaction,
    [payer, signer1]
  );

  const res_request_transaction = await connection.getTransaction(
    hash_request_transaction
  );

  console.log(res_request_transaction);

  console.log(requestAccount.toBase58());
})();
