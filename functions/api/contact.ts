interface Env {
  AZURE_CONTACT_URL: string;
  CONTACT_FORM_SECRET: string;
}

export const onRequestPost = async (ctx: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const res = await fetch(ctx.env.AZURE_CONTACT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": ctx.env.CONTACT_FORM_SECRET,
    },
    body: ctx.request.body,
  });

  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
};
