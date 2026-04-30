import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@blinkdotnew/sdk";
import { sendWebPush } from "./web-push";

const app = new Hono();
app.use("*", cors());

function getBlink(env: Record<string, string>) {
  return createClient({
    projectId: env.BLINK_PROJECT_ID,
    secretKey: env.BLINK_SECRET_KEY,
  });
}

/* ----------------------------------------------------------------
   Helpers
---------------------------------------------------------------- */

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a Google Calendar URL from entry details */
function buildGoogleCalUrl(entry: {
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  name: string;
  role: string;
  notes?: string | null;
}): string {
  const title = "Breath Group - " + entry.name + " (" + (entry.role === "breather" ? "Breather" : "Sitter") + ")";
  const start = entry.date.replace(/-/g, "") + "T" + entry.startTime.replace(/:/g, "") + "00";
  const end = entry.date.replace(/-/g, "") + "T" + entry.endTime.replace(/:/g, "") + "00";
  const details = "Role: " + (entry.role === "breather" ? "Breather" : "Sitter") + (entry.notes ? "\nNotes: " + entry.notes : "") + "\n\nScheduled via Breath Group";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: start + "/" + end,
    details: details,
    ctz: entry.timezone || "UTC",
  });
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

/** Build a polished HTML email for Breath Group notifications */
function buildEmailHtml(p: {
  message: string;
  type: string;
  entry?: {
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
    name: string;
    role: string;
    notes?: string | null;
  } | null;
  calendarUrl?: string | null;
  attendees?: { name: string; email: string }[];
  viewUrl?: string | null;
}): string {
  function fmtTime(t: string): string {
    const parts = t.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return h12 + ":" + (m < 10 ? "0" + m : "" + m) + " " + ampm;
  }
  function fmtDate(d: string): string {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  let entryHtml = "";
  if (p.entry) {
    const roleColor = p.entry.role === "breather" ? "#CC5A28" : "#4B8661";
    const roleLabel = p.entry.role === "breather" ? "Breather" : "Sitter";

    // Build attendees list HTML
    let attendeesHtml = "";
    if (p.attendees && p.attendees.length > 0) {
      const listItems = p.attendees
        .map(
          (a) =>
            '<li style="padding:3px 0;color:#7C6B5D;font-size:12px;">&#8226; ' +
            a.name +
            "</li>",
        )
        .join("");
      attendeesHtml =
        '<tr><td style="padding-top:10px;">' +
        '<p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#B8A99A;">' +
        "Breathers attending (" + p.attendees.length + ")" +
        "</p>" +
        '<ul style="margin:0;padding:0;list-style:none;">' +
        listItems +
        "</ul>" +
        "</td></tr>";
    } else if (p.entry.role === "sitter") {
      attendeesHtml =
        '<tr><td style="padding-top:10px;">' +
        '<p style="margin:0;font-size:12px;color:#B8A99A;font-style:italic;">No breathers have joined yet.</p>' +
        "</td></tr>";
    }

    entryHtml =
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">' +
      "<tr><td style=\"background:#F6ECE0;border-radius:8px;padding:16px;\">" +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      "<tr><td style=\"padding-bottom:8px;\">" +
      '<span style="display:inline-block;background:' + roleColor + ";color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:3px 10px;border-radius:12px;\">" +
      roleLabel +
      "</span></td></tr>" +
      '<tr><td style="color:#4B3B30;font-size:15px;font-weight:600;padding-bottom:4px;">' +
      p.entry.name +
      "</td></tr>" +
      '<tr><td style="color:#7C6B5D;font-size:13px;">' +
      "&#128197; " + fmtDate(p.entry.date) + "<br/>" +
      "&#128336; " + fmtTime(p.entry.startTime) + " - " + fmtTime(p.entry.endTime) +
      "</td></tr>" +
      (p.entry.notes
        ? '<tr><td style="color:#7C6B5D;font-size:12px;padding-top:6px;font-style:italic;">' +
          p.entry.notes +
          "</td></tr>"
        : "") +
      attendeesHtml +
      "</table></td></tr></table>";
  }

  // View CTA button
  let viewBtn = "";
  if (p.viewUrl) {
    viewBtn =
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">' +
      '<tr><td align="center">' +
      '<a href="' + p.viewUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#CC5A28;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">' +
      "&#128279; View Session" +
      "</a></td></tr></table>";
  }

  let calBtn = "";
  if (p.calendarUrl) {
    calBtn =
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">' +
      '<tr><td align="center">' +
      '<a href="' + p.calendarUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#4B8661;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">' +
      "&#128197; Add to Google Calendar" +
      "</a></td></tr></table>";
  }

  return (
    '<div style="font-family:DM Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    '<tr><td style="background:#CC5A28;padding:24px 28px;border-radius:10px 10px 0 0;">' +
    '<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">&#127788;&#65039; Breath Group</span>' +
    "</td></tr>" +
    '<tr><td style="background:#FBF8F4;padding:28px;border:1px solid #F6ECE0;border-top:none;border-radius:0 0 10px 10px;">' +
    '<p style="color:#4B3B30;font-size:15px;line-height:1.65;margin:0 0 4px;">' +
    p.message +
    "</p>" +
    entryHtml +
    viewBtn +
    calBtn +
    '<p style="color:#B8A99A;font-size:12px;line-height:1.5;margin:20px 0 0;padding-top:16px;border-top:1px solid #F0E6D9;">' +
    "You're receiving this because you're a member of Breath Group." +
    "</p>" +
    "</td></tr></table></div>"
  );
}

/** Build a dedicated password reset email using the same branding */
function buildPasswordResetEmail(resetUrl: string): string {
  return (
    '<div style="font-family:DM Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    '<tr><td style="background:#CC5A28;padding:24px 28px;border-radius:10px 10px 0 0;">' +
    '<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">&#127788;&#65039; Breath Group</span>' +
    "</td></tr>" +
    '<tr><td style="background:#FBF8F4;padding:28px;border:1px solid #F6ECE0;border-top:none;border-radius:0 0 10px 10px;">' +
    '<p style="color:#4B3B30;font-size:15px;line-height:1.65;margin:0 0 20px;">' +
    "We received a request to reset the password for your Breath Group account. Click the button below to choose a new password." +
    "</p>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">' +
    '<tr><td align="center">' +
    '<a href="' + resetUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#CC5A28;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">' +
    "&#128273; Reset Password" +
    "</a></td></tr></table>" +
    '<p style="color:#B8A99A;font-size:12px;text-align:center;margin:0 0 20px;">This link expires in 1 hour. If you didn\u2019t request a password reset, you can safely ignore this email.</p>' +
    '<p style="color:#B8A99A;font-size:12px;line-height:1.5;margin:20px 0 0;padding-top:16px;border-top:1px solid #F0E6D9;">' +
    "You\u2019re receiving this because you\u2019re a member of Breath Group." +
    "</p>" +
    "</td></tr></table></div>"
  );
}

/** Create a notification row + send email to recipient */
async function createNotification(
  blink: ReturnType<typeof getBlink>,
  params: {
    userId: string;
    type: string;
    entryId?: string;
    actorName: string;
    actorEmail?: string;
    message: string;
  },
  env: Record<string, string> = {},
) {
  const notif = await blink.db.notifications.create({
    id: genId("ntf"),
    userId: params.userId,
    type: params.type,
    entryId: params.entryId ?? null,
    actorName: params.actorName,
    actorEmail: params.actorEmail ?? null,
    message: params.message,
    read: 0,
    createdAt: new Date().toISOString(),
  });

  // Try to send email - non-fatal if it fails
  try {
    const users = await blink.db.users.list();
    const recipient = (users as { id: string; email: string }[]).find(
      (u) => u.id === params.userId,
    );
    if (recipient?.email) {
      // Fetch entry details for calendar link
      let entryData: {
        date: string;
        startTime: string;
        endTime: string;
        timezone: string;
        name: string;
        role: string;
        notes?: string | null;
      } | null = null;

      let entryAttendees: { name: string; email: string }[] = [];

      if (params.entryId) {
        try {
          const entries = await blink.db.availabilityEntries.list();
          const found = (entries as any[]).find(
            (e: any) => e.id === params.entryId,
          );
          if (found) {
            entryData = {
              date: found.date,
              startTime: found.startTime,
              endTime: found.endTime,
              timezone: found.timezone || "UTC",
              name: found.name,
              role: found.role,
              notes: found.notes,
            };
          }
        } catch (_e) {
          // non-fatal
        }

        // Always fetch attendees for the session card
        try {
          const allAttendees = await blink.db.sessionAttendees.list();
          entryAttendees = (allAttendees as any[])
            .filter((a: any) => a.entryId === params.entryId)
            .map((a: any) => ({ name: a.name, email: a.email }));
        } catch (_e) {
          // non-fatal
        }
      }

      const appBaseUrl = "https://breath-scheduler.blinkpowered.com";
      const viewUrl = params.entryId
        ? `${appBaseUrl}/?entry=${params.entryId}`
        : null;

      const showCalendar = entryData && params.type !== "attendee_left";
      const calendarUrl = showCalendar ? buildGoogleCalUrl(entryData!) : null;

      await sendEmail(blink, {
        to: recipient.email,
        subject: "Breath Group: " + params.message,
        html: buildEmailHtml({
          message: params.message,
          type: params.type,
          entry: entryData,
          calendarUrl: calendarUrl,
          attendees: entryAttendees,
          viewUrl: viewUrl,
        }),
        text: params.message,
        type: "session_event",
      });
    }
  } catch (emailErr) {
    console.error("[notify] email send failed (non-fatal)", emailErr);
  }

  // Fire-and-forget push notification to the user
  try {
    await sendPushToUser(blink, params.userId, params.message, env);
  } catch (pushErr) {
    console.error("[notify] push send failed (non-fatal)", pushErr);
  }

  return notif;
}

/** Send web push notifications to all subscriptions for a user */
async function sendPushToUser(
  blink: ReturnType<typeof getBlink>,
  userId: string,
  message: string,
  env: Record<string, string>,
) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    console.warn("[push] VAPID keys not configured, skipping push");
    return;
  }

  const all = await blink.db.pushSubscriptions.list();
  const subs = (all as any[]).filter((s: any) => s.userId === userId);
  if (subs.length === 0) return;

  const vapid = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };

  const payload = JSON.stringify({
    title: "Breath Group",
    body: message,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });

  const results = await Promise.allSettled(
    subs.map((sub: any) =>
      sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapid,
      )
    ),
  );

  // Clean up expired / gone subscriptions
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && (r.value.status === 410 || r.value.status === 404)) {
      try {
        await blink.db.pushSubscriptions.delete(subs[i].id);
        console.log("[push] removed expired subscription", subs[i].id);
      } catch (_e) {
        // non-fatal
      }
    }
  }
}

