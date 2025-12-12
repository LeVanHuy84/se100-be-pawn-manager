export interface ContractResponse {
  id: string;
  loanId: string;
  customerId: string;
  employeeId?: string;
  contractDate: Date;
  policyId?: string;
  digitalSignature?: string;
  termsReference?: string;
  disbursementAmount: number;
  method: string;
  disbursedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
