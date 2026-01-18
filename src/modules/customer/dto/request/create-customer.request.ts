import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CustomerType } from '../../enum/customer-type.enum';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cccdRegex = /^\d{12}$/; // CCCD Vietnam: exactly 12 digits

function isAdult(dateString: string) {
  if (!isoDateRegex.test(dateString)) return false;
  const d = new Date(dateString + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 18;
}

function isValidDate(dateString: string): boolean {
  if (!isoDateRegex.test(dateString)) return false;
  const d = new Date(dateString + 'T00:00:00');
  return !Number.isNaN(d.getTime());
}

export const CreateCustomerSchema = z.object({
  fullName: z.string().min(1).max(200),
  dob: z
    .string()
    .refine((val) => isoDateRegex.test(val), {
      message: 'DOB must be in YYYY-MM-DD format',
    })
    .refine((val) => isAdult(val), {
      message: 'Customer must be at least 18 years old',
    }),
  nationalId: z.string().refine((val) => cccdRegex.test(val), {
    message: 'National ID must be exactly 12 digits (CCCD format)',
  }),
  nationalIdIssueDate: z
    .string()
    .refine((val) => isoDateRegex.test(val), {
      message: 'National ID issue date must be in YYYY-MM-DD format',
    })
    .refine((val) => isValidDate(val), {
      message: 'Invalid national ID issue date',
    }),
  nationalIdIssuePlace: z.string().min(1).max(200, {
    message: 'National ID issue place is required',
  }),
  phone: z.string().min(10).max(15),
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((val) => emailRegex.test(val), {
      message: 'Invalid email format',
    })
    .optional(),
  address: z.string().optional(),
  customerType: z.enum(Object.values(CustomerType) as [string, ...string[]]),
  monthlyIncome: z.coerce.number().int().min(3000000),
  creditScore: z.coerce.number().int().min(0).max(1000).optional(),

  // Thông tin gia đình - Bố
  fatherName: z.string().min(1).max(200),
  fatherPhone: z.string().min(10).max(15),
  fatherOccupation: z.string().min(1).max(200),

  // Thông tin gia đình - Mẹ
  motherName: z.string().min(1).max(200),
  motherPhone: z.string().min(10).max(15),
  motherOccupation: z.string().min(1).max(200),

  // Thông tin gia đình - Vợ/Chồng (optional)
  spouseName: z.string().max(200).optional(),
  spousePhone: z.string().min(10).max(15).optional(),
  spouseOccupation: z.string().max(200).optional(),

  // Nghề nghiệp & Thu nhập
  occupation: z.string().min(1).max(200),
  workplace: z.string().min(1).max(200),

  // Người liên hệ khẩn cấp
  emergencyContactName: z.string().min(1).max(200),
  emergencyContactPhone: z.string().min(10).max(15),

  // Địa chỉ hành chính (chỉ cần wardId, province sẽ lấy từ ward.parent)
  wardId: z.string().uuid(),
});

export class CreateCustomerDTO extends createZodDto(CreateCustomerSchema) {}