app.get("/health", (c) => c.json({ ok: true }));

/* ----------------------------------------------------------------
   Email log helper — wraps blink.notifications.email with DB logging
---------------------------------------------------------------- */

async function sendEmail(
  blink: ReturnType<typeof getBlink>,
  params: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    type: string;       // e.g. "welcome" | "session_event" | "access_request" | "resend_welcome" | "admin_notify"
    memberId?: string;  // optional, for traceability
  },
): Promise<void> {
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  for (const toEmail of recipients) {
    const logId = genId("eml");
    try {
      await blink.notifications.email({
        to: toEmail,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      // Log success (non-fatal)
      blink.db.emailLog.create({
        id: logId,
        sentAt: new Date().toISOString(),
        toEmail,
        subject: params.subject,
        type: params.type,
        status: "sent",
        error: null,
        memberId: params.memberId ?? null,
      }).catch((e: any) => console.error("[email-log] log write failed", e));
    } catch (err: any) {
      // Log failure (non-fatal)
      blink.db.emailLog.create({
        id: logId,
        sentAt: new Date().toISOString(),
        toEmail,
        subject: params.subject,
        type: params.type,
        status: "failed",
        error: String(err?.message ?? err ?? "unknown error").slice(0, 500),
        memberId: params.memberId ?? null,
      }).catch((e: any) => console.error("[email-log] log write failed", e));
      throw err; // re-throw so callers can handle
    }
  }
}

/* ----------------------------------------------------------------
   Email log — read endpoint
---------------------------------------------------------------- */

app.get("/api/email-log", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const all = await blink.db.emailLog.list({ orderBy: { sentAt: "desc" } });
    return c.json((all as any[]).slice(0, 500));
  } catch (err: any) {
    return c.json({ error: err?.message ?? "email log fetch failed" }, 500);
  }
});



