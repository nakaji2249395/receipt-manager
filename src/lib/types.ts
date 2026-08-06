export type ClaimType = "single" | "monthly";
export type ClaimStatus = "pending" | "paid" | "email_error" | "processing_error";

export type BankAccount = {
  bankName: string;
  branchName: string;
  accountType: "普通" | "当座";
  accountNumber: string;
  accountHolder: string;
};

export type UserProfile = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  bank: BankAccount;
  createdAt: string;
  updatedAt: string;
};

export type ClaimItem = {
  id: string;
  claimId: string;
  eventDate: string;
  location: string;
  rewardAmount: number;
  departureStation: string;
  arrivalStation: string;
  transportAmount: number;
};

export type Claim = {
  id: string;
  invoiceNumber: string;
  userId: string;
  email: string;
  claimantName: string;
  type: ClaimType;
  targetMonth: string;
  bank: BankAccount;
  rewardTotal: number;
  transportTotal: number;
  grandTotal: number;
  status: ClaimStatus;
  driveFileId: string;
  driveFileUrl: string;
  emailSentAt: string;
  errorMessage: string;
  submittedAt: string;
  paidAt: string;
  updatedAt: string;
};

export type DataStore = {
  users: UserProfile[];
  claims: Claim[];
  items: ClaimItem[];
};

export type ClaimWithItems = Claim & { items: ClaimItem[] };

export type NewClaimInput = {
  type: ClaimType;
  targetMonth: string;
  items: Array<Omit<ClaimItem, "id" | "claimId">>;
};
