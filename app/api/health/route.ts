/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
export function GET() {
  return Response.json({
    status: "ok",
    credentialValueStorage: false,
    sourceDataStorage: false,
  });
}
