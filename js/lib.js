import {
  Keypair,
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

export const generate_signers = () => {
  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  return [signer1, signer2, signer3];
};

/**
 *
 * @param {import("@solana/web3.js").Connection} connection
 */
export const create_init_wallet_account = async (
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

  const wallet_acc = new Keypair();

  const wallet_acc_pubkey = wallet_acc.publicKey;

  const transaction_1 = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: wallet_acc_pubkey,
      space: wallet_size,
      lamports: lamports,
      programId: programKey,
    })
  );

  return [
    wallet_acc_pubkey,
    wallet_acc,
    await sendAndConfirmTransaction(connection, transaction_1, [
      payer,
      wallet_acc,
    ]),
  ];
};

export const create_init_wallet_transaction = (
  wallet_acc_pubkey,
  [signer1, signer2, signer3],
  required_amount_of_signs,
  programKey
) => {
  const instruction = new TransactionInstruction({
    keys: [
      {
        pubkey: wallet_acc_pubkey,
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
export const create_request_account = async (
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
    request_acc,
    await sendAndConfirmTransaction(connection, transaction_1, [
      payer,
      request_acc,
    ]),
  ];
};

export const create_request_transaction = (
  wallet_acc_pubkey,
  requestAccPubkey,
  signer,
  receiver,
  amount,
  programKey
) => {
  const instruction = new TransactionInstruction({
    keys: [
      {
        pubkey: wallet_acc_pubkey,
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

export const create_sign_transaction = (
  wallet_acc_pubkey,
  requestAccPubkey,
  signer,
  receiver,
  amount,
  programKey
) => {
  const instruction = new TransactionInstruction({
    keys: [
      {
        pubkey: wallet_acc_pubkey,
        isSigner: true,
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
      {
        pubkey: receiver,
        isSigner: false,
        isWritable: true,
      },
    ],
    data: Buffer.from([2]),
    programId: programKey,
  });

  const t = new Transaction().add(instruction);

  return t;
};
