export const LOGIN_URL =
  "https://api-v2-6-0.eapp.vidyamandir.com/mysa/connectorg/organizations/1/login";

export const STUDENT_WEB_URL = "https://studentweb.vidyamandir.com/learn";

const COGNITO_POOL = "ap-south-1:f8400cd8-91ae-4054-b187-33a0744e64dd";
const AMPLIFY_APP_ID = "37f56b77a1294ff3b241db019ba8e958";

export interface UserData {
  accessToken?: string;
  refreshToken?: string;
  id?: string;
  userId?: string;
  name?: string;
  rollNumber?: string;
  cognitoIdentityId?: string;
  [key: string]: unknown;
}

export type Session = Record<string, string | null>;

export function buildSession(userData: UserData, deviceId: string): Session {
  const userId = userData.id ?? userData.userId ?? null;

  const session: Session = {
    accessToken: userData.accessToken ?? null,
    refreshToken: userData.refreshToken ?? "",
    userId: userId === null ? null : String(userId),
    name: userData.name ?? "",
    deviceId,
    domainId: "e_3",
    organizationId: "1",
    appFlavour: "VMCProd",
    isUserLoggedIn: "true",
    "aws-amplify-cacheCurSize": "239",
    errorLogs: "[]",
    networkErrorLogs: "[]",
  };

  if (userData.cognitoIdentityId !== undefined) {
    session[`CognitoIdentityId-${COGNITO_POOL}`] = String(userData.cognitoIdentityId);
  }

  const cacheKey = `aws-amplify-cacheAWSPinpoint_${AMPLIFY_APP_ID}`;
  const now = Date.now();
  session[cacheKey] = JSON.stringify({
    key: cacheKey,
    data: crypto.randomUUID(),
    timestamp: now,
    visitedTime: now,
    priority: 1,
    expires: now + 3153600000000,
    type: "string",
    byteSize: 239,
  });

  session["persist:viewer"] = JSON.stringify({
    toolbarGroup: '"toolbarGroup-Annotate"',
    lastPickedToolForGroup: '{"":"Pan"}',
    lastPickedToolGroup: "{}",
    _persist: '{"version":-1,"rehydrated":true}',
  });

  return session;
}

export function generateInjector(session: Session): string {
  const lines = [
    "// VMC session injector. Paste into the browser console and press Enter.",
    "localStorage.clear();",
  ];

  for (const [key, value] of Object.entries(session)) {
    if (value === null) continue;
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
    lines.push(`localStorage.setItem('${key}', '${escaped}');`);
  }

  lines.push(
    `window.location.href = '${STUDENT_WEB_URL}';`,
    "console.log('VMC session injected.');"
  );

  return lines.join("\n");
}
