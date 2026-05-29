const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const payload = await req.json()
    console.log("Hook payload:", JSON.stringify(payload, null, 2))

    const { user, email_data } = payload
    const { email_action_type, confirmation_url, token } = email_data

    let subject: string
    let html: string

    switch (email_action_type) {
      case "signup":
        subject = "Confirm your EPA 608 Practice Test account"
        html = `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #1e40af; font-size: 24px;">Welcome to EPA 608 Practice Test!</h1>
            <p>Click the button below to confirm your email and start practicing:</p>
            <a href="${confirmation_url}"
               style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              Confirm Email
            </a>
            <p style="color: #666; font-size: 14px;">Or enter this code: <strong>${token}</strong></p>
            <p style="color: #999; font-size: 12px;">If you didn't create this account, you can ignore this email.</p>
          </div>`
        break

      case "recovery":
        subject = "Reset your EPA 608 Practice Test password"
        html = `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #1e40af; font-size: 24px;">Password Reset</h1>
            <p>Click the button below to reset your password:</p>
            <a href="${confirmation_url}"
               style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              Reset Password
            </a>
            <p style="color: #999; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
          </div>`
        break

      default:
        subject = "EPA 608 Practice Test"
        html = `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <p>Click the link below:</p>
            <a href="${confirmation_url}">Verify</a>
          </div>`
    }

    // Send via Resend HTTP API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EPA 608 Practice Test <onboarding@resend.dev>",
        to: [user.email],
        subject,
        html,
      }),
    })

    const result = await res.json()
    console.log("Resend result:", JSON.stringify(result))

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Hook error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
