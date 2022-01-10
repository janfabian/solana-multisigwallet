export class MultisigWallet {
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

export const MultisigWalletSchema = new Map([
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

export class MultisigWalletRequest {
  is_initialized = 0;
  is_signed1 = 0;
  is_signed2 = 0;
  is_signed3 = 0;
  wallet = new Uint8Array(32);
  constructor(fields = undefined) {
    if (fields) {
      this.amount = fields.amount;
      this.receiver = fields.receiver;
    }
  }
}

export const MultisigWalletRequestSchema = new Map([
  [
    MultisigWalletRequest,
    {
      kind: "struct",
      fields: [
        ["is_initialized", "u8"],
        ["amount", "u64"],
        ["wallet", [32]],
        ["receiver", [32]],
        ["is_signed1", "u8"],
        ["is_signed2", "u8"],
        ["is_signed3", "u8"],
      ],
    },
  ],
]);
