import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (env.dnsServers) {
    dns.setServers(env.dnsServers);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
}
