
globalThis.fetch = async (address) => {
  const url = new URL(address);
  if(!['nuaborges.com.br','admin.nuaborges.com.br','admingeral.pages.dev'].includes(url.hostname) && !url.hostname.startsWith('e123.')) {
    throw new Error('Unexpected HTTP target');
  }
  const status = process.env.DEPLOY_SMOKE_BAD === url.hostname ? 403 : 200;
  return {ok: status === 200, status, url: url.href};
};
