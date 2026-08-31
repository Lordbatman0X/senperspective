const fs = require('fs');
let content = fs.readFileSync('src/lib/mongodb.ts', 'utf-8');

const additionalProviders = `
export class GithubAuthProvider {
  public addScope(_scope: string) {}
}
export class FacebookAuthProvider {
  public addScope(_scope: string) {}
}
export class OAuthProvider {
  constructor(public providerId: string) {}
  public addScope(_scope: string) {}
}
`;

if (!content.includes('GithubAuthProvider')) {
  content = content.replace('export class GoogleAuthProvider', additionalProviders + 'export class GoogleAuthProvider');
  fs.writeFileSync('src/lib/mongodb.ts', content, 'utf-8');
  console.log('Added missing providers');
} else {
  console.log('Already added');
}