app.get("/api/notifications", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "userId required" }, 400);
    const all = await blink.db.notifications.list({
      orderBy: { createdAt: "desc" },
    });
    const filtered = (all as { userId: string }[]).filter(
      (n) => n.userId === userId,
    );
    return c.json(filtered.slice(0, 50));
  } catch (err: any) {
    return c.json({ error: err?.message ?? "list notifications failed" }, 500);
  }
});

app.patch("/api/notifications/:id/read", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");
    const updated = await blink.db.notifications.update(id, { read: 1 });
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err?.message ?? "mark read failed" }, 500);
  }
});

app.post("/api/notifications/mark-all-read", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const { userId } = await c.req.json();
    if (!userId) return c.json({ error: "userId required" }, 400);
    const all = await blink.db.notifications.list();
    const unread = (
      all as { id: string; userId: string; read: number }[]
    ).filter((n) => n.userId === userId && Number(n.read) === 0);
    await Promise.all(
      unread.map((n) => blink.db.notifications.update(n.id, { read: 1 })),
    );
    return c.json({ ok: true, count: unread.length });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "mark all read failed" }, 500);
  }
});

/* ----------------------------------------------------------------
   Availability entries - writes
---------------------------------------------------------------- */

app.post("/api/entries", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const body = await c.req.json();
    const entry = await blink.db.availabilityEntries.create(body);

    // If a sitter entry is created, check if it overlaps any breather entries
    // and notify those breather owners
    if (body.role === "sitter" && body.date && body.startTime && body.endTime) {
      try {
        const allEntries = await blink.db.availabilityEntries.list();
        const breathers = (
          allEntries as {
            id: string;
            role: string;
            date: string;
            startTime: string;
            endTime: string;
            userId: string | null;
            name: string;
            email: string;
          }[]
        ).filter(
          (e) =>
            e.role === "breather" &&
            e.date === body.date &&
            e.startTime < body.endTime &&
            body.startTime < e.endTime &&
            e.userId &&
            e.userId !== body.userId,
        );

        const sitterName = body.name || "Someone";
        for (const breather of breathers) {
          await createNotification(blink, {
            userId: breather.userId!,
            type: "sitter_created",
            entryId: (entry as { id: string }).id,
            actorName: sitterName,
            actorEmail: body.email,
            message:
              sitterName +
              " created a sitter session covering your breather slot on " +
              body.date,
          }, c.env as Record<string, string>);
        }
      } catch (notifErr) {
        console.error(
          "[notify] sitter_created notification failed",
          notifErr,
        );
      }
    }

    return c.json(entry);
  } catch (err: any) {
    return c.json({ error: err?.message ?? "create failed" }, 500);
  }
});

