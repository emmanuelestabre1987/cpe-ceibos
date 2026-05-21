// @deno-types="npm:@types/node-forge@1.3.10"
import forge from "npm:node-forge@1.3.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const WSAA_URL  = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms";
const WSCPE_URL = "https://cpea-ws-qaext.afip.gob.ar/wscpe/services/soap";
const WSCPE_NS  = "https://serviciosjava.afip.gob.ar/wscpe/";

const SUPABASE_URL      = "https://tndcfnjsrqhbczvmdlck.supabase.co";
const SUPABASE_SRV_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ── Token cache persistente en Supabase DB ────────────────────────────────────

async function dbGetToken(): Promise<{ token: string; sign: string } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/wsaa_token_cache?service=eq.wscpe&select=token,sign,expires_at`,
      { headers: { apikey: SUPABASE_SRV_KEY, Authorization: `Bearer ${SUPABASE_SRV_KEY}` } }
    );
    const rows = await res.json() as { token: string; sign: string; expires_at: string }[];
    if (!rows.length) return null;
    const row = rows[0];
    if (new Date(row.expires_at) <= new Date()) return null;
    return { token: row.token, sign: row.sign };
  } catch {
    return null;
  }
}

async function dbSaveToken(token: string, sign: string): Promise<void> {
  const expires_at = new Date(Date.now() + 9 * 60 * 1000).toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/wsaa_token_cache`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SRV_KEY,
      Authorization: `Bearer ${SUPABASE_SRV_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ service: "wscpe", token, sign, expires_at }),
  });
}

// ── WSAA ──────────────────────────────────────────────────────────────────────

function buildTRA(service: string): string {
  const now = new Date();
  const gen = new Date(now.getTime() - 600_000).toISOString().replace(/\.\d+Z$/, "Z");
  const exp = new Date(now.getTime() + 600_000).toISOString().replace(/\.\d+Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId>
    <generationTime>${gen}</generationTime>
    <expirationTime>${exp}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

function signCMS(tra: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const key  = forge.pki.privateKeyFromPem(keyPem);
  const p7   = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({ key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [] });
  p7.sign({ detached: false });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

async function wsaaGetToken(certPem: string, keyPem: string): Promise<{ token: string; sign: string }> {
  // 1. Intentar desde la DB
  const cached = await dbGetToken();
  if (cached) return cached;

  // 2. Pedir token nuevo a WSAA
  const tra = buildTRA("wscpe");
  const cms = signCMS(tra, certPem, keyPem);

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <loginCms xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov">
      <in0>${cms}</in0>
    </loginCms>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  const res  = await fetch(WSAA_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=UTF-8", SOAPAction: '""' },
    body: envelope,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WSAA HTTP ${res.status}: ${text}`);

  const rawInner = text.match(/<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/)?.[1];
  const inner = rawInner
    ? rawInner.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    : text;

  const token = inner.match(/<token>([\s\S]*?)<\/token>/)?.[1];
  const sign  = inner.match(/<sign>([\s\S]*?)<\/sign>/)?.[1];
  if (!token || !sign) throw new Error(`WSAA parse error: ${text}`);

  // 3. Guardar en DB para próximas invocaciones
  await dbSaveToken(token, sign);
  return { token, sign };
}

// ── wscpe SOAP ────────────────────────────────────────────────────────────────

async function wscpeSoap(method: string, innerXml: string): Promise<{ xml: string; sentEnvelope: string }> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ser="${WSCPE_NS}">
  <soapenv:Body>
    <ser:${method}>${innerXml}</ser:${method}>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(WSCPE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      SOAPAction: `"${WSCPE_NS}${method}"`,
    },
    body: envelope,
  });

  return { xml: await res.text(), sentEnvelope: envelope };
}

function authXml(token: string, sign: string, cuit: number): string {
  return `<auth>
      <token>${token}</token>
      <sign>${sign}</sign>
      <cuitRepresentada>${cuit}</cuitRepresentada>
    </auth>`;
}

const xmlVal = (xml: string, tag: string): string =>
  xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? "";

