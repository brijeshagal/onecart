import mongoose, { Schema } from 'mongoose';
import { AddressData } from '../types/address';
import { User as IUser } from '../types/user';

// Create Address sub-schema
const AddressSchema = new Schema<AddressData>(
  {
    name: { type: String, required: true },
    address_details_info: { type: Object, required: true },
    address_meta: { type: Object, required: true },
    location: { type: Object, required: true },
    coordinates: { type: Object, required: true },
    corrected_location_info: { type: Object, required: true },
    location_info: { type: Object, required: true },
    display_address: { type: String, required: true },
    landmark: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    use_corrected_location: { type: Boolean, required: true },
    install_ts: { type: String, required: true },
    update_ts: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, required: true },
    ui_data: { type: Object, required: false },
    label: { type: String, required: true },
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
    // Cart references for multi-user cart system
    activeCartIds: [{
      type: String,
      default: [],
    }],
    previousOrders: [{
      type: String,
      default: [],
    }],
    receiveOrders: [{
      type: String,
      default: [],
    }],
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Lazy model creation - only create when Mongoose is connected
let UserModel: mongoose.Model<IUser> | null = null;

export function getUserModel(): mongoose.Model<IUser> {
  if (!UserModel) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected. Cannot create User model.');
    }
    UserModel = mongoose.model<IUser>('User', UserSchema);
  }
  return UserModel;
}

// For backward compatibility, export a model that will work with both connected and fallback scenarios
export const userModel = {
  create: async (data: any) => {
    try {
      const Model = getUserModel();
      return await Model.create(data);
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      throw error;
    }
  },
  findById: async (id: string): Promise<IUser | null> => {
    try {
      // Validate if the ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('❌ Invalid ObjectId format:', id);
        return null;
      }
      
      const Model = getUserModel();
      return await Model.findById(new mongoose.Types.ObjectId(id));
    } catch (error) {
      console.error('❌ Failed to find user by ID:', error);
      return null;
    }
  },
  findOne: async (conditions: any) => {
    try {
      // If conditions contains _id as string, validate and convert to ObjectId
      if (conditions._id && typeof conditions._id === 'string') {
        if (!mongoose.Types.ObjectId.isValid(conditions._id)) {
          console.error('❌ Invalid ObjectId format in conditions:', conditions._id);
          return null;
        }
        conditions._id = new mongoose.Types.ObjectId(conditions._id);
      }
      
      const Model = getUserModel();
      return await Model.findOne(conditions);
    } catch (error) {
      console.error('❌ Failed to find user:', error);
      return null;
    }
  },
  updateOne: async (filter: any, update: any) => {
    try {
      // If filter contains _id as string, validate and convert to ObjectId
      if (filter._id && typeof filter._id === 'string') {
        if (!mongoose.Types.ObjectId.isValid(filter._id)) {
          console.error('❌ Invalid ObjectId format in filter:', filter._id);
          throw new Error('Invalid ObjectId format');
        }
        filter._id = new mongoose.Types.ObjectId(filter._id);
      }
      
      const Model = getUserModel();
      return await Model.updateOne(filter, update);
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      throw error;
    }
  },
  deleteOne: async (conditions: any) => {
    try {
      // If conditions contains _id as string, validate and convert to ObjectId
      if (conditions._id && typeof conditions._id === 'string') {
        if (!mongoose.Types.ObjectId.isValid(conditions._id)) {
          console.error('❌ Invalid ObjectId format in conditions:', conditions._id);
          throw new Error('Invalid ObjectId format');
        }
        conditions._id = new mongoose.Types.ObjectId(conditions._id);
      }
      
      const Model = getUserModel();
      return await Model.deleteOne(conditions);
    } catch (error) {
      console.error('❌ Failed to delete user:', error);
      throw error;
    }
  },
  findByUsername: async (username: string) => {
    try {
      const Model = getUserModel();
      return await Model.findOne({ username });
    } catch (error) {
      console.error('❌ Failed to find user by username:', error);
      return null;
    }
  },
  findByPhone: async (phone: string) => {
    try {
      const Model = getUserModel();
      return await Model.findOne({ phone });
    } catch (error) {
      console.error('❌ Failed to find user by phone:', error);
      return null;
    }
  },
} as any;