app.patch("/api/entries/:id", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");
    const body = await c.req.json();
    const entry = await blink.db.availabilityEntries.update(id, body);
    return c.json(entry);
  } catch (err: any) {
    return c.json({ error: err?.message ?? "update failed" }, 500);
  }
});

app.delete("/api/entries/:id", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");
    await blink.db.availabilityEntries.delete(id);
    return c.json({ ok: true });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "delete failed" }, 500);
  }
});

/* ----------------------------------------------------------------
   Session attendees - writes (with notification triggers)
---------------------------------------------------------------- */

app.post("/api/attendees", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const body = await c.req.json();
    const attendee = await blink.db.sessionAttendees.create(body);

    // Notify the sitter owner that a breather joined
    try {
      const entries = await blink.db.availabilityEntries.list();
      const entry = (
        entries as {
          id: string;
          userId: string | null;
          name: string;
          date: string;
        }[]
      ).find((e) => e.id === body.entryId);

      if (entry?.userId) {
        const joinerName = body.name || "Someone";
        await createNotification(blink, {
          userId: entry.userId,
          type: "attendee_joined",
          entryId: body.entryId,
          actorName: joinerName,
          actorEmail: body.email,
          message:
            joinerName + " joined your sitter session on " + entry.date,
        }, c.env as Record<string, string>);
      }
    } catch (notifErr) {
      console.error(
        "[notify] attendee_joined notification failed",
        notifErr,
      );
    }

    return c.json(attendee);
  } catch (err: any) {
    return c.json(
      { error: err?.message ?? "create attendee failed" },
      500,
    );
  }
});

app.delete("/api/attendees/:id", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");

    // Look up the attendee before deleting to get info for notification
    let attendeeInfo: {
      entryId: string;
      name: string;
      email: string;
    } | null = null;
    try {
      const allAttendees = await blink.db.sessionAttendees.list();
      attendeeInfo =
        (
          allAttendees as {
            id: string;
            entryId: string;
            name: string;
            email: string;
          }[]
        ).find((a) => a.id === id) ?? null;
    } catch (_e2) {
      // non-fatal
    }

    await blink.db.sessionAttendees.delete(id);

    // Notify the sitter owner that a breather left
    if (attendeeInfo) {
      try {
        const entries = await blink.db.availabilityEntries.list();
        const entry = (
          entries as {
            id: string;
            userId: string | null;
            name: string;
            date: string;
          }[]
        ).find((e) => e.id === attendeeInfo!.entryId);

        if (entry?.userId) {
          const leaverName = attendeeInfo.name || "Someone";
          await createNotification(blink, {
            userId: entry.userId,
            type: "attendee_left",
            entryId: attendeeInfo.entryId,
            actorName: leaverName,
            actorEmail: attendeeInfo.email,
            message:
              leaverName + " left your sitter session on " + entry.date,
          }, c.env as Record<string, string>);
        }
      } catch (notifErr) {
        console.error(
          "[notify] attendee_left notification failed",
          notifErr,
        );
      }
    }

    return c.json({ ok: true });
  } catch (err: any) {
    return c.json(
      { error: err?.message ?? "delete attendee failed" },
      500,
    );
  }
});

/* ----------------------------------------------------------------
   App members - writes
---------------------------------------------------------------- */

app.post("/api/members", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const body = await c.req.json();
    const member = await blink.db.appMembers.create(body);
    return c.json(member);
  } catch (err: any) {
    return c.json({ error: err?.message ?? "create member failed" }, 500);
  }
});

