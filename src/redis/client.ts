import {Client} from 'redis-om';

let client = new Client();
// await client.open('redis://localhost:6390');

export default client;
