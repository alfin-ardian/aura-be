import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.findUnique({
    where: { email: 'affiliator@auraai.local' },
  });
  const subs = await prisma.subscription.findMany({ where: { isActive: true } });
  let n = 0;

  for (const sub of subs) {
    if (demo && sub.userId === demo.id) continue;

    const payments = await prisma.payment.findMany({
      where: { subscriptionId: sub.id, status: 'paid' },
    });
    const noPayment = payments.length === 0;
    const onlyDemo =
      payments.length > 0 &&
      payments.every((p) => /AURA-\d{8}-11$/.test(p.invoiceNumber));

    if (noPayment || onlyDemo) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { isActive: false },
      });
      n += 1;
      console.log(
        'deactivated',
        sub.id,
        sub.planName,
        noPayment ? 'no-payment' : 'demo-only',
      );
    }
  }

  console.log('done', n);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
