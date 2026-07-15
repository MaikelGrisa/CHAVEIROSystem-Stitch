import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const NICKNAME_DOMAIN = "chaveirotop.local";

function nicknameToEmail(nickname: string) {
  return `${nickname.trim().toLowerCase()}@${NICKNAME_DOMAIN}`;
}

export const createUserByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nickname: string; password: string; makeAdmin?: boolean }) => {
    const nickname = String(input?.nickname ?? "").trim();
    const password = String(input?.password ?? "");
    if (!nickname || !/^[a-zA-Z0-9._-]{2,32}$/.test(nickname)) {
      throw new Error("Usuário inválido (use letras, números, ponto, hífen ou underscore — 2 a 32 caracteres)");
    }
    if (password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");
    return { nickname, password, makeAdmin: !!input?.makeAdmin };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const email = nicknameToEmail(data.nickname);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.nickname, nickname: data.nickname },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Falha ao criar usuário");

    await supabaseAdmin.from("profiles").update({
      display_name: data.nickname,
      provider: "nickname",
      approved: true,
    }).eq("user_id", newId);

    if (data.makeAdmin) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: newId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    }

    return { ok: true, userId: newId };
  });

export const setUserPasswordByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    const userId = String(input?.userId ?? "").trim();
    const password = String(input?.password ?? "");
    if (!userId) throw new Error("Usuário inválido");
    if (password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");
    return { userId, password };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
