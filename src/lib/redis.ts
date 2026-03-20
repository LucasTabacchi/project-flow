import "server-only";

// Upstash Redis via REST API — sin conexión persistente, compatible con Vercel serverless.
// Variables requeridas: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN

function getConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  };
}

export function isRedisConfigured(): boolean {
  const { url, token } = getConfig();
  return Boolean(url && token);
}

async function cmd<T = unknown>(args: unknown[]): Promise<T | null> {
  const { url, token } = getConfig();
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      // No cache — siempre queremos datos frescos
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json() as { result: T };
    return data.result;
  } catch {
    return null;
  }
}

// Publica un mensaje en un canal (para notificar a otras instancias)
export async function redisPublish(channel: string, message: string): Promise<void> {
  await cmd(["PUBLISH", channel, message]);
}

// Guarda el timestamp del último evento de un tablero
// Todas las instancias pueden leer esto para detectar eventos nuevos
export async function redisSetBoardEvent(
  boardId: string,
  eventJson: string,
): Promise<void> {
  const key = `board_event:${boardId}`;
  // SETEX con TTL de 60s — si nadie lo lee en 60s, se limpia solo
  await cmd(["SETEX", key, 60, eventJson]);
}

export async function redisGetBoardEvent(boardId: string): Promise<string | null> {
  return cmd<string>(["GET", `board_event:${boardId}`]);
}

// Incr es atómico — lo usamos para generar un "revision counter" por tablero
// Cada vez que hay un evento, el contador sube. Los clientes comparan su contador
// con el de Redis para saber si perdieron algún evento entre instancias.
export async function redisIncrBoardRevision(boardId: string): Promise<number> {
  const key = `board_rev:${boardId}`;
  // INCR + EXPIRE 300s (5 min sin actividad = se limpia)
  const [rev] = await Promise.all([
    cmd<number>(["INCR", key]),
    cmd(["EXPIRE", key, 300]),
  ]);
  return rev ?? 0;
}

export async function redisGetBoardRevision(boardId: string): Promise<number> {
  const result = await cmd<string>(["GET", `board_rev:${boardId}`]);
  return result ? parseInt(result, 10) : 0;
}
