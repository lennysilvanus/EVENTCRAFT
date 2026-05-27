import QRCode from "qrcode";

export async function generateQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 400,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}

export async function generateQRCodeSVG(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    width: 256,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

export function getCheckinUrl(guestQrToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/checkin/${guestQrToken}`;
}

export function getInviteUrl(inviteToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/invite/${inviteToken}`;
}