app.patch("/api/members/:id", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");
    const body = await c.req.json();
    const member = await blink.db.appMembers.update(id, body);
    return c.json(member);
  } catch (err: any) {
    return c.json({ error: err?.message ?? "update member failed" }, 500);
  }
});

/** POST /api/members/:id/resend-welcome — resend the welcome email to an existing member */
app.post("/api/members/:id/resend-welcome", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");

    const allMembers = await blink.db.appMembers.list();
    const member = (allMembers as { id: string; email: string; status: string; displayName?: string | null; welcomeEmailCount?: number }[])
      .find((m) => m.id === id);

    if (!member) return c.json({ error: "not_found" }, 404);
    if (member.status === "blocked") return c.json({ error: "member_blocked" }, 403);

    const firstName = member.displayName ? member.displayName.split(" ")[0] : null;
    const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
    const html = buildRequestEmailHtml({
      headerText: "Welcome to Breath Group! 🌬️",
      bodyHtml:
        `${greeting}<br/><br/>Your access to the Breath Group Scheduler has been confirmed! 🎉<br/>You can sign in anytime to submit your availability for sessions.`,
      primaryBtnText: "Sign In Now",
      primaryBtnUrl: `${APP_BASE_URL}/`,
      footerText: "You're receiving this because you're a member of Breath Group.",
    });

    const text =
      `${greeting}\n\n` +
      "Your access to the Breath Group Scheduler has been confirmed!\n\n" +
      `Sign in here: ${APP_BASE_URL}/\n\n` +
      "You're receiving this because you're a member of Breath Group.";

    await sendEmail(blink, {
      to: member.email,
      subject: firstName
        ? `Welcome, ${firstName}! Your Breath Group access is confirmed`
        : "Welcome to Breath Group! Your access is confirmed",
      html,
      text,
      type: "resend_welcome",
      memberId: id,
    });

    // Increment send counter
    const newCount = (Number(member.welcomeEmailCount) || 0) + 1;
    await blink.db.appMembers.update(id, { welcomeEmailCount: newCount });

    return c.json({ ok: true, welcomeEmailCount: newCount });
  } catch (err: any) {
    console.error("[members] resend-welcome error", err);
    return c.json({ error: err?.message ?? "resend failed" }, 500);
  }
});

app.delete("/api/members/:id", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");
    // Also cascade-delete their entries and attendees
    const { userId } = (await c.req.json().catch(() => ({}))) as {
      userId?: string;
    };
    if (userId) {
      const entries = await blink.db.availabilityEntries.list({
        where: { userId },
      });
      for (const entry of entries as { id: string }[]) {
        const attendees = await blink.db.sessionAttendees.list({
          where: { entryId: entry.id },
        });
        for (const a of attendees as { id: string }[]) {
          await blink.db.sessionAttendees.delete(a.id);
        }
        await blink.db.availabilityEntries.delete(entry.id);
      }
    }
    await blink.db.appMembers.delete(id);
    return c.json({ ok: true });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "delete member failed" }, 500);
  }
});

/* ----------------------------------------------------------------
   Member self-service requests
---------------------------------------------------------------- */

const ADMIN_EMAIL = "thierrya@breathe-today.life";
const APP_BASE_URL = "https://breathe-today.life";
const BACKEND_BASE_URL = "https://60lyovrv.backend.blink.new";

function buildRequestEmailHtml(opts: {
  headerText: string;
  bodyHtml: string;
  primaryBtnText: string;
  primaryBtnUrl: string;
  secondaryBtnText?: string;
  secondaryBtnUrl?: string;
  footerText: string;
}): string {
  const primaryBtn =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">' +
    '<tr><td align="center">' +
    '<a href="' + opts.primaryBtnUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#CC5A28;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">' +
    opts.primaryBtnText +
    "</a></td></tr></table>";

  const secondaryBtn = opts.secondaryBtnText && opts.secondaryBtnUrl
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;">' +
      '<tr><td align="center">' +
      '<a href="' + opts.secondaryBtnUrl + '" target="_blank" rel="noopener" style="display:inline-block;background:#9E9189;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;">' +
      opts.secondaryBtnText +
      "</a></td></tr></table>"
    : "";

  return (
    '<div style="font-family:DM Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    '<tr><td style="background:#CC5A28;padding:24px 28px;border-radius:10px 10px 0 0;">' +
    '<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">🌬️ Breath Group — ' + opts.headerText + "</span>" +
    "</td></tr>" +
    '<tr><td style="background:#FBF8F4;padding:28px;border:1px solid #F6ECE0;border-top:none;border-radius:0 0 10px 10px;">' +
    '<p style="color:#4B3B30;font-size:15px;line-height:1.65;margin:0 0 12px;">' +
    opts.bodyHtml +
    "</p>" +
    primaryBtn +
    secondaryBtn +
    '<p style="color:#B8A99A;font-size:12px;line-height:1.5;margin:20px 0 0;padding-top:16px;border-top:1px solid #F0E6D9;">' +
    opts.footerText +
    "</p>" +
    "</td></tr></table></div>"
  );
}

