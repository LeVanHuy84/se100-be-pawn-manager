import { LoanTypeResponse } from './dto/response/loan-type.response';

export class LoanTypeMapper {
  static toResponseDto(loanType: any): LoanTypeResponse {
    return {
      id: loanType.id,
      name: loanType.name,
      description: loanType.description,
      durationMonths: loanType.durationMonths,
      interestRateMonthly: loanType.interestRateMonthly,
      createdAt: loanType.createdAt,
      updatedAt: loanType.updatedAt,
    };
  }

  static toResponseDtoList(loanTypes: any[]): LoanTypeResponse[] {
    return loanTypes.map(this.toResponseDto);
  }
}
