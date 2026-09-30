// Issues a short-lived Gemini Live token for voice translation in one room.
// The browser connects to Gemini directly with it, so GEMINI_API_KEY never leaves the server.
// The token is locked to the translate model and the requested target language.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenAI, Modality } from "npm:@google/genai@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIVE_MODEL = "gemini-3.5-live-translate-preview";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let roomId: string | undefined;
  let target: string | undefined;
  try {
    ({ room_id: roomId, target_language: target } = await req.json());
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!roomId || !target || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(target)) {
    return json({ error: "room_id and a valid target_language are required" }, 400);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "Voice translation is not configured" }, 503);

  // Only members of the room get a token
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);
  const { data: member } = await asUser
    .from("participants")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return json({ error: "Not a member of this room" }, 403);

  // The paid engine is for VIP members, unless the admin opened it to everyone (or switched it off)
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: access } = await admin.from("app_settings").select("value").eq("key", "vip_access").maybeSingle();
  const mode = access?.value ?? "members";
  if (mode === "off") return json({ error: "vip_off" }, 403);
  // Talk time left for users without a running package: the token cannot outlive it
  let sessionMs = 30 * 60 * 1000;
  if (mode !== "everyone") {
    const { data: membership } = await admin
      .from("memberships")
      .select("vip_until, vip_seconds")
      .eq("user_id", user.id)
      .maybeSingle();
    const hasPackage = !!membership?.vip_until && new Date(membership.vip_until) > new Date();
    const talkSeconds = membership?.vip_seconds ?? 0;
    if (!hasPackage && talkSeconds <= 0) return json({ error: "vip_required" }, 403);
    if (!hasPackage) sessionMs = Math.min(sessionMs, (talkSeconds + 30) * 1000);
  }

  const config = {
    responseModalities: [Modality.AUDIO],
    translationConfig: { targetLanguageCode: target, echoTargetLanguage: false },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + sessionMs).toISOString(),
        newSessionExpireTime: new Date(Date.now() + Math.min(60 * 1000, sessionMs)).toISOString(),
        liveConnectConstraints: { model: LIVE_MODEL, config },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    return json({ token: token.name, model: LIVE_MODEL, config });
  } catch (err) {
    console.error("Token creation failed:", err instanceof Error ? err.message : err);
    return json({ error: "Could not start voice translation" }, 502);
  }
});