/** POST /api/member-requests — public, no auth needed */
app.post("/api/member-requests", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const body = await c.req.json();
    const rawEmail: string = (body.email ?? "").trim();
    const firstName: string = (body.firstName ?? "").trim();
    const lastName: string = (body.lastName ?? "").trim();

    // Validate email
    if (!rawEmail) {
      return c.json({ error: "email is required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return c.json({ error: "invalid email format" }, 400);
    }

    const email = rawEmail.toLowerCase();
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

    // Check for existing member with the same email
    const allMembers = await blink.db.appMembers.list();
    const existing = (allMembers as { email: string }[]).find(
      (m) => m.email.toLowerCase() === email,
    );
    if (existing) {
      return c.json({ error: "already_exists" }, 409);
    }

    // Create the new member record with status="requested"
    const memberId = genId("mbr");
    const member = await blink.db.appMembers.create({
      id: memberId,
      email,
      appRole: "member",
      capabilities: "both",
      status: "requested",
      userId: null,
      displayName,
      createdAt: new Date().toISOString(),
    });

    // Send notification email to ALL admins (non-fatal)
    try {
      const acceptUrl = `${BACKEND_BASE_URL}/api/member-requests/${memberId}/accept`;
      const declineUrl = `${BACKEND_BASE_URL}/api/member-requests/${memberId}/decline`;

      const nameLabel = displayName ? `<strong>${displayName}</strong> (${email})` : `<strong>${email}</strong>`;
      const html = buildRequestEmailHtml({
        headerText: "New Access Request",
        bodyHtml: nameLabel + " has requested access to the Breath Group Scheduler.",
        primaryBtnText: "✅ Accept Request",
        primaryBtnUrl: acceptUrl,
        secondaryBtnText: "❌ Decline",
        secondaryBtnUrl: declineUrl,
        footerText: "You're receiving this as admin of Breath Group.",
      });

      const nameText = displayName ? `${displayName} (${email})` : email;
      const text =
        `New access request from: ${nameText}\n\n` +
        `Accept: ${acceptUrl}\n` +
        `Decline: ${declineUrl}\n\n` +
        "You're receiving this as admin of Breath Group.";

      // Collect all admin emails; fall back to the hardcoded ADMIN_EMAIL if none found
      const adminEmails = (allMembers as { appRole: string; email: string; status: string }[])
        .filter((m) => m.appRole === "admin" && m.status === "active")
        .map((m) => m.email);
      if (!adminEmails.includes(ADMIN_EMAIL)) adminEmails.push(ADMIN_EMAIL);

      await sendEmail(blink, {
        to: adminEmails,
        subject: `New access request: ${nameText}`,
        html,
        text,
        type: "access_request",
        memberId: memberId,
      });
    } catch (emailErr) {
      console.error("[member-requests] admin email failed (non-fatal)", emailErr);
    }

    return c.json({ ok: true, id: (member as any).id }, 201);
  } catch (err: any) {
    return c.json({ error: err?.message ?? "member request failed" }, 500);
  }
});

/** GET /api/member-requests/:id/accept — admin clicks from email */
app.get("/api/member-requests/:id/accept", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");

    const allMembers = await blink.db.appMembers.list();
    const member = (
      allMembers as { id: string; email: string; status: string; displayName?: string | null }[]
    ).find((m) => m.id === id);

    if (!member) {
      return c.redirect(`${APP_BASE_URL}/?request=notfound`);
    }
    if (member.status !== "requested") {
      return c.redirect(`${APP_BASE_URL}/?request=already`);
    }

    // Approve the member
    await blink.db.appMembers.update(id, { status: "active" });

    // Send welcome email to member (non-fatal)
    try {
      const firstName = member.displayName ? member.displayName.split(" ")[0] : null;
      const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
      const html = buildRequestEmailHtml({
        headerText: "Welcome to Breath Group! 🌬️",
        bodyHtml:
          `${greeting}<br/><br/>Your access request has been approved! 🎉<br/>You can now sign in to the Breath Group Scheduler and start submitting your availability for sessions.`,
        primaryBtnText: "Sign In Now",
        primaryBtnUrl: `${APP_BASE_URL}/`,
        footerText: "You're receiving this because you requested access to Breath Group.",
      });

      const text =
        `${greeting}\n\n` +
        "Your access request has been approved!\n\n" +
        "You can now sign in to the Breath Group Scheduler:\n" +
        `${APP_BASE_URL}/\n\n` +
        "You're receiving this because you requested access to Breath Group.";

      await sendEmail(blink, {
        to: member.email,
        subject: firstName ? `Welcome, ${firstName}! Your Breath Group access is approved` : "Welcome to Breath Group! Your access is approved",
        html,
        text,
        type: "welcome",
        memberId: id,
      });

      // Increment send counter
      const currentCount = Number((member as any).welcomeEmailCount) || 0;
      await blink.db.appMembers.update(id, { welcomeEmailCount: currentCount + 1 });
    } catch (emailErr) {
      console.error("[member-requests] welcome email failed (non-fatal)", emailErr);
    }

    return c.redirect(`${APP_BASE_URL}/?request=accepted`);
  } catch (err: any) {
    console.error("[member-requests] accept error", err);
    return c.redirect(`${APP_BASE_URL}/?request=error`);
  }
});

