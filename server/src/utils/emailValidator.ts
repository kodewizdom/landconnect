import dns from "dns";
import disposableDomains from "disposable-email-domains";
import wildcardDisposableDomains from "disposable-email-domains/wildcard.json";

const BLOCKLIST_SET = new Set<string>([
  ...(Array.isArray(disposableDomains) ? disposableDomains : []),
  ...(Array.isArray(wildcardDisposableDomains) ? wildcardDisposableDomains : []),
].map((d) => String(d).toLowerCase().trim()));

const HEURISTIC_SUBSTRINGS = [
  "tempmail",
  "temp-mail",
  "10min",
  "yopmail",
  "guerrilla",
  "mailinator",
  "throwaway",
  "trashmail",
  "fakeinbox",
  "burner",
  "dispostable",
];

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DISPOSABLE_ERROR_MESSAGE =
  "Please use a genuine personal or work email address. Temporary or disposable emails are not allowed.";

function createBadRequestError(message: string): Error {
  const err = new Error(message);
  (err as unknown as { statusCode: number }).statusCode = 400;
  return err;
}

/**
 * Checks exact domain and parent domain labels against disposable domain blocklists.
 */
function isDisposableDomain(domain: string): boolean {
  const parts = domain.split(".");
  for (let i = 0; i <= parts.length - 2; i++) {
    const candidate = parts.slice(i).join(".");
    if (BLOCKLIST_SET.has(candidate)) {
      return true;
    }
  }

  return HEURISTIC_SUBSTRINGS.some((needle) => domain.includes(needle));
}

/**
 * Resolves live DNS MX records with a bounded timeout so dead/fake domains are rejected cleanly.
 */
async function resolveMxWithTimeout(domain: string, timeoutMs = 5000): Promise<dns.MxRecord[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("DNS MX lookup timeout"));
    }, timeoutMs);

    dns.promises
      .resolveMx(domain)
      .then((records) => {
        clearTimeout(timer);
        resolve(records);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Validates syntax, normalizes to lowercase, blocks disposable/temp domains,
 * and checks live DNS MX records for real mail servers.
 */
export async function validateGenuineEmail(rawEmail: string): Promise<string> {
  const normalized = String(rawEmail || "").trim().toLowerCase();

  if (!BASIC_EMAIL_REGEX.test(normalized)) {
    throw createBadRequestError("Please enter a valid email address.");
  }

  const atIndex = normalized.lastIndexOf("@");
  const domain = normalized.slice(atIndex + 1);

  if (!domain || isDisposableDomain(domain)) {
    throw createBadRequestError(DISPOSABLE_ERROR_MESSAGE);
  }

  try {
    const mxRecords = await resolveMxWithTimeout(domain, 5000);
    const hasValidMx = Array.isArray(mxRecords) && mxRecords.some((r) => Boolean(r.exchange));
    if (!hasValidMx) {
      throw createBadRequestError(DISPOSABLE_ERROR_MESSAGE);
    }
  } catch (err: any) {
    // Reject ENODATA, ENOTFOUND, or non-existent mail domains; allow transient timeout only if needed,
    // or strictly reject fake domains with no MX servers.
    const code = err?.code;
    if (err?.statusCode === 400 || code === "ENODATA" || code === "ENOTFOUND" || code === "ENOTIMP" || code === "EREFUSED") {
      throw createBadRequestError(DISPOSABLE_ERROR_MESSAGE);
    }
    // If DNS lookup errored cleanly on non-existent domain
    throw createBadRequestError(DISPOSABLE_ERROR_MESSAGE);
  }

  return normalized;
}
