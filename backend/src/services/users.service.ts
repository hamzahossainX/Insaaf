import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { HttpError } from "../lib/http";
import { invalidateCurrentUserState } from "../lib/authState";

export async function login(phone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.is_active) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  const token = signToken({ sub: user.id, role: user.role, wing_id: user.wing_id, name: user.name, ver: user.token_version });
  return { token, user: { id: user.id, name: user.name, role: user.role, wing_id: user.wing_id } };
}

export async function changeOwnPassword(user_id: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: user_id } });
  const currentPasswordIsValid = await verifyPassword(currentPassword, user.password_hash);
  if (!currentPasswordIsValid) throw new HttpError(401, "Current password is incorrect");
  if (await verifyPassword(newPassword, user.password_hash)) {
    throw new HttpError(422, "New password must be different from the current password");
  }

  const password_hash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user_id },
      data: { password_hash, token_version: { increment: 1 } },
    });
    await writeAuditLog(tx, { user_id, action: "UPDATE", entity: "UserPassword", entity_id: user_id });
  });
  invalidateCurrentUserState(user_id);
}

export interface CreateUserInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: Role;
  wing_id?: string;
  note?: string;
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
        wing_id: input.role === "MEMBER" ? input.wing_id : undefined,
        note: input.note || undefined,
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
    throw new HttpError(422, "You cannot deactivate your own account");
  }
  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUniqueOrThrow({ where: { id: user_id } });
    if (existing.role === "ADMIN" && existing.is_active) {
      const otherAdmins = await tx.user.count({ where: { id: { not: user_id }, role: "ADMIN", is_active: true } });
      if (otherAdmins === 0) throw new HttpError(409, "The last active admin cannot be deactivated");
    }
    const user = await tx.user.update({ where: { id: user_id }, data: { is_active: false } });
    await writeAuditLog(tx, { user_id: deactivated_by, action: "DELETE", entity: "User", entity_id: user_id, diff: { deactivated: true } });
    return user;
  });
  invalidateCurrentUserState(user_id);
  return user;
}

export async function updateUser(user_id: string, updated_by: string, data: Partial<{ name: string; email: string | null; role: Role; wing_id: string | null; is_active: boolean; note: string | null }>) {
  if (user_id === updated_by && data.is_active === false) {
    throw new HttpError(422, "You cannot deactivate your own account");
  }
  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUniqueOrThrow({ where: { id: user_id } });
    const removesActiveAdmin = existing.role === "ADMIN" && existing.is_active && (data.role === "MEMBER" || data.is_active === false);
    if (removesActiveAdmin) {
      const otherAdmins = await tx.user.count({ where: { id: { not: user_id }, role: "ADMIN", is_active: true } });
      if (otherAdmins === 0) throw new HttpError(409, "The last active admin cannot lose admin access");
    }
    const nextRole = data.role ?? existing.role;
    const requestedWing = data.wing_id === undefined ? existing.wing_id : data.wing_id;
    if (nextRole === "MEMBER" && !requestedWing) {
      throw new HttpError(422, "A member must be assigned to a wing");
    }
    const safeData = { ...data, wing_id: nextRole === "ADMIN" ? null : requestedWing };
    const user = await tx.user.update({ where: { id: user_id }, data: safeData });
    await writeAuditLog(tx, { user_id: updated_by, action: "UPDATE", entity: "User", entity_id: user_id, diff: safeData });
    return user;
  });
  invalidateCurrentUserState(user_id);
  return user;
}
