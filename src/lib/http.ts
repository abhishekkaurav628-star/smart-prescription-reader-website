export const json = (data: unknown, status = 200) => Response.json(data, { status });

export const unauthorized = () => Response.json({ error: "Please sign in to continue." }, { status: 401 });

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

export const notFound = (error = "Not found") => Response.json({ error }, { status: 404 });

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
