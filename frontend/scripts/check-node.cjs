const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error('');
  console.error(`  ✗ Node ${process.version} is too old.`);
  console.error('  ✗ This project requires Node 20+.');
  console.error('');
  console.error('  Fix:  source ~/.nvm/nvm.sh && nvm use   # picks up .nvmrc');
  console.error('');
  process.exit(1);
}
