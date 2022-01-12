import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  create_init_wallet_account,
  create_init_wallet_transaction,
  create_request_account,
  create_request_transaction,
  create_sign_transaction,
  generate_signers,
} from "./lib.js";

const PROGRAM_ID = "6YYczekdYrXv6KNU4eGRjsUe4yr2XdPKarrm8gQDTDWt";

const is_local = process.argv[2] === "local";
const is_dev = process.argv[2] === "dev";

const connection = (() => {
  switch (process.argv[2]) {
    case "local": {
      return new Connection("http://localhost:8899", "confirmed");
    }
    case "dev": {
      return new Connection("https://api.devnet.solana.com", "confirmed");
    }
    case "test": {
      return new Connection("https://api.testnet.solana.com", "confirmed");
    }
    default: {
      throw new Error("unknown cluster");
    }
  }
})();
(async () => {
  const amount = 1000000;

  const payer = Keypair.generate();
  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL + amount
  );
  await connection.confirmTransaction(airdropSignature);

  const programKey = new PublicKey(PROGRAM_ID);

  const required_amount_of_signs = 2;
  const [signer1, signer2, signer3] = generate_signers();

  const [wallet_acc_pubkey, wallet_acc] = await create_init_wallet_account(
    connection,
    [signer1, signer2, signer3],
    required_amount_of_signs,
    payer,
    programKey
  );

  const init_wallet_transaction = create_init_wallet_transaction(
    wallet_acc_pubkey,
    [signer1, signer2, signer3],
    required_amount_of_signs,
    programKey
  );

  const hash = await sendAndConfirmTransaction(
    connection,
    init_wallet_transaction,
    [payer]
  );

  if (is_local) {
    const res = await connection.getTransaction(hash);
  }

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: wallet_acc_pubkey,
        lamports: amount,
      })
    ),
    [payer]
  );

  const receiver = new Keypair();

  console.log(
    "lamports on receiver account before: ",
    (await connection.getAccountInfo(receiver.publicKey))?.lamports || 0
  );

  const [requestAccount] = await create_request_account(
    connection,
    amount,
    receiver,
    payer,
    programKey
  );

  const request_transaction = create_request_transaction(
    wallet_acc_pubkey,
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

  console.log("request init tx: ", hash_request_transaction);

  if (is_local) {
    const res_request_transaction = await connection.getTransaction(
      hash_request_transaction
    );
  }

  // console.log(res_request_transaction);

  const sign_transaction = create_sign_transaction(
    wallet_acc_pubkey,
    requestAccount,
    signer1.publicKey,
    receiver.publicKey,
    amount,
    programKey
  );

  const hash_sign_transaction = await sendAndConfirmTransaction(
    connection,
    sign_transaction,
    [payer, signer1, wallet_acc]
  );

  if (is_local) {
    const res_sign_transaction = await connection.getTransaction(
      hash_sign_transaction
    );
  }

  console.log("sign1: ", hash_sign_transaction);

  // console.log(res_sign_transaction);

  const sign_transaction2 = create_sign_transaction(
    wallet_acc_pubkey,
    requestAccount,
    signer2.publicKey,
    receiver.publicKey,
    amount,
    programKey
  );

  const hash_sign_transaction2 = await sendAndConfirmTransaction(
    connection,
    sign_transaction2,
    [payer, signer2, wallet_acc]
  );

  if (is_local) {
    const res_sign_transaction2 = await connection.getTransaction(
      hash_sign_transaction2
    );
  }

  console.log("sign2: ", hash_sign_transaction2);

  // const sign_transaction3 = create_sign_transaction(
  //   wallet_acc_pubkey,
  //   requestAccount,
  //   signer3.publicKey,
  //   receiver.publicKey,
  //   amount,
  //   programKey
  // );

  // const hash_sign_transaction3 = await sendAndConfirmTransaction(
  //   connection,
  //   sign_transaction3,
  //   [payer, signer3, wallet_acc]
  // );

  // const res_sign_transaction3 = await connection.getTransaction(
  //   hash_sign_transaction3
  // );

  // console.log("sign3: ", hash_sign_transaction3);

  console.log(
    "lamports on receiver account after: ",
    (await connection.getAccountInfo(receiver.publicKey))?.lamports || 0
  );

  // console.log(res_sign_transaction2);
})();
