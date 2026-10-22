// Vendor errors can include request data. Never return configured keys to a browser.
export function privateJson(value,secrets=Object.entries(process.env).filter(([name,v])=>/API_KEY|TOKEN|SECRET/.test(name)&&v?.length>=16).map(([,v])=>v)){
 let output=JSON.stringify(value);
 for(const secret of secrets)if(secret)output=output.split(JSON.stringify(secret).slice(1,-1)).join('[密钥已隐藏]');
 return output.replace(/\bsk-[A-Za-z0-9._-]{20,}/g,'[密钥已隐藏]');
}
