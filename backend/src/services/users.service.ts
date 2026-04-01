import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";

export async function login(phone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.is_active) throw new Error("Invalid credentials");
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new Error("Invalid credentials");
  const token = signToken({ sub: user.id, role: user.role, wing_id: user.wing_id, name: user.name });
  return { token, user: { id: user.id, name: user.name, role: user.role, wing_id: user.wing_id } };
}

export interface CreateUserInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: Role;
  wing_id?: string;
  created_by: string;
}

/** Admin only — only Admin creates/edits users. */
export async function createUser(input: CreateUserInput) {
  const password_hash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        password_hash,
        role: input.role,
        wing_id: input.wing_id,
      },
    });
    await writeAuditLog(tx, { user_id: input.created_by, action: "CREATE", entity: "User", entity_id: user.id });
    return user;
  });
}

export async function listUsers() {
  return prisma.user.findMany({ select: { id: true, name: true, phone: true, email: true, role: true, wing_id: true, is_active: true, created_at: true } });
}

/** Admin-only deactivate. Users are never hard-deleted (their id is referenced by AuditLog,
 * Sale, Expense, etc.) — deactivating blocks login and hides them from active user pickers. */
export async function deactivateUser(user_id: string, deactivated_by: string) {
  if (user_id === deactivated_by) {
    throw new Error("You cannot deactivate your own account");
  }
  const user = await prisma.user.update({ where: { id: user_id }, data: { is_active: false } });
  await prisma.auditLog.create({ data: { user_id: deactivated_by, action: "DELETE", entity: "User", entity_id: user_id, diff: { deactivated: true } } });
  return user;
}

export async function updateUser(user_id: string, updated_by: string, data: Partial<{ name: string; email: string; role: Role; wing_id: string; is_active: boolean }>) {
  const user = await prisma.user.update({ where: { id: user_id }, data });
  await prisma.auditLog.create({ data: { user_id: updated_by, action: "UPDATE", entity: "User", entity_id: user_id, diff: data } });
  return user;
}
