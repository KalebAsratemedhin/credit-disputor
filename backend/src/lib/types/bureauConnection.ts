/** Decrypted identity blob stored as encrypted JSON on `BureauConnection`. */
export type BureauStoredIdentity = {
  firstName: string;
  lastName: string;
  middleName?: string;
  dobMmddyyyy: string;
  ssn: string;
  email?: string;
};

/** Decrypted address blob stored as encrypted JSON on `BureauConnection`. */
export type BureauStoredAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  addressOverTwoYears: boolean;
  previousStreet?: string;
  previousCity?: string;
  previousState?: string;
  previousZip?: string;
};