/** POST /api/member-requests/:id/accept — admin accepts from the AdminPage UI (returns JSON) */
app.post("/api/member-requests/:id/accept", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");

    const allMembers = await blink.db.appMembers.list();
    const member = (
      allMembers as { id: string; email: string; status: string; displayName?: string | null }[]
    ).find((m) => m.id === id);

    if (!member) {
      return c.json({ error: "not_found" }, 404);
    }
    if (member.status !== "requested") {
      return c.json({ error: "already_processed" }, 409);
    }

    // Approve the member
    await blink.db.appMembers.update(id, { status: "active" });

    // Send welcome email (non-fatal)
    try {
      const firstName = member.displayName ? member.displayName.split(" ")[0] : null;
      const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
      const html = buildRequestEmailHtml({
        headerText: "Welcome to Breath Group! 🌬️",
        bodyHtml:
          `${greeting}<br/><br/>Your access request has been approved! 🎉<br/>You can now sign in to the Breath Group Scheduler and start submitting your availability for sessions.`,
        primaryBtnText: "Sign In Now",
        primaryBtnUrl: `${APP_BASE_URL}/`,
        footerText: "You're receiving this because you requested access to Breath Group.",
      });

      const text =
        `${greeting}\n\n` +
        "Your access request has been approved!\n\n" +
        "You can now sign in to the Breath Group Scheduler:\n" +
        `${APP_BASE_URL}/\n\n` +
        "You're receiving this because you requested access to Breath Group.";

      await sendEmail(blink, {
        to: member.email,
        subject: firstName ? `Welcome, ${firstName}! Your Breath Group access is approved` : "Welcome to Breath Group! Your access is approved",
        html,
        text,
        type: "welcome",
        memberId: id,
      });

      // Increment send counter
      const currentCount = Number((member as any).welcomeEmailCount) || 0;
      await blink.db.appMembers.update(id, { welcomeEmailCount: currentCount + 1 });
    } catch (emailErr) {
      console.error("[member-requests] welcome email failed (non-fatal)", emailErr);
    }

    return c.json({ ok: true });
  } catch (err: any) {
    console.error("[member-requests] accept (POST) error", err);
    return c.json({ error: err?.message ?? "accept failed" }, 500);
  }
});

/** GET /api/member-requests/:id/decline — admin clicks from email */
app.get("/api/member-requests/:id/decline", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const id = c.req.param("id");

    const allMembers = await blink.db.appMembers.list();
    const member = (
      allMembers as { id: string; email: string; status: string }[]
    ).find((m) => m.id === id);

    if (!member || member.status !== "requested") {
      return c.redirect(`${APP_BASE_URL}/?request=notfound`);
    }

    // Delete the member record
    await blink.db.appMembers.delete(id);

    return c.redirect(`${APP_BASE_URL}/?request=declined`);
  } catch (err: any) {
    console.error("[member-requests] decline error", err);
    return c.redirect(`${APP_BASE_URL}/?request=error`);
  }
});

/* ----------------------------------------------------------------
   Push subscriptions
---------------------------------------------------------------- */

app.post("/api/push/subscribe", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const { userId, endpoint, p256dh, auth } = await c.req.json();
    if (!userId || !endpoint)
      return c.json({ error: "userId and endpoint required" }, 400);

    // Check for existing subscription with same endpoint for this user
    const all = await blink.db.pushSubscriptions.list();
    const existing = (all as any[]).find(
      (s: any) => s.userId === userId && s.endpoint === endpoint,
    );

    if (existing) {
      await blink.db.pushSubscriptions.update(existing.id, {
        p256dh: p256dh || "",
        auth: auth || "",
      });
      return c.json({ ok: true, id: existing.id });
    }

    const sub = await blink.db.pushSubscriptions.create({
      id: genId("push"),
      userId,
      endpoint,
      p256dh: p256dh || "",
      auth: auth || "",
      createdAt: new Date().toISOString(),
    });
    return c.json({ ok: true, id: (sub as any).id });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "subscribe failed" }, 500);
  }
});

