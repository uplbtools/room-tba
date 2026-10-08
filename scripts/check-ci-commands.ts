import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const { scripts = {} } = JSON.parse(readFileSync('package.json', 'utf8'));
const commands = [...workflow.matchAll(/\bbun run ([\w:./-]+)/g)]
	.map(([, command]) => command)
	.filter((command) => !command.includes('/'));
const missing = [...new Set(commands)].filter((command) => !(command in scripts));

if (missing.length > 0) {
	console.error(`Missing package scripts used by CI: ${missing.join(', ')}`);
	process.exit(1);
}

console.log(`CI command coverage OK (${new Set(commands).size} package scripts)`);
