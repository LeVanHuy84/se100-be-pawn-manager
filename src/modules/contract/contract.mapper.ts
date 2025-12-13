import { ContractResponse } from './dto/response/contract.response';

export class ContractMapper {
  // static toResponse(contract: Contract): ContractResponse {
  //   return {
  //     id: contract.id,
  //     loanId: contract.loanId,
  //     customerId: contract.customerId,
  //     employeeId: contract.employeeId || undefined,
  //     contractDate: contract.contractDate,
  //     policyId: contract.policyId || undefined,
  //     digitalSignature: contract.digitalSignature || undefined,
  //     termsReference: contract.termsReference || undefined,
  //     disbursementAmount: Number(contract.disbursementAmount),
  //     method: contract.method,
  //     disbursedDate: contract.disbursedDate,
  //     createdAt: contract.createdAt,
  //     updatedAt: contract.updatedAt,
  //   };
  // }

  // static toResponseList(contracts: Contract[]): ContractResponse[] {
  //   return contracts.map((contract) => this.toResponse(contract));
  // }
}
