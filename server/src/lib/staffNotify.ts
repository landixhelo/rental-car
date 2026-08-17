import { prisma } from "./prisma.js";
import { sendWebPushToUsers } from "./webPush.js";

export async function notifyStaffNewReservation(input: {
  customerId: string;
  customerName: string;
  ownerId: string | null;
  carLabel: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
}) {
  const message = `${input.customerName} rezervoi ${input.carLabel} (${input.startDate} → ${input.endDate}). Totali: €${input.totalPrice}.`;
  const recipientIds = new Set<string>();

  if (input.ownerId && input.ownerId !== input.customerId) {
    recipientIds.add(input.ownerId);
  }

  const staff = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
    },
    select: { id: true },
  });
  for (const user of staff) {
    if (user.id !== input.customerId) recipientIds.add(user.id);
  }

  for (const userId of recipientIds) {
    await prisma.notification.create({
      data: {
        userId,
        title:
          userId === input.ownerId
            ? "Rezervim i ri nga klienti"
            : "Rezervim i ri",
        message,
      },
    });
  }

  await sendWebPushToUsers([...recipientIds], {
    title: "Rezervim i ri",
    body: message,
    url: "/reservations",
  });
}
