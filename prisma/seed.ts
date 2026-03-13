import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function resetDatabase() {
  await prisma.cardAssignment.deleteMany();
  await prisma.cardLabel.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.cardChecklist.deleteMany();
  await prisma.cardComment.deleteMany();
  await prisma.card.deleteMany();
  await prisma.label.deleteMany();
  await prisma.list.deleteMany();
  await prisma.boardInvitation.deleteMany();
  await prisma.boardMember.deleteMany();
  await prisma.board.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDatabase();

  const passwordHash = await bcrypt.hash("Demo1234!", 12);

  const [sofia, diego, lucia] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Sofia Rivas",
        email: "sofia@projectflow.dev",
        passwordHash,
        bio: "Product lead centrada en roadmap, entregas y colaboración entre equipos.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Diego Torres",
        email: "diego@projectflow.dev",
        passwordHash,
        bio: "Frontend engineer enfocado en interacción, performance y accesibilidad.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Lucia Ramos",
        email: "lucia@projectflow.dev",
        passwordHash,
        bio: "Operations manager que revisa fechas, bloqueos y seguimiento operativo.",
      },
    }),
  ]);

  const launchBoard = await prisma.board.create({
    data: {
      name: "Lanzamiento de App Mobile",
      description:
        "Planificación integral del release mobile, con seguimiento de diseño, backend, QA y marketing.",
      theme: "aurora",
      ownerId: sofia.id,
    },
  });

  await prisma.boardMember.createMany({
    data: [
      { boardId: launchBoard.id, userId: sofia.id, role: "OWNER" },
      { boardId: launchBoard.id, userId: diego.id, role: "EDITOR" },
      { boardId: launchBoard.id, userId: lucia.id, role: "VIEWER" },
    ],
  });

  const labels = await Promise.all([
    prisma.label.create({
      data: { boardId: launchBoard.id, name: "Frontend", color: "SKY" },
    }),
    prisma.label.create({
      data: { boardId: launchBoard.id, name: "Backend", color: "VIOLET" },
    }),
    prisma.label.create({
      data: { boardId: launchBoard.id, name: "Diseño", color: "ROSE" },
    }),
    prisma.label.create({
      data: { boardId: launchBoard.id, name: "Urgente", color: "AMBER" },
    }),
    prisma.label.create({
      data: { boardId: launchBoard.id, name: "Bloqueado", color: "SLATE" },
    }),
  ]);

  const lists = await Promise.all([
    prisma.list.create({
      data: { boardId: launchBoard.id, name: "Ideas y Backlog", position: 0 },
    }),
    prisma.list.create({
      data: { boardId: launchBoard.id, name: "En progreso", position: 1 },
    }),
    prisma.list.create({
      data: { boardId: launchBoard.id, name: "En revisión", position: 2 },
    }),
    prisma.list.create({
      data: { boardId: launchBoard.id, name: "Completado", position: 3 },
    }),
  ]);

  const onboardingCard = await prisma.card.create({
    data: {
      boardId: launchBoard.id,
      listId: lists[1].id,
      createdById: sofia.id,
      title: "Pulir onboarding y activación inicial",
      description:
        "Revisar la experiencia del primer ingreso, reducir fricción y dejar métricas listas para el lanzamiento.",
      position: 0,
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: addDays(new Date(), 4),
      assignments: {
        create: [{ userId: diego.id }, { userId: sofia.id }],
      },
      cardLabels: {
        create: [{ labelId: labels[0].id }, { labelId: labels[2].id }],
      },
      checklists: {
        create: {
          title: "Checklist de lanzamiento",
          position: 0,
          items: {
            create: [
              {
                title: "Validar copy de bienvenida",
                position: 0,
                isCompleted: true,
                completedAt: subDays(new Date(), 1),
                completedById: sofia.id,
              },
              {
                title: "Ajustar estados vacíos en mobile",
                position: 1,
              },
              {
                title: "Configurar evento de analítica",
                position: 2,
              },
            ],
          },
        },
      },
      comments: {
        create: [
          {
            authorId: sofia.id,
            body: "Necesitamos esta tarjeta cerrada antes del cierre de sprint.",
          },
          {
            authorId: diego.id,
            body: "Hoy dejo lista la revisión visual y mañana conecto métricas.",
          },
        ],
      },
      attachments: {
        create: {
          name: "Figma onboarding",
          url: "https://www.figma.com/",
          uploadedById: sofia.id,
        },
      },
    },
  });

  const apiCard = await prisma.card.create({
    data: {
      boardId: launchBoard.id,
      listId: lists[2].id,
      createdById: diego.id,
      title: "Estabilizar endpoint de sincronización",
      description:
        "Cerrar edge cases del endpoint que sincroniza favoritos y notificaciones entre dispositivos.",
      position: 0,
      status: "IN_REVIEW",
      priority: "MEDIUM",
      dueDate: addDays(new Date(), 2),
      assignments: {
        create: [{ userId: diego.id }],
      },
      cardLabels: {
        create: [{ labelId: labels[1].id }],
      },
      comments: {
        create: {
          authorId: diego.id,
          body: "La rama ya está en QA. Queda revisar el caso de timeout.",
        },
      },
    },
  });

  await prisma.card.create({
    data: {
      boardId: launchBoard.id,
      listId: lists[0].id,
      createdById: sofia.id,
      title: "Preparar assets para campaña de lanzamiento",
      description:
        "Definir piezas para web, tienda y anuncios de la semana del release.",
      position: 0,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: addDays(new Date(), 7),
      assignments: {
        create: [{ userId: lucia.id }],
      },
      cardLabels: {
        create: [{ labelId: labels[2].id }],
      },
    },
  });

  await prisma.card.create({
    data: {
      boardId: launchBoard.id,
      listId: lists[0].id,
      createdById: lucia.id,
      title: "Resolver bloqueo con proveedor de push notifications",
      description:
        "Falta confirmar el nuevo límite de envíos y el costo para el trimestre.",
      position: 1,
      status: "BLOCKED",
      priority: "HIGH",
      dueDate: subDays(new Date(), 1),
      assignments: {
        create: [{ userId: lucia.id }, { userId: sofia.id }],
      },
      cardLabels: {
        create: [{ labelId: labels[3].id }, { labelId: labels[4].id }],
      },
      comments: {
        create: {
          authorId: lucia.id,
          body: "Escalado con compras. Necesitamos respuesta hoy para no mover la fecha.",
        },
      },
    },
  });

  await prisma.card.create({
    data: {
      boardId: launchBoard.id,
      listId: lists[3].id,
      createdById: sofia.id,
      title: "Definir tablero ejecutivo para stakeholders",
      description:
        "Resumen visual del progreso, riesgo y próximos hitos para la reunión de dirección.",
      position: 0,
      status: "DONE",
      priority: "LOW",
      completedAt: subDays(new Date(), 2),
      assignments: {
        create: [{ userId: sofia.id }],
      },
      cardLabels: {
        create: [{ labelId: labels[2].id }],
      },
    },
  });

  const opsBoard = await prisma.board.create({
    data: {
      name: "Operación interna Q2",
      description:
        "Tablero privado para mantener pendientes internos de mejora continua y automatización.",
      theme: "volcano",
      ownerId: diego.id,
    },
  });

  await prisma.boardMember.create({
    data: { boardId: opsBoard.id, userId: diego.id, role: "OWNER" },
  });

  const opsList = await prisma.list.create({
    data: { boardId: opsBoard.id, name: "Pendientes", position: 0 },
  });

  await prisma.card.create({
    data: {
      boardId: opsBoard.id,
      listId: opsList.id,
      createdById: diego.id,
      title: "Automatizar reporte semanal",
      description:
        "Reducir tiempo manual del reporte con exportación directa desde la base de datos.",
      position: 0,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: addDays(new Date(), 10),
    },
  });

  await prisma.boardInvitation.create({
    data: {
      boardId: launchBoard.id,
      email: lucia.email,
      role: "EDITOR",
      status: "PENDING",
      invitedById: sofia.id,
      inviteeId: lucia.id,
      token: randomUUID(),
      expiresAt: addDays(new Date(), 10),
    },
  });

  console.log("Seed completado.");
  console.log("Usuarios demo:");
  console.log("  sofia@projectflow.dev / Demo1234!");
  console.log("  diego@projectflow.dev / Demo1234!");
  console.log("  lucia@projectflow.dev / Demo1234!");
  console.log(`Board principal: ${launchBoard.name}`);
  console.log(`Tarjetas destacadas: ${onboardingCard.title}, ${apiCard.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
