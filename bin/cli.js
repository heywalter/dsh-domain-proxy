#!/usr/bin/env node
import { diagnose } from '../src/doctor.js';
import { normalizeConfig } from '../src/config.js';
const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: dsh-domain-proxy doctor --domain api.example.com --proxy http://127.0.0.1:7890\nRead-only HTTPS transport check. No model call or credentials; does not verify DSH activation.');
} else {
  try {
    if (args.shift() !== 'doctor') throw new Error('Use the doctor command.');
    const input = {};
    while (args.length) {
      const flag=args.shift(), value=args.shift();
      if (!value || !['--domain','--proxy'].includes(flag)) throw new Error('Expected --domain HOST and --proxy URL.');
      if (flag === '--domain') input.domains=[value]; else input.proxyUrl=value;
    }
    const report = await diagnose(normalizeConfig(input));
    console.log(JSON.stringify(report,null,2));
    process.exitCode = report.transport === 'reachable' ? 0 : 1;
  } catch { console.error('Invalid configuration. Run --help; use a hostname and a local HTTP(S) proxy without credentials.'); process.exitCode=2; }
}
