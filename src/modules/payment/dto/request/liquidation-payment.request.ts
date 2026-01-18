import { z } from 'zod';

export const LiquidationPaymentRequestSchema = z.object({
  collateralId: z.string().uuid({ message: 'Invalid collateral ID format' }),
  sellPrice: z.number().positive({ message: 'Sell price must be positive' }),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER'], {
    message: 'Payment method must be CASH or BANK_TRANSFER',
  }),
  notes: z.string().optional(),
});

export type LiquidationPaymentRequest = z.infer<
  typeof LiquidationPaymentRequestSchema
>;
