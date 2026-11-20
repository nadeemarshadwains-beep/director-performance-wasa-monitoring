import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN");
const corsHeaders = {
  ...(appOrigin ? { "Access-Control-Allow-Origin": appOrigin } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization");
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !projectUrl || !anonKey || !serviceRoleKey || !appOrigin) {
    return response({ error: "The function is not configured correctly." }, 500);
  }

  const callerClient = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return response({ error: "Sign in is required." }, 401);

  const adminClient = createClient(projectUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerIsAdmin, error: authorizationError } = await callerClient.rpc("is_admin");
  if (authorizationError) {
    return response({ error: "Could not verify administrator permissions." }, 500);
  }
  if (callerIsAdmin !== true) {
    return response({ error: "Administrator permission is required." }, 403);
  }

  let input: { full_name?: unknown; email?: unknown };
  try {
    input = await request.json();
  } catch {
    return response({ error: "Request body must be valid JSON." }, 400);
  }
  const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (fullName.length < 2 || fullName.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response({ error: "Provide a valid Director name and email address." }, 400);
  }

  const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, app_role: "director" },
  });
  if (inviteError || !invitation.user) {
    return response({ error: inviteError?.message ?? "Could not invite this user." }, 400);
  }

  const { data: director, error: directorError } = await callerClient
    .from("directors")
    .insert({ full_name: fullName, email, auth_user_id: invitation.user.id })
    .select("id")
    .single();
  if (directorError || !director) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(invitation.user.id);
    const message = directorError?.message ?? "Could not create Director record.";
    return response({ error: cleanupError ? `${message} Invitation cleanup failed: ${cleanupError.message}` : message }, cleanupError ? 500 : 400);
  }

  const { error: insertProfileError } = await callerClient.from("profiles").insert({
    id: invitation.user.id,
    full_name: fullName,
    role: "director",
    director_id: director.id,
  });
  if (insertProfileError) {
    const { error: cleanupDirectorError } = await callerClient.from("directors").delete().eq("id", director.id);
    const { error: cleanupUserError } = await adminClient.auth.admin.deleteUser(invitation.user.id);
    const cleanupErrors = [cleanupDirectorError?.message, cleanupUserError?.message].filter(Boolean);
    const suffix = cleanupErrors.length ? ` Cleanup failed: ${cleanupErrors.join("; ")}` : "";
    return response({ error: `${insertProfileError.message}${suffix}` }, cleanupErrors.length ? 500 : 400);
  }

  return response({ director_id: director.id, email });
});
