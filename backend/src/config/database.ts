import mongoose from 'mongoose';
import { env } from './env';

export class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('🔗 MongoDB already connected');
      return;
    }

    try {
      // Log connection attempt (hide credentials)
      console.log(`🔗 Connecting to MongoDB`);

      await mongoose.connect(env.MONGODB_URI);

      this.isConnected = true;
      console.log('✅ MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', error => {
        console.error('❌ MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      this.isConnected = false;
      // Don't throw error, allow fallback to in-memory storage
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 MongoDB disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get mongoose connection instance
   */
  public getConnection() {
    return mongoose.connection;
  }

  /**
   * Get the connection state
   */
  public getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return (
      states[mongoose.connection.readyState as keyof typeof states] || 'unknown'
    );
  }
}

// Export singleton instance
export const database = Database.getInstance();
