import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .in("role", ["admin", "super_admin"]);
      if (active) setIsAdmin(!!data && data.length > 0);
    })();
    return () => { active = false; };
  }, []);
  return isAdmin;
}

export function useIsSuperAdmin() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (active) setIs(!!data);
    })();
    return () => { active = false; };
  }, []);
  return is;
}
