import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NICKNAME_DOMAIN = "chaveirotop.local";

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error || !data) throw new Error("Acesso negado: somente super_admin");
}

const CreateOrgSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/, "slug inválido"),
  cnpj: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  primary_color: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  admin_pin: z.string().min(4).max(10).default("1234"),
  delete_pin: z.string().min(4).max(10).default("1234"),
  admin_nickname: z.string().trim().min(3).regex(/^[a-z0-9._-]+$/i, "usuário inválido"),
  admin_password: z.string().min(6),
  admin_display_name: z.string().trim().min(1),
});

export const createOrganizationWithAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateOrgSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create org
    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.name,
        slug: data.slug,
        cnpj: data.cnpj ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        website: data.website ?? null,
        street: data.street ?? null,
        neighborhood: data.neighborhood ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zip ?? null,
        primary_color: data.primary_color ?? "#eab308",
        logo_url: data.logo_url ?? null,
      })
      .select("*")
      .single();
    if (orgErr || !org) throw new Error(orgErr?.message ?? "Falha ao criar organização");

    // 1b. Seed org-scoped app_settings (entry PIN + deletion PIN)
    await supabaseAdmin.from("app_settings").upsert(
      [
        { organization_id: org.id, key: "admin_pin", value: data.admin_pin as any },
        { organization_id: org.id, key: "delete_pin", value: data.delete_pin as any },
      ],
      { onConflict: "organization_id,key" },
    );

    // 2. Create admin auth user
    const email = `${data.admin_nickname.toLowerCase()}@${NICKNAME_DOMAIN}`;
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.admin_password,
      email_confirm: true,
      user_metadata: {
        full_name: data.admin_display_name,
        organization_id: org.id,
        role: "admin",
      },
    });
    if (userErr || !userRes.user) {
      // rollback org
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      throw new Error(userErr?.message ?? "Falha ao criar usuário admin");
    }

    // 3. Ensure role/profile are correct (trigger already ran; enforce anyway)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userRes.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: userRes.user.id, role: "admin" });
    await supabaseAdmin.from("profiles").update({
      organization_id: org.id,
      display_name: data.admin_display_name,
      approved: true,
    }).eq("user_id", userRes.user.id);

    return { organization: org, adminEmail: email };
  });

const UpdateOrgSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    name: z.string().optional(),
    cnpj: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    primary_color: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    admin_pin: z.string().optional(),
    delete_pin: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateOrgSchema.parse(raw))
  .handler(async ({ data, context }) => {
    // super_admin OR admin of that org
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (role ?? []).map((r: any) => r.role);
    const isSuper = roles.includes("super_admin");
    const isAdmin = roles.includes("admin");
    if (!isSuper && !isAdmin) throw new Error("Acesso negado");
    if (!isSuper) {
      const { data: prof } = await context.supabase
        .from("profiles").select("organization_id").eq("user_id", context.userId).maybeSingle();
      if (prof?.organization_id !== data.id) throw new Error("Você só pode editar sua organização");
    }
    // Use the authenticated user's client (RLS allows super_admin / org admin).
    // Avoids requiring SUPABASE_SERVICE_ROLE_KEY, which is not available in
    // every deployment (e.g. Vercel unless manually configured).
    const db = context.supabase;
    const { admin_pin, delete_pin, ...orgPatch } = data.patch;
    const { data: updated, error } = await db
      .from("organizations").update(orgPatch).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);

    // Sync org-scoped app_settings when PINs change
    const settingsRows: any[] = [];
    if (typeof admin_pin === "string") {
      settingsRows.push({ organization_id: data.id, key: "admin_pin", value: admin_pin });
    }
    if (typeof delete_pin === "string") {
      settingsRows.push({ organization_id: data.id, key: "delete_pin", value: delete_pin });
    }
    if (settingsRows.length) {
      const { error: sErr } = await db.from("app_settings").upsert(settingsRows, { onConflict: "organization_id,key" });
      if (sErr) throw new Error(sErr.message);
    }
    return updated;
  });

