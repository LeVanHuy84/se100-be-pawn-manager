import { PrismaClient } from '../../../generated/prisma';
import { CustomerType } from '../../../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const customers = [
    {
      fullName: 'Nguyen Van A',
      dob: '1990-05-15',
      nationalId: '079090001234',
      phone: '0901234567',
      email: 'pawner-test@yopmail.com',
      address: '123 Nguyen Hue, District 1, HCMC',
      customerType: 'REGULAR',
      monthlyIncome: 15000000,
      creditScore: 700,
    },
    {
      fullName: 'Tran Thi B',
      dob: '1988-09-20',
      nationalId: '079090001235',
      phone: '0912345678',
      email: 'tranthib@example.com',
      address: '456 Le Loi, District 3, HCMC',
      customerType: 'VIP',
      monthlyIncome: 40000000,
      creditScore: 800,
    },
    {
      fullName: 'Le Thi C',
      dob: '1995-12-01',
      nationalId: '079090001236',
      phone: '0923456789',
      email: 'lethic@example.com',
      address: '789 Tran Hung Dao, District 5, HCMC',
      customerType: 'REGULAR',
      monthlyIncome: 8000000,
      creditScore: 650,
    },
    {
      fullName: 'Pham Van D',
      dob: '1980-03-10',
      nationalId: '079090001237',
      phone: '0934567890',
      email: 'phamvand@example.com',
      address: '12 Le Duan, District 1, HCMC',
      customerType: 'REGULAR',
      monthlyIncome: 12000000,
      creditScore: 720,
    },
    {
      fullName: 'Hoang Thi E',
      dob: '1992-07-22',
      nationalId: '079090001238',
      phone: '0945678901',
      email: 'hoangthe@example.com',
      address: '34 Vo Van Tan, District 3, HCMC',
      customerType: 'VIP',
      monthlyIncome: 50000000,
      creditScore: 850,
    },
    {
      fullName: 'Ngo Van F',
      dob: '1975-11-30',
      nationalId: '079090001239',
      phone: '0956789012',
      email: 'ngovf@example.com',
      address: '78 Nguyen Trai, District 5, HCMC',
      customerType: 'REGULAR',
      monthlyIncome: 9000000,
      creditScore: 600,
    },
    {
      fullName: 'Dang Thi G',
      dob: '1998-02-14',
      nationalId: '079090001240',
      phone: '0967890123',
      email: 'dangthig@example.com',
      address: '99 Hai Ba Trung, District 3, HCMC',
      customerType: 'REGULAR',
      monthlyIncome: 7000000,
      creditScore: 680,
    },
    {
      fullName: 'Vu Van H',
      dob: '1985-06-05',
      nationalId: '079090001241',
      phone: '0978901234',
      email: 'vuvanh@example.com',
      address: '21 Bach Dang, District 1, HCMC',
      customerType: 'VIP',
      monthlyIncome: 30000000,
      creditScore: 780,
    },
    {
      fullName: 'Tran Van I',
      dob: '1991-04-18',
      nationalId: '079090001242',
      phone: '0989012345',
      email: 'tranvani@example.com',
      address: '55 Cach Mang Thang 8, District 10, HCMC',
      customerType: 'REGULAR',
      monthlyIncome: 11000000,
      creditScore: 710,
    },
    {
      fullName: 'Le Van J',
      dob: '1979-08-08',
      nationalId: '079090001243',
      phone: '0990123456',
      email: 'levanj@example.com',
      address: '100 Dien Bien Phu, Binh Thanh, HCMC',
      customerType: 'VIP',
      monthlyIncome: 45000000,
      creditScore: 820,
    },
    {
      fullName: 'Pham Thi K',
      dob: '1993-10-02',
      nationalId: '079090001244',
      phone: '0902233445',
      email: 'phamthik@example.com',
      address: '200 Vo Van Kiet, District 6, HCMC',
      customerType: 'REGULAR',
      monthlyIncome: 6000000,
      creditScore: 640,
    },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { nationalId: c.nationalId },
      update: {
        fullName: c.fullName,
        dob: new Date(c.dob),
        phone: c.phone,
        email: c.email,
        address: c.address,
        customerType: c.customerType as CustomerType,
        monthlyIncome: c.monthlyIncome,
        creditScore: c.creditScore,
      },
      create: {
        fullName: c.fullName,
        dob: new Date(c.dob),
        nationalId: c.nationalId,
        phone: c.phone,
        email: c.email,
        address: c.address,
        customerType: c.customerType as CustomerType,
        monthlyIncome: c.monthlyIncome,
        creditScore: c.creditScore,
        images: [],
      },
    });
  }

  console.log('Seed finished');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
