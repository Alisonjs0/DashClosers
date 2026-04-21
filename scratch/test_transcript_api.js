const http = require('http');

const testUrl = 'https://docs.google.com/document/d/1liZplvOvXPAZMd1NNUOJx0riYTkrXTkosDvjzVEXBfA/edit?usp=drivesdk';
const encodedUrl = encodeURIComponent(testUrl);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/transcript?url=${encodedUrl}`,
    method: 'GET',
};

const req = http.request(options, (res) => {
    let body = '';
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log('BODY LENGTH:', body.length);
        if (res.statusCode !== 200) {
            console.log('BODY:', body);
        } else {
            console.log('FIRST 100 CHARS:', body.substring(0, 100));
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