function omitNullXml(entries: [string, unknown][]): string {
  return entries
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("\n      ");
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  const certPem = Deno.env.get("WSCPE_CERT")?.replace(/\|/g, "\n");
  const keyPem  = Deno.env.get("WSCPE_KEY")?.replace(/\|/g, "\n");
  if (!certPem || !keyPem)
    return jsonRes({ error: "Missing WSCPE_CERT or WSCPE_KEY secrets" }, 500);

  // deno-lint-ignore no-explicit-any
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: "Invalid JSON body" }, 400);
  }

  const cuit    = Number(body.cuitRepresentada ?? 30715660802);
  const sucursal = Number(body.sucursal ?? 1);
  const tipoCPE  = Number(body.tipoCPE ?? 74);
  const sol      = body.solicitud ?? {};

  try {
    // 1. Token WSAA (desde DB o nuevo)
    const { token, sign } = await wsaaGetToken(certPem, keyPem);

    // 2. consultarUltNroOrden → nroOrden
    const { xml: ultXml, sentEnvelope: ultSent } = await wscpeSoap(
      "ConsultarUltNroOrdenReq",
      `${authXml(token, sign, cuit)}
    <solicitud>
      <sucursal>${sucursal}</sucursal>
      <tipoCPE>${tipoCPE}</tipoCPE>
    </solicitud>`
    );

    const nroOrdenStr = xmlVal(ultXml, "nroOrden");
    if (!nroOrdenStr) {
      console.log("=== REQUEST XML ===");
      console.log(ultSent);
      console.log("=== RESPONSE XML ===");
      console.log(ultXml);
      return jsonRes({
        ok: false,
        error: "consultarUltNroOrden: nroOrden no encontrado en la respuesta",
        request_xml: ultSent,
        response_xml: ultXml,
      }, 500);
    }
    const nroOrden = parseInt(nroOrdenStr) + 1;

    // 3. autorizarCPEAutomotor
    const intervinientesXml = omitNullXml([
      ["cuitRemitenteComercialVentaPrimaria",    sol.cuit_rte_venta_primaria],
      ["cuitRemitenteComercialVentaSecundaria",  sol.cuit_rte_venta_secundaria],
      ["cuitRemitenteComercialVentaSecundaria2", sol.cuit_rte_venta_secundaria2],
      ["cuitCorredorVentaPrimaria",              sol.cuit_corredor_primario],
      ["cuitCorredorVentaSecundaria",            sol.cuit_corredor_secundario],
      ["cuitRepresentanteEntregador",            sol.cuit_repr_entregador],
      ["cuitRepresentanteRecibidor",             sol.cuit_repr_recibidor],
    ]);

    const transporteXml = omitNullXml([
      ["cuitTransportista",      sol.cuit_transporte],
      ["dominio",                Array.isArray(sol.dominio) ? sol.dominio.join("-") : sol.dominio],
      ["fechaHoraPartida",       sol.fecha_partida],
      ["kmRecorrer",             sol.km],
      ["cuitChofer",             sol.cuil_chofer],
      ["tarifa",                 sol.tarifa],
      ["cuitPagadorFlete",       sol.cuit_pagador_flete],
      ["cuitIntermediarioFlete", sol.cuit_intermediario],
      ["mercaderiaFumigada",     "false"],
    ]);

    const { xml: authResXml, sentEnvelope: authSent } = await wscpeSoap(
      "AutorizarAutomotorReq",
      `${authXml(token, sign, cuit)}
    <solicitud>
      <cabecera>
        <tipoCP>${tipoCPE}</tipoCP>
        <cuitSolicitante>${cuit}</cuitSolicitante>
        <sucursal>${sucursal}</sucursal>
        <nroOrden>${nroOrden}</nroOrden>
      </cabecera>
      <origen>
        <productor>
          <codProvincia>${sol.cod_provincia_origen}</codProvincia>
          <codLocalidad>0</codLocalidad>
          <nroRenspa>${sol.renspa}</nroRenspa>
        </productor>
      </origen>
      <correspondeRetiroProductor>false</correspondeRetiroProductor>
      <esSolicitanteCampo>${sol.es_campo_origen ?? false}</esSolicitanteCampo>
      ${intervinientesXml ? `<intervinientes>${intervinientesXml}</intervinientes>` : ""}
      <datosCarga>
        <codGrano>${sol.cod_grano}</codGrano>
        <cosecha>${sol.cosecha}</cosecha>
        <pesoBruto>${sol.peso_bruto}</pesoBruto>
        <pesoTara>${sol.peso_tara}</pesoTara>
      </datosCarga>
      <destino>
        <cuit>${sol.cuit_destino}</cuit>
        <esDestinoCampo>${sol.es_campo_destino ?? false}</esDestinoCampo>
        <codProvincia>${sol.cod_provincia_destino}</codProvincia>
        <codLocalidad>0</codLocalidad>
        <planta>${sol.nro_planta ?? 0}</planta>
      </destino>
      <destinatario>
        <cuit>${sol.cuit_destinatario}</cuit>
      </destinatario>
      <transporte>${transporteXml}</transporte>
      ${sol.observaciones ? `<observaciones>${sol.observaciones}</observaciones>` : ""}
    </solicitud>`
    );

    const nroCTG = xmlVal(authResXml, "nroCTG");
    if (!nroCTG) {
      console.log("=== REQUEST XML (AutorizarAutomotorReq) ===");
      console.log(authSent);
      console.log("=== RESPONSE XML (AutorizarAutomotorReq) ===");
      console.log(authResXml);
      return jsonRes({
        ok: false,
        error: "AutorizarAutomotorReq: nroCTG no encontrado en la respuesta",
        request_xml: authSent,
        response_xml: authResXml,
      }, 500);
    }

    return jsonRes({
      ok: true,
      nroCTG,
      nroOrden,
      fechaEmision:     xmlVal(authResXml, "fechaEmision"),
      fechaVencimiento: xmlVal(authResXml, "fechaVencimiento"),
      token,
      sign,
    });
  } catch (err) {
    return jsonRes({ ok: false, error: String(err) }, 500);
  }
});
