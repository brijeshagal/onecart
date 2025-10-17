import { UserAddress } from '@/types/address';
import { User as IUser } from '@/types/user';
import mongoose, { Schema } from 'mongoose';

// Create Address sub-schema
const AddressSchema = new Schema<UserAddress>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true, maxlength: 60 },
    floor: { type: String, required: true },
    landmark: { type: String, required: true },
    phone: { type: String, required: true },
    save_as: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    is_default: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    _id: true,
  }
);

// Create User schema
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      sparse: true, // Allow multiple null values but unique when present
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    addresses: [AddressSchema],
    defaultAddressIndex: {
      type: Number,
      default: -1,
    },
    receiveAddressIndex: {
      type: Number,
      default: -1,
    },
    askBeforeReceiving: {
      type: Boolean,
      default: true,
    },
    walletAddresses: [
      {
        type: String,
        required: true,
      },
    ],
    farcasterWalletAddress: {
      type: Number,
      default: -1,
    },
    primaryWalletIndex: {
      type: Number,
      default: -1,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Create indexes for better performance
UserSchema.index({ phone: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });

// Create and export User model
export const UserModel = mongoose.model<IUser>('User', UserSchema);

// In-memory fallback for development/testing when MongoDB is not available
class FallbackUserModel {
  private users: Map<string, any> = new Map();
  private nextId = 1;

  async create(userData: any): Promise<any> {
    const id = this.nextId.toString();
    this.nextId++;

    const user = {
      _id: id,
      id,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(id, user);
    return user;
  }

  async findById(id: string): Promise<any> {
    return this.users.get(id) || null;
  }

  async findOne(conditions: any): Promise<any> {
    for (const user of this.users.values()) {
      if (this.matchesConditions(user, conditions)) {
        return user;
      }
    }
    return null;
  }

  async findByUsername(username: string): Promise<any> {
    return this.findOne({ username });
  }

  async findByPhone(phone: string): Promise<any> {
    return this.findOne({ phone });
  }

  async updateOne(filter: any, update: any): Promise<any> {
    const user = await this.findOne(filter);
    if (!user) return null;

    const updatedUser = { ...user, ...update, updatedAt: new Date() };
    this.users.set(user._id, updatedUser);
    return updatedUser;
  }

  async deleteOne(conditions: any): Promise<boolean> {
    const user = await this.findOne(conditions);
    if (!user) return false;

    this.users.delete(user._id);
    return true;
  }

  private matchesConditions(obj: any, conditions: any): boolean {
    for (const key in conditions) {
      if (obj[key] !== conditions[key]) {
        return false;
      }
    }
    return true;
  }
}

// Use MongoDB model if connected, otherwise use fallback
export const userModel =
  mongoose.connection.readyState === 1
    ? UserModel
    : (new FallbackUserModel() as any);
