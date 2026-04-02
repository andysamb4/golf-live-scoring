const https = require('https');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const modelsToTest = [
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-haiku-20240307',
  'claude-3-sonnet-20240229'
];

async function testModel(model) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }]
    });

    const req = https.request('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ model, status: res.statusCode, body }));
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  for (const model of modelsToTest) {
    const res = await testModel(model);
    console.log(`Model: ${model} -> Status: ${res.status}`);
  }
}
run();
