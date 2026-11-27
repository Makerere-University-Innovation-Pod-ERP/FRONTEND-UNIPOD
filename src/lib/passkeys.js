function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64Url(value) {
  const bytes = new Uint8Array(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function prepareOptions(options) {
  if (!options?.publicKey) throw new Error('The backend returned invalid passkey options.');
  const publicKey = { ...options.publicKey, challenge: decodeBase64Url(options.publicKey.challenge) };
  if (publicKey.user) {
    publicKey.user = { ...publicKey.user, id: decodeBase64Url(publicKey.user.id) };
  }
  for (const field of ['allowCredentials', 'excludeCredentials']) {
    if (publicKey[field]) {
      publicKey[field] = publicKey[field].map((credential) => ({
        ...credential,
        id: decodeBase64Url(credential.id),
      }));
    }
  }
  return { ...options, publicKey };
}

function serializeCredential(credential) {
  if (!credential) throw new Error('The passkey request was cancelled.');
  const response = {
    clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
  };
  if ('attestationObject' in credential.response) {
    response.attestationObject = encodeBase64Url(credential.response.attestationObject);
    if (typeof credential.response.getTransports === 'function') {
      response.transports = credential.response.getTransports();
    }
  } else {
    response.authenticatorData = encodeBase64Url(credential.response.authenticatorData);
    response.signature = encodeBase64Url(credential.response.signature);
    response.userHandle = credential.response.userHandle
      ? encodeBase64Url(credential.response.userHandle)
      : null;
  }

  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response,
  };
}

function assertPasskeySupport() {
  if (
    typeof window === 'undefined'
    || !window.isSecureContext
    || !window.PublicKeyCredential
    || !navigator.credentials
  ) {
    throw new Error('Passkeys require a supported browser and a secure connection. Use your password to sign in.');
  }
}

function userFacingError(error, action) {
  if (error?.name === 'NotAllowedError') {
    return new Error(`The passkey ${action} was cancelled or timed out.`);
  }
  return error;
}

export async function createPasskeyCredential(options) {
  assertPasskeySupport();
  try {
    return serializeCredential(await navigator.credentials.create(prepareOptions(options)));
  } catch (error) {
    throw userFacingError(error, 'setup');
  }
}

export async function getPasskeyAssertion(options) {
  assertPasskeySupport();
  try {
    return serializeCredential(await navigator.credentials.get(prepareOptions(options)));
  } catch (error) {
    throw userFacingError(error, 'sign-in');
  }
}
