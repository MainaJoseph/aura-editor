import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailHtml({
  inviterName,
  projectName,
  role,
  inviteUrl,
}: {
  inviterName?: string;
  projectName: string;
  role: string;
  inviteUrl: string;
}) {
  const roleLabel = role === "editor" ? "an Editor" : "a Viewer";
  const safeProjectName = escapeHtml(projectName);
  const safeInviteUrl = encodeURI(inviteUrl);
  const inviterLine = inviterName
    ? `<strong style="color: #e2e8f0;">${escapeHtml(inviterName)}</strong> has invited you to collaborate on`
    : `You've been invited to collaborate on`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Project Invite — Aura</title>
</head>
<body style="margin: 0; padding: 0; background-color: #13141f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #13141f; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 48px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #1c1d2e; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">

          <!-- Accent gradient bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #6366f1, #818cf8, #a78bfa);"></td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 36px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #818cf8); border-radius: 10px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; line-height: 40px;">A</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 22px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.5px;">Aura</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <div style="height: 1px; background: rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding: 28px 40px 0;">
              <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #f1f5f9; line-height: 1.3;">
                You're invited to collaborate
              </h1>
              <p style="margin: 0; font-size: 15px; color: #94a3b8; line-height: 1.7;">
                ${inviterLine}
              </p>
            </td>
          </tr>

          <!-- Project card -->
          <tr>
            <td style="padding: 20px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600;">Project</p>
                          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #e2e8f0;">${safeProjectName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color: rgba(99,102,241,0.15); border-radius: 20px; padding: 4px 14px;">
                                <span style="font-size: 12px; font-weight: 600; color: #818cf8; text-transform: capitalize;">${roleLabel}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding: 28px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #6366f1, #7c3aed);">
                    <a href="${safeInviteUrl}" target="_blank" style="display: block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; text-align: center; letter-spacing: 0.2px;">
                      Accept Invite
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding: 20px 40px 0;">
              <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; text-align: center; word-break: break-all;">
                <a href="${safeInviteUrl}" style="color: #818cf8; text-decoration: none;">${safeInviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px;">
              <div style="height: 1px; background: rgba(255,255,255,0.06); margin-bottom: 20px;"></div>
              <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5; text-align: center;">
                This invite was sent from <strong style="color: #64748b;">Aura</strong> — the AI&#8209;powered code editor.<br />
                If you weren't expecting this, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, projectName, role, inviterName, token } =
      await request.json();

    if (!email || !projectName || !token || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const inviteUrl = `${request.nextUrl.origin}/invite/${token}`;

    const { error } = await resend.emails.send({
      from: "Aura <noreply@aura.azuritek.com>",
      to: email,
      subject: `You've been invited to collaborate on ${projectName.replace(/[<>"]/g, "")}`,
      html: buildEmailHtml({ inviterName, projectName, role, inviteUrl }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 },
    );
  }
}