export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.id === "00000000-0000-0000-0000-000000000001") {
      throw new Error("Não é possível excluir a organização padrão");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Collect users linked to this organization (via profiles) so we can
    //    remove them from auth.users after the org is dropped.
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("organization_id", data.id);
    const userIds = (profs ?? []).map((p: any) => p.user_id).filter(Boolean);

    // 2. Delete the organization. FKs cascade to products, customers,
    //    movements, expenses, receipts, service_orders, purchase_list_items,
    //    product_references, app_settings, profiles, subscription_history.
    const { error } = await supabaseAdmin.from("organizations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    // 3. Remove auth users that belonged only to this org (best-effort).
    for (const uid of userIds) {
      try {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch (e) {
        console.error("[deleteOrganization] failed to delete auth user", uid, e);
      }
    }

    return { ok: true };
  });


export const getOrgAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ organization_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // find admins of that org
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, email")
      .eq("organization_id", data.organization_id);
    if (!profs?.length) return { admin: null };
    const userIds = profs.map((p: any) => p.user_id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds)
      .eq("role", "admin");
    const adminId = roles?.[0]?.user_id;
    if (!adminId) return { admin: null };
    const prof = profs.find((p: any) => p.user_id === adminId);
    const email: string = prof?.email ?? "";
    const nickname = email.includes("@") ? email.split("@")[0] : email;
    return {
      admin: {
        user_id: adminId,
        email,
        nickname,
        display_name: prof?.display_name ?? "",
      },
    };
  });

export const resetOrgAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      organization_id: z.string().uuid(),
      new_password: z.string().min(6, "Senha precisa de pelo menos 6 caracteres"),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("organization_id", data.organization_id);
    const userIds = (profs ?? []).map((p: any) => p.user_id);
    if (!userIds.length) throw new Error("Nenhum usuário encontrado nessa organização");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("user_id", userIds)
      .eq("role", "admin");
    const adminId = roles?.[0]?.user_id;
    if (!adminId) throw new Error("Admin dessa organização não encontrado");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(adminId, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SubscriptionSchema = z.object({
  organization_id: z.string().uuid(),
  plan: z.enum(["trial", "monthly", "semiannual", "annual", "free_lifetime"]),
  status: z.enum(["trial", "active", "expired", "blocked"]),
  expires_at: z.string().nullable().optional(),
  blocked_reason: z.string().nullable().optional(),
});

export const updateOrganizationSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SubscriptionSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // Use the authenticated user's client (RLS allows super_admin to update
    // organizations and insert subscription_history). This avoids requiring
    // SUPABASE_SERVICE_ROLE_KEY, which is not always available in every
    // deployment environment (e.g. Vercel unless manually configured).
    const db = context.supabase;

    const { data: current } = await db
      .from("organizations")
      .select("subscription_plan, subscription_status, subscription_expires_at")
      .eq("id", data.organization_id)
      .single();

    const patch = {
      subscription_plan: data.plan,
      subscription_status: data.status,
      subscription_expires_at: data.plan === "free_lifetime" ? null : (data.expires_at ?? null),
      blocked_reason: data.status === "blocked" ? (data.blocked_reason ?? "Bloqueado pelo Super Admin") : null,
      blocked_at: data.status === "blocked" ? new Date().toISOString() : null,
    };

    const { data: updated, error } = await db
      .from("organizations")
      .update(patch)
      .eq("id", data.organization_id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await db.from("subscription_history").insert({
      organization_id: data.organization_id,
      changed_by: context.userId,
      action: "super_admin_update",
      old_plan: current?.subscription_plan ?? null,
      new_plan: data.plan,
      old_status: current?.subscription_status ?? null,
      new_status: data.status,
      old_expires_at: current?.subscription_expires_at ?? null,
      new_expires_at: patch.subscription_expires_at,
      reason: data.blocked_reason ?? null,
    });

    return updated;
  });