app.post("/api/push/unsubscribe", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const { userId, endpoint } = await c.req.json();
    if (!userId || !endpoint)
      return c.json({ error: "userId and endpoint required" }, 400);

    const all = await blink.db.pushSubscriptions.list();
    const matches = (all as any[]).filter(
      (s: any) => s.userId === userId && s.endpoint === endpoint,
    );
    for (const m of matches) {
      await blink.db.pushSubscriptions.delete(m.id);
    }
    return c.json({ ok: true, deleted: matches.length });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "unsubscribe failed" }, 500);
  }
});

app.get("/api/push/vapid-public-key", (c) => {
  const env = c.env as Record<string, string>;
  return c.json({ key: env.VAPID_PUBLIC_KEY || "" });
});

/* ----------------------------------------------------------------
   Analytics
---------------------------------------------------------------- */

app.get("/api/analytics", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);

    const [members, entries, attendees] = await Promise.all([
      blink.db.appMembers.list(),
      blink.db.availabilityEntries.list(),
      blink.db.sessionAttendees.list(),
    ]);

    const memberList = members as {
      id: string;
      status: string;
      appRole: string;
      createdAt: string;
    }[];
    const entryList = entries as {
      id: string;
      role: string;
      date: string;
      userId: string | null;
      recurringGroupId: string | null;
      createdAt: string;
    }[];
    const attendeeList = attendees as {
      id: string;
      entryId: string;
      createdAt: string;
    }[];

    const totalMembers = memberList.length;
    const activeMembers = memberList.filter((m) => m.status === "active").length;
    const adminMembers = memberList.filter((m) => m.appRole === "admin").length;

    const totalSessions = entryList.length;
    const sitterSessions = entryList.filter((e) => e.role === "sitter").length;
    const breatherSessions = entryList.filter((e) => e.role === "breather").length;

    // Sitter sessions with at least one breather
    const sitterEntryIds = new Set(entryList.filter((e) => e.role === "sitter").map((e) => e.id));
    const entryIdsWithAttendees = new Set(attendeeList.map((a) => a.entryId));
    const sitterSessionsWithAttendees = [...sitterEntryIds].filter((id) =>
      entryIdsWithAttendees.has(id),
    ).length;

    // Average attendees per sitter session (across all sitter sessions)
    const avgAttendeesPerSession =
      sitterSessions > 0
        ? Math.round((attendeeList.length / sitterSessions) * 10) / 10
        : 0;

    // Total attendee joins
    const totalAttendeeJoins = attendeeList.length;

    // Unique recurring series
    const recurringGroups = new Set(
      entryList.filter((e) => e.recurringGroupId).map((e) => e.recurringGroupId),
    ).size;

    // Sessions in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recentSessions = entryList.filter((e) => e.date >= thirtyDaysAgo).length;

    // Members joined in last 30 days
    const recentMembers = memberList.filter(
      (m) => m.createdAt && m.createdAt.slice(0, 10) >= thirtyDaysAgo,
    ).length;

    return c.json({
      members: {
        total: totalMembers,
        active: activeMembers,
        admins: adminMembers,
        recentJoins: recentMembers,
      },
      sessions: {
        total: totalSessions,
        sitter: sitterSessions,
        breather: breatherSessions,
        withAttendees: sitterSessionsWithAttendees,
        recurring: recurringGroups,
        last30Days: recentSessions,
      },
      attendees: {
        total: totalAttendeeJoins,
        avgPerSitterSession: avgAttendeesPerSession,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message ?? "analytics failed" }, 500);
  }
});

/* ----------------------------------------------------------------
   Password reset — styled email via our own template
---------------------------------------------------------------- */

app.post("/api/send-password-reset", async (c) => {
  try {
    const blink = getBlink(c.env as Record<string, string>);
    const { email } = await c.req.json();
    if (!email) return c.json({ error: "email required" }, 400);

    // Generate a reset token via Blink Auth (server-side, using secretKey)
    const { token } = await blink.auth.generatePasswordResetToken(email);

    // Build app-hosted reset URL so the user lands back on the site, not blink.new
    const appResetUrl = `https://breathe-today.life/?reset_token=${token}`;

    const html = buildPasswordResetEmail(appResetUrl);

    await sendEmail(blink, {
      to: email,
      subject: "Breath Group: Reset your password",
      html,
      text: `Reset your Breath Group password by visiting this link (expires in 1 hour):\n\n${appResetUrl}\n\nIf you didn't request a reset, ignore this email.`,
      type: "password_reset",
    });

    return c.json({ ok: true });
  } catch (err: any) {
    // Don't reveal if email exists or not
    console.error("[password-reset] failed", err?.message);
    return c.json({ ok: true }); // always return ok to prevent email enumeration
  }
});

export default app;
